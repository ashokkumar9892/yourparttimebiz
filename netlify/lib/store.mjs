// The daily limits, kept in Netlify Blobs, and saving of submissions and
// messages to the database. Outside Netlify (npm run dev) there are no blobs,
// so those fall back to memory that lasts until the process stops.

import crypto from "node:crypto";
import { getStore } from "@netlify/blobs";

const memory = new Map();

async function read(name, key) {
  try {
    return await getStore(name).get(key, { type: "json" });
  } catch {
    return memory.get(`${name}/${key}`) ?? null;
  }
}

async function write(name, key, value) {
  try {
    await getStore(name).setJSON(key, value);
  } catch {
    memory.set(`${name}/${key}`, value);
  }
}

const hash = (value) => crypto.createHash("sha256").update(String(value).toLowerCase()).digest("hex").slice(0, 32);
const limit = (name, fallback) => Number(process.env[name]) || fallback;

/**
 * Counts one use against today's limits. Returns null when it is allowed, or a
 * message for the visitor when a limit has been reached. Emails and IP
 * addresses are stored only as hashes.
 */
export async function takeTurn(kind, { email, ip }) {
  const day = new Date().toISOString().slice(0, 10);
  const checks = [
    [`${day}/${kind}/email/${hash(email)}`, limit("LIMIT_PER_EMAIL", 3), "You've reached today's limit for this email address. Please come back tomorrow."],
    [`${day}/${kind}/ip/${hash(ip)}`, limit("LIMIT_PER_IP", 10), "Too many requests from your connection today. Please come back tomorrow."],
    [`${day}/${kind}/all`, limit("LIMIT_PER_DAY", 300), "We're at capacity for today. Please come back tomorrow."],
  ];
  const counts = await Promise.all(checks.map(([key]) => read("limits", key)));
  for (let i = 0; i < checks.length; i++) if ((counts[i] || 0) >= checks[i][1]) return checks[i][2];
  await Promise.all(checks.map(([key], i) => write("limits", key, (counts[i] || 0) + 1)));
  return null;
}

const API = (process.env.YPTB_API_URL || "https://ceustamps-api.azurewebsites.net/api/yourparttimebiz").replace(/\/$/, "");

/**
 * Saves a record ("submissions" or "contacts") in the Azure SQL database,
 * through the yourparttimebiz section of the shared API. If the API cannot be
 * reached, or YPTB_API_KEY is not set, the record is kept in Netlify Blobs
 * instead so it is not lost.
 */
export async function save(name, record) {
  if (process.env.YPTB_API_KEY) {
    try {
      const res = await fetch(`${API}/${name}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-yptb-key": process.env.YPTB_API_KEY },
        body: JSON.stringify(record),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return;
      console.error(`Database save failed (${res.status}); keeping the record in Blobs.`);
    } catch (err) {
      console.error(`Database save failed (${err.message}); keeping the record in Blobs.`);
    }
  }
  await write(name, `${new Date().toISOString()}-${crypto.randomUUID().slice(0, 8)}`, record);
}
