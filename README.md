# CapKitBOT

A capsule-kitchen chat assistant. Each household signs up once, gets guided
through setup by the bot itself, and then chats with CapKitBOT for meal
suggestions, pantry cooking help, and swaps — built around the food they
actually keep and cook.

This README walks through everything needed to get a working copy running,
from zero. No prior experience with any of these tools is assumed.

## What you're setting up

- **Netlify** — hosts the app itself (the pages, the chat).
- **Supabase** — the database (households, people, chat history) and login system.
- **Anthropic API** — powers CapKitBOT's replies. Separate from any claude.ai subscription — this is pay-as-you-go, billed per message, at a fraction of a cent each at normal usage.

None of these cost anything to set up (all have free tiers that comfortably cover early testing), though the Anthropic API does require adding a payment method before it will send real requests.

## 1. Create the Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Click **New project**. Give it a name (e.g. `capkitbot`), set a database password (save it somewhere), pick a region close to you, and create it. It takes a minute or two to provision.
3. Once it's ready, go to **Project Settings → API**. You'll need three values from this page later:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → this is `SUPABASE_SERVICE_ROLE_KEY` (keep this one secret — never put it in client-side code or commit it)
4. Go to the **SQL Editor** (left sidebar), open a new query, paste in the entire contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) from this repo, and run it. This creates all the tables and locks them down so one household can never see another's data.
5. Go to **Authentication → Providers** and confirm **Email** is enabled (it is by default).
6. For early testing with just yourself: go to **Authentication → Settings** and turn **off** "Confirm email" so you can sign up and start chatting immediately without clicking an email link. Turn it back on before real households sign up.

## 2. Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com) and sign up or log in (this is separate from a claude.ai account, even if you use the same email).
2. Add a payment method under **Billing** — the API won't send requests without one, even though usage cost is tiny at this scale.
3. Go to **API Keys**, create a new key, and copy it immediately (you won't be able to see it again). This is your `ANTHROPIC_API_KEY`.

Estimated cost: at roughly 40–100 messages per household per month, expect well under $2/month per household on the model this app uses (Claude Sonnet 5).

## 3. Run it locally first

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with the four values from steps 1 and 2:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
```

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should land on the login screen. Click through to set up a household, and CapKitBOT should greet you and start onboarding.

Run the test suite (mainly the protein-target calculator, which has calibrated test cases):

```bash
npm test
```

## 4. Deploy to Netlify

1. Push this repo to GitHub if it isn't already.
2. Go to [app.netlify.com](https://app.netlify.com), click **Add new site → Import an existing project**, and connect your GitHub account if you haven't.
3. Pick this repository. Netlify should auto-detect the Next.js build settings from `netlify.toml` — leave them as-is.
4. Before the first deploy, go to **Site configuration → Environment variables** and add the same four variables from step 3 above.
5. Deploy. Netlify will give you a URL like `capkitbot.netlify.app` — that's your live app.

A custom domain can be added later under **Domain management** once you're ready; nothing about the app needs to change to support it.

## How it's built

- **Next.js** (App Router) + **Tailwind** for the app and chat UI.
- **Supabase** for auth (one login per household) and Postgres storage, locked down with row-level security so data never crosses between households.
- **Anthropic's Claude API** (`claude-sonnet-5`, set in `lib/anthropicClient.ts`) generates every reply, called server-side only — the API key never reaches the browser.
- `prompts/base.md` is CapKitBOT's full behavior spec (goals, portioning rules, tone, medical boundaries) — edit this file to change how the bot behaves once a household is set up. `prompts/onboarding.md` governs the guided setup interview before that.
- `lib/targets.ts` computes protein targets from each person's stats — this is the only source of truth for the numbers; the model is instructed to use them, never recompute.
- Onboarding runs as a normal chat conversation, but the structured fields (weight, goal, capsule contents, etc.) are captured via tool calls the server validates and writes to the database (`lib/extract.ts`) — the model conducts the interview, the app owns the data.

## What's not built yet (by design, for v1)

- Real SMS/WhatsApp delivery — this is web-only for now.
- Payments/billing.
- A structured running macro ledger — the bot answers "where do I stand today" from recent chat history, not a tracked total.
- Rate limiting / abuse protection.
- Terms of Service and Privacy Policy are **drafts** (`lib/legalCopy.ts`, at `/legal/terms` and `/legal/privacy`) — have a lawyer review them before any real household (beyond you testing) signs up and shares health-adjacent data.
