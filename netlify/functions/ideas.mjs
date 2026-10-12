// POST /api/ideas: takes the questionnaire, asks the AI for ideas and streams
// the reply to the page as it is written. When the reply is complete it is
// emailed to the person and, with their answers, to the owner.
//
// The response body is plain text. A \u001e character starts a control record:
//   \u001eERROR:<message>   the reply could not be finished
//   \u001eFINAL:<text>      replace what was streamed with this text
//   \u001eEMAILED:          a copy was emailed to the person

import Anthropic from "@anthropic-ai/sdk";
import { questions, MAX_ANSWER } from "../../public/questions.js";
import { escapeHtml, renderMarkdown } from "../../public/md.js";
import { SYSTEM_PROMPT, answersText } from "../lib/prompt.mjs";
import { clean, clientIp, json, readBody, siteUrl, validEmail } from "../lib/http.mjs";
import { ownerAddresses, sendAll } from "../lib/mail.mjs";
import { save, takeTurn } from "../lib/store.mjs";

export const config = { path: "/api/ideas" };

const DISCLAIMER = "These are suggestions only, not legal, tax, or financial advice.";
const TROUBLE = "Something went wrong while writing your ideas. Please try again in a minute.";

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

function resultEmails({ name, email, answers, ideas }) {
  const link = `${siteUrl()}/talk-to-us`;
  const html =
    `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.5;color:#1c2430;max-width:640px">` +
    `<p>Hi ${escapeHtml(name)}, here are the business ideas from your answers at yourparttimebiz.com.</p>` +
    `${renderMarkdown(ideas)}` +
    `<p><a href="${link}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#0f6b5c;color:#ffffff;text-decoration:none;font-weight:600">Talk to us</a></p>` +
    `<p style="font-size:13px;color:#5d6875">${DISCLAIMER}</p></div>`;
  const text = `Hi ${name}, here are the business ideas from your answers at yourparttimebiz.com.\n\n${ideas}\n\nTalk to us: ${link}\n\n${DISCLAIMER}`;
  return [
    { to: [email], subject: "Your part-time business ideas", text, html },
    {
      to: ownerAddresses(),
      replyTo: email,
      subject: `New questionnaire: ${name}`,
      text: `${name} <${email}> filled out the questionnaire.\n\nTHEIR ANSWERS\n\n${answersText(name, answers)}\n\nTHE IDEAS THEY WERE SENT\n\n${ideas}`,
    },
  ];
}

/** The reply's text. After a fallback, only what the model that finished wrote. */
function replyText(message) {
  const blocks = message.content;
  const from = blocks.findLastIndex((block) => block.type === "fallback") + 1;
  return blocks.slice(from).filter((block) => block.type === "text").map((block) => block.text).join("").trim();
}

export default async (req, context) => {
  const { body, error } = await readBody(req);
  if (error) return error;
  if (body.website) return json(400, { error: "Could not read the form. Please try again." });
  const form = readForm(body);
  if (form.problem) return json(400, { error: form.problem });
  if (!process.env.ANTHROPIC_API_KEY) return json(503, { error: "The idea advisor is not set up yet. Please check back soon." });

  const limited = await takeTurn("ideas", { email: form.email, ip: clientIp(req, context) });
  if (limited) return json(429, { error: limited });

  const client = new Anthropic();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (text) => controller.enqueue(encoder.encode(text));
      let streamed = "";
      try {
        // If the model declines a request, "fallbacks" has the API re-run it on
        // another model inside the same call.
        const reply = client.beta.messages.stream({
          model: process.env.IDEAS_MODEL || "claude-opus-5-5",
          max_tokens: 8000,
          output_config: { effort: process.env.IDEAS_EFFORT || "low" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: answersText(form.name, form.answers) }],
        });
        reply.on("text", (delta) => {
          streamed += delta;
          send(delta);
        });
        const message = await reply.finalMessage();
        const ideas = replyText(message);
        if (message.stop_reason === "refusal" || !ideas) {
          send(`\u001eERROR:We couldn't come up with ideas from those answers. Please adjust them and try again.`);
        } else {
          if (ideas !== streamed.trim()) send(`\u001eFINAL:${ideas}`);
          const [, [emailed]] = await Promise.all([
            save("submissions", { ...form, ideas }),
            sendAll(resultEmails({ ...form, ideas })),
          ]);
          if (emailed) send(`\u001eEMAILED:`);
        }
      } catch (err) {
        if (err instanceof Anthropic.RateLimitError) console.error("AI rate limit reached");
        else if (err instanceof Anthropic.APIError) console.error(`AI error ${err.status}: ${err.message}`);
        else console.error(err);
        send(`\u001eERROR:${TROUBLE}`);
      }
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
};
