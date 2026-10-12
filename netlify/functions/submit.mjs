// POST /api/submit: takes the questionnaire, saves it and tells the owner.
//
// Nothing is sent to an AI here. The owner reads the answers in the database,
// prepares the business ideas and emails them to the person.

import { questions, MAX_ANSWER } from "../../public/questions.js";
import { answersText } from "../lib/prompt.mjs";
import { clean, clientIp, json, readBody, validEmail } from "../lib/http.mjs";
import { ownerAddresses, sendAll } from "../lib/mail.mjs";
import { save, takeTurn } from "../lib/store.mjs";

export const config = { path: "/api/submit" };

function readForm(body) {
  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  if (!name) return { problem: "Please enter your name." };
  if (!validEmail(email)) return { problem: "Please enter a valid email address." };
  if (body.consent !== true) return { problem: "Please tick the box to agree to the Terms of Use and Privacy Policy." };
  const answers = {};
  for (const q of questions) {
    const answer = clean(body.answers?.[q.n], MAX_ANSWER);
    if (answer && q.options && !q.options.includes(answer)) return { problem: `Please pick one of the choices for question ${q.n}.` };
    answers[q.n] = answer;
  }
  if (!Object.values(answers).some(Boolean)) return { problem: "Please answer the questions first." };
  return { name, email, answers };
}

export default async (req, context) => {
  const { body, error } = await readBody(req);
  if (error) return error;
  if (body.website) return json(400, { error: "Could not read the form. Please try again." });
  const form = readForm(body);
  if (form.problem) return json(400, { error: form.problem });

  const ip = clientIp(req, context);
  const limited = await takeTurn("submit", { email: form.email, ip });
  if (limited) return json(429, { error: limited });

  await Promise.all([
    // "ideas" stays empty until the owner has written and sent them.
    save("submissions", { ...form, ideas: "", emailed: false, ip }),
    sendAll([
      {
        to: ownerAddresses(),
        replyTo: form.email,
        subject: `New questionnaire: ${form.name}`,
        text: `${form.name} <${form.email}> filled out the questionnaire and is waiting for their ideas.\n\n${answersText(form.name, form.answers)}`,
      },
    ]),
  ]);
  return json(200, { ok: true });
};
