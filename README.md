# yourparttimebiz.com

A free questionnaire that suggests part-time business ideas. A person enters their name and email, answers 16 questions, and gets 3 to 5 ideas on screen in under a minute. The same ideas are emailed to them, and each submission is copied to the owner. Results end with a "Talk to us" button for people who want setup help.

## How it is put together

- **The website** is static pages in `public/`, hosted on Netlify. There is no build step.
- **The backend** is two Netlify Functions in `netlify/functions/`:
  - `POST /api/ideas` checks the form, applies the daily limits, sends the answers to Claude with the AI instructions as the system prompt, and streams the reply to the page. When the reply is complete it emails the person and the owner.
  - `POST /api/contact` is the "Talk to us" form. It emails the owner.
- **Storage** is Netlify Blobs: the daily counts (`limits`), and a copy of every submission (`submissions`) and message (`contacts`) so nothing is lost if an email does not arrive. They can be read in the Netlify dashboard under Blobs.
- **Email** goes through Azure Communication Services, the same way RADS10 sends mail.

## Where things are

| To change | Edit |
| --- | --- |
| The 16 questions | `public/questions.js` (keep the numbering; the AI instructions refer to it) |
| The AI instructions | `netlify/lib/prompt.mjs` |
| Company name, state, contact email, "last updated" date | `site` at the top of `public/site.js` |
| Services menu | `public/talk-to-us.html` |
| Terms of Use, Privacy Policy | `public/terms.html`, `public/privacy.html` |

## Settings

Environment variables on the Netlify site (Site configuration → Environment variables). Redeploy after changing them.

| Setting | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Key for the Claude API. Without it the questionnaire answers "not set up yet". |
| `OWNER_EMAIL` | yes | Comma-separated addresses that receive every submission and "Talk to us" message. |
| `MAIL_ENDPOINT`, `MAIL_KEY`, `MAIL_FROM` | yes | The Azure Communication Service that sends email, and a sender address verified on it. Without all three nothing is emailed; results still show on the page. |
| `IDEAS_MODEL` | no | Claude model. Default `claude-opus-5-5`. |
| `IDEAS_EFFORT` | no | How hard the model thinks: `low` (default), `medium`, `high`. Higher is slower and costs more. |
| `LIMIT_PER_EMAIL`, `LIMIT_PER_IP`, `LIMIT_PER_DAY` | no | Daily limits on submissions. Defaults 3, 10 and 300. |

## Deploy

```
npx netlify-cli deploy --prod
```

Or connect the repository in Netlify; settings come from `netlify.toml`.

## Run locally

```
npm install
npm run dev     # http://localhost:8888
```

Copy `.env.example` to `.env` and fill it in first. Locally, limits and saved submissions are kept in memory.

## Before launch

- Fill in `site` in `public/site.js`. Until then the legal pages show `[Company name]`, `[State]`, `[contact email]` and `[date]`.
- Have a lawyer review the Terms of Use and Privacy Policy. Both are starting drafts.
- Keep the revenue-share deal in its own written agreement.
- Decide whether RADS10 sales count toward a client's revenue share. Excluding them, or counting the commission toward the cap, avoids charging 10% on those sales.
