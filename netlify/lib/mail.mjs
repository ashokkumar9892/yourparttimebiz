// Minimal Azure Communication Services email client, the same approach RADS10
// uses. Sending is switched on by setting MAIL_ENDPOINT, MAIL_KEY and
// MAIL_FROM; without them nothing is sent and the site carries on.

import crypto from "node:crypto";

export const mailEnabled = () =>
  Boolean(process.env.MAIL_ENDPOINT && process.env.MAIL_KEY && process.env.MAIL_FROM);

export const ownerAddresses = () =>
  (process.env.OWNER_EMAIL || "").split(",").map((address) => address.trim()).filter(Boolean);

/** Sends one email to every address in `to`. `html` is optional. */
export async function sendMail({ to, subject, text, html, replyTo }) {
  const url = new URL("/emails:send?api-version=2023-03-31", process.env.MAIL_ENDPOINT);
  const body = JSON.stringify({
    senderAddress: process.env.MAIL_FROM,
    content: { subject, plainText: text, ...(html ? { html } : {}) },
    recipients: { to: to.map((address) => ({ address })) },
    ...(replyTo ? { replyTo: [{ address: replyTo }] } : {}),
  });
  // The service authenticates each request by an HMAC over these three headers.
  const date = new Date().toUTCString();
  const hash = crypto.createHash("sha256").update(body).digest("base64");
  const signature = crypto
    .createHmac("sha256", Buffer.from(process.env.MAIL_KEY, "base64"))
    .update(`POST\n${url.pathname}${url.search}\n${date};${url.host};${hash}`)
    .digest("base64");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ms-date": date,
      "x-ms-content-sha256": hash,
      Authorization: `HMAC-SHA256 SignedHeaders=x-ms-date;host;x-ms-content-sha256&Signature=${signature}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Email was not accepted (${res.status}): ${(await res.text()).slice(0, 300)}`);
}

/**
 * Sends each message that has recipients, logging failures without throwing.
 * Returns, per message, whether it was sent.
 */
export async function sendAll(messages) {
  if (!mailEnabled()) {
    console.log("Mail is not set up; nothing was emailed.");
    return messages.map(() => false);
  }
  return Promise.all(
    messages.map(async (message) => {
      if (!message.to.length) return false;
      try {
        await sendMail(message);
        return true;
      } catch (err) {
        console.error(err.message);
        return false;
      }
    }),
  );
}
