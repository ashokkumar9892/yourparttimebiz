# yourparttimebiz.com

A free questionnaire for people who want a part-time business. A person enters their name and email and answers 16 questions. The answers are saved, the owner is told, and the person sees a message that their ideas will come by email. The owner reads the answers, writes 3 to 5 business ideas and emails them.

The site does not call an AI, so a submission costs nothing. The AI instructions from the build brief are kept in `netlify/lib/prompt.mjs` for preparing ideas by hand, and for switching automatic ideas back on later.

## How it is put together

- **The website** is static pages in `public/`, hosted on Netlify. There is no build step.
- **The backend** is two Netlify Functions in `netlify/functions/`:
  - `POST /api/submit` checks the form, applies the daily limits, saves the answers and emails the owner.
  - `POST /api/contact` is the "Talk to us" form. It saves the message and emails the owner.
- **The data** is in the Azure SQL database `ceustampsdb`, in its own tables: `yptb_submissions` (name, email, the 16 answers as `q1`..`q16`, and `ideas` and `emailed`, which are empty until the ideas have been written and sent) and `yptb_contacts` ("Talk to us" messages). The functions save through the yourparttimebiz section of the shared API at `ceustamps-api.azurewebsites.net`, under `/api/yourparttimebiz/*`; its code lives in the CEU-Website repository (`server/src/yourparttimebiz/`). If the API cannot be reached, the record is kept in Netlify Blobs (`submissions`, `contacts`) instead.
- **The daily counts** are in Netlify Blobs (`limits`).
- **Email** goes through Azure Communication Services, the same way RADS10 sends mail.

## Where things are

| To change | Edit |
| --- | --- |
| The 16 questions | `public/questions.js` (keep the numbering; the AI instructions refer to it) |
| The AI instructions (not used by the site at the moment) | `netlify/lib/prompt.mjs` |
| Company name, state, contact email, "last updated" date | `site` at the top of `public/site.js` |
| Services menu | `public/talk-to-us.html` |
| Terms of Use, Privacy Policy | `public/terms.html`, `public/privacy.html` |

## Settings

Environment variables on the Netlify site (Site configuration → Environment variables). Redeploy after changing them.

| Setting | Required | Purpose |
| --- | --- | --- |
| `YPTB_API_KEY` | yes | The key the shared API expects (`YPTB_KEY` on the `ceustamps-api` Web App). Without it submissions are kept only in Netlify Blobs. |
| `OWNER_EMAIL` | yes | Comma-separated addresses that receive every submission and "Talk to us" message. |
| `MAIL_ENDPOINT`, `MAIL_KEY`, `MAIL_FROM` | yes | The Azure Communication Service that sends email, and a sender address verified on it. Without all three nothing is emailed; submissions are still saved. |
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
