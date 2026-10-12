// Small key-value storage on Netlify Blobs, for the daily limits and a copy of
// each submission. Outside Netlify (npm run dev) there are no blobs, so it
// falls back to memory that lasts until the process stops.

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

/** Keeps a record, so nothing is lost if an email does not arrive. */
export const save = (name, record) =>
  write(name, `${new Date().toISOString()}-${crypto.randomUUID().slice(0, 8)}`, record);
