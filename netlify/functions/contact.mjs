// POST /api/contact: the "Talk to us" form. The message is stored and emailed
// to the owner, who replies to the person directly.

import { clean, clientIp, json, readBody, validEmail } from "../lib/http.mjs";
import { ownerAddresses, sendAll } from "../lib/mail.mjs";
import { save, takeTurn } from "../lib/store.mjs";

export const config = { path: "/api/contact" };

export default async (req, context) => {
  const { body, error } = await readBody(req);
  if (error) return error;
  if (body.website) return json(400, { error: "Could not read the form. Please try again." });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 40);
  const message = clean(body.message, 4000);
  if (!name) return json(400, { error: "Please enter your name." });
  if (!validEmail(email)) return json(400, { error: "Please enter a valid email address." });
  if (!message) return json(400, { error: "Please tell us what you'd like help with." });

  const limited = await takeTurn("contact", { email, ip: clientIp(req, context) });
  if (limited) return json(429, { error: limited });

  await Promise.all([
    save("contacts", { name, email, phone, message }),
    sendAll([
      {
        to: ownerAddresses(),
        replyTo: email,
        subject: `Talk to us: ${name}`,
        text: `${name} <${email}>${phone ? `\nPhone: ${phone}` : ""}\n\n${message}`,
      },
    ]),
  ]);
  return json(200, { ok: true });
};
