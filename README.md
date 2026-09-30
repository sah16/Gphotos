# AI-Native Retrieval MVP — Google Photos Case Study

This repo implements the solution described in `problem_statement.md`,
following the design in `architecture.md`, built in the order set out in
`implementation_plan.md`.

## Docs in this repo

- **`problem_statement.md`** — what is being built: the AI-generated
  attribute-chip retrieval flow, UI placement rules, chip interaction
  logic, scope boundaries, tech stack, and definition of done.
- **`architecture.md`** — how it's built: system diagram, components,
  request-time sequences, folder structure, and data models.
- **`implementation_plan.md`** — the 6-phase build order, with exit
  criteria for each phase.

Read them in that order before making changes.

## Prerequisites

- Node.js 18+
- A [Pexels API key](https://www.pexels.com/api/) (free)
- An [Unsplash Access Key](https://unsplash.com/developers) (free,
  optional — used only as a secondary photo source)
- A [Groq API key](https://console.groq.com/) (free)

## Setup

1. Clone the repo and install dependencies:
   ```
   npm install
   ```
2. Copy the env example and fill in your keys:
   ```
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` and paste in real values for `PEXELS_API_KEY`,
   `UNSPLASH_ACCESS_KEY`, and `GROQ_API_KEY`. This file is git-ignored —
   never commit real keys.

3. Run the offline pipeline once, locally, to build the photo corpus and
   dataset (see `implementation_plan.md` Phases 2-3 for details on what
   each script does):
   ```
   node scripts/seed-photos.js
   node scripts/tag-photos.js
   node scripts/embed-photos.js
   node scripts/build-dataset.js
   ```
   This populates `/public/photos/` and `/data/photos.json`. Commit both
   — the deployed app reads them as static files and does not re-run
   this pipeline at runtime.

4. Run the app locally:
   ```
   npm run dev
   ```
   Open `http://localhost:3000` and test a query.

## Deploying to Vercel

1. Push the repo to GitHub.
2. Import the repo into Vercel (framework preset: Next.js, auto-
   detected).
3. In the Vercel project's Environment Variables settings, add
   `GROQ_API_KEY` (needed at runtime for live query/chip scoring).
   `PEXELS_API_KEY` / `UNSPLASH_ACCESS_KEY` are **not** needed in
   production — they're only used by the local seeding scripts, and
   `/data/photos.json` + `/public/photos` are already committed.
4. Deploy. Vercel gives you a public URL — this is what you hand to test
   users and graders.

## Verifying it works

Before sharing the deployed link, walk through every item in
`problem_statement.md` §7 (Definition of done) on the live URL, on a
phone-sized viewport. `implementation_plan.md` Phase 6 covers this in
detail, including planting a known target photo in the corpus to
confirm the full search → chip → refine → find flow works end to end.

## What this MVP deliberately does not do

See `problem_statement.md` §4 for the full list — most notably, this
does not connect to a real Google Photos account (Google removed the API
scope that would allow this in March 2025) and uses a seeded stock-photo
corpus instead.
