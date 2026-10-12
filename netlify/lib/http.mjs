// Shared request handling for the two functions.

export const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

export const clean = (value, max) => String(value ?? "").replace(/\u001e/g, "").trim().slice(0, max);

export const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 200;

/** Parses a JSON POST body, or returns a Response to send back. */
export async function readBody(req) {
  if (req.method !== "POST") return { error: json(405, { error: "Use POST." }) };
  try {
    const text = await req.text();
    if (text.length > 60_000) return { error: json(413, { error: "That is too long. Please shorten your answers." }) };
    const body = JSON.parse(text);
    if (body && typeof body === "object") return { body };
  } catch {}
  return { error: json(400, { error: "Could not read the form. Please try again." }) };
}

export const clientIp = (req, context) => context?.ip || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";

export const siteUrl = () => (process.env.URL || "https://yourparttimebiz.com").replace(/\/$/, "");
