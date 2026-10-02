# Architecture — AI-Native Retrieval MVP

Companion to `problem_statement.md` (the "what"). This document covers
the "how": components, data flow, folder structure, and deployment.

## 1. System overview

```
                     ┌─────────────────────────┐
                     │   OFFLINE (run once,     │
                     │   before deploy)         │
                     │                          │
                     │  1. Seed photo corpus    │
                     │     (Pixabay/Unsplash)   │
                     │  2. Tag each photo       │
                     │     (Groq vision model)  │
                     │  3. Build embeddings     │
                     │  4. Write photos.json    │
                     └────────────┬─────────────┘
                                  │
                                  ▼
                     ┌─────────────────────────┐
                     │   /data/photos.json      │
                     │   (static data layer)    │
                     └────────────┬─────────────┘
                                  │ read at request time
                                  ▼
┌──────────────┐   HTTP    ┌─────────────────────────┐
│  Next.js      │ ───────▶ │  Next.js API routes      │
│  frontend      │          │  /api/search             │
│  (browser)     │ ◀─────── │  /api/refine             │
└──────────────┘   JSON    └────────────┬─────────────┘
                                  │ live calls
                                  ▼
                     ┌─────────────────────────┐
                     │   Groq API (text model)  │
                     │   query normalization /  │
                     │   chip scoring           │
                     └─────────────────────────┘
```

Everything runs inside one Next.js project, deployed as one Vercel
project. There is no separate backend service and no database server.

## 2. Components

### 2.1 Frontend (`/app` or `/pages`, browser-rendered)
- Home/results screen matching the reference screenshots: header, query
  title, running summary line, chip row, result-count line, photo grid,
  untouched "Related" date-chip row, bottom search/follow-up input.
- State held client-side: current query string, set of selected chip
  labels, current results, current chip list. No server-side session.
- On mount / query submit → calls `POST /api/search`.
- On chip tap / clear → calls `POST /api/refine`.

### 2.2 API layer (Next.js API routes — the "backend")
- `POST /api/search` — see contract in `problem_statement.md` §7.
- `POST /api/refine` — see contract in `problem_statement.md` §7.
- Both routes: load `/data/photos.json` into memory (cached across
  invocations where the runtime allows), score all photos against the
  query (+ selected chips for `/refine`), return top results and ranked
  chips. No writes ever happen to this file at request time — it is
  read-only at runtime.

### 2.3 Data layer
- `/data/photos.json` — array of tagged photo records (schema in §5).
  Generated entirely offline; treated as a build artifact, committed to
  the repo like any other static asset.
- No external database. This keeps the whole system deployable as a
  single static-plus-serverless Vercel project with nothing to
  provision.

### 2.4 Offline pipeline (`/scripts`, run locally by the developer before
deploy — not part of the deployed app)
- `scripts/seed-photos.js` (or `.ts`) — calls Pixabay API (primary) and
  Unsplash API (secondary, optional — approval-gated, don't block on it)
  across the themed queries listed in `problem_statement.md` §6,
  downloads 200-300 images into `/public/photos/`. Pixabay's response
  shape differs from a typical stock-photo API: image URLs are
  `webformatURL`/`largeImageURL`, and `tags` is a comma-separated
  string, not an array — parse accordingly, don't assume the shape used
  for any other source.
- `scripts/tag-photos.js` — for each downloaded photo, calls a
  currently-live Groq vision-capable model (verify against
  `console.groq.com/docs/models` — do not hardcode an unverified model
  name) to produce a caption and structured attribute tags. The tagging
  prompt must extract **specific actions and objects** in the scene
  (e.g. "blowing out candles," "holding a gift," "wearing a party hat"),
  not just generic scene-level descriptors (setting, lighting, people
  count, colour) — the former is what users actually remember and
  search by; the latter alone produces chips that can miss a photo's
  most identifying detail entirely. Use **one fixed tag schema/
  vocabulary** across all photos (a defined set of attribute categories,
  e.g. `people_count`, `setting`, `action`, `object`, `time_of_day`,
  `colour`) so the same concept is never tagged two different ways (a
  `people_count` of 0 must always be represented identically, not
  sometimes as "People: 0" and sometimes as "0 people") — this prevents
  duplicate/inconsistent chips downstream in chip ranking (§3.1).
- `scripts/embed-photos.js` — builds a similarity representation per
  photo from its caption/tags (a real embedding if a Groq or other free
  embedding endpoint is available; otherwise a TF-IDF/keyword-overlap
  vector is an acceptable substitute at this corpus size).
- `scripts/build-dataset.js` — merges the above into the final
  `/data/photos.json`.
- These scripts are run manually (`node scripts/...`) during setup, not
  triggered by user traffic, and not part of the Vercel build step
  unless you choose to wire them into `postinstall` — safer to run them
  once locally and commit the resulting JSON.

### 2.5 External services
- **Pixabay API / Unsplash API** — offline only, photo sourcing.
- **Groq API** — offline (vision tagging) and online (live query
  normalization / chip-relevance scoring at request time).

## 3. Request-time sequence

### 3.1 Initial search
1. User submits a query in the frontend.
2. Frontend calls `POST /api/search { query }`.
3. Route loads `photos.json`, scores every photo against the query
   (similarity over caption/tag embeddings; optionally normalized via a
   quick Groq text-model call first).
4. Route selects the candidate pool as photos scoring above a minimum
   relevance threshold, up to a target size (e.g. top 30-50 by score).
   **The pool must never be padded with low-relevance photos to reach
   the target size** — if fewer than the target number of photos clear
   the threshold, the pool is simply smaller. A query with few truly
   relevant photos in the corpus (e.g. "birthday image" against a corpus
   with only a handful of birthday photos) must return a small, relevant
   pool, not a full-size pool diluted with unrelated photos (e.g. beach/
   ocean images) just to hit a count target. This threshold needs tuning
   against the actual corpus and scoring method in use — start
   conservative and adjust based on spot-checks like the one in §3.1a
   below.
5. From that pool, route computes attribute frequency across all
   detected tags, filters out near-universal (~95%+) and near-unique
   (single-photo) tags, ranks the rest by how evenly they split the
   pool, and returns the top chips (with `matchCount` per chip).
6. Route returns the visible slice of results (e.g. top 6-12 of the
   pool) plus the ranked chip list.
7. Frontend renders: summary line ("Searching for: {query}"), chips with
   counts, result-count line, grid with a "best match" badge on the
   top-ranked result.

   **§3.1a Correctness check:** the result-count line and the chip
   match-counts must be computed from the *same* candidate pool — if the
   result count says "12 results" but a chip shows a count of 22, the
   two are being computed from different pool sizes and must be
   reconciled. Separately, spot-check that top chips for a query are
   actually relevant to that query (e.g. "birthday image" should not
   surface "Ocean" or "Beach" as top chips) — if irrelevant chips
   dominate, the relevance threshold in step 4 is too loose, or the
   similarity scoring (embeddings vs. TF-IDF fallback) is matching on
   generic co-occurring terms rather than real conceptual relevance to
   the query.

### 3.2 Refine (chip tap)
1. User taps a chip (or several).
2. Frontend calls `POST /api/refine { query, selectedChips }`.
3. Route recomputes the **original query's** similarity-ranked candidate
   pool across the full photo set — identical scoring logic to
   `/api/search`, re-run fresh each time (this must re-touch the full
   photo set, not just the previously visible slice, since the target
   photo may not have been in the previously visible results).
4. Route then **filters** that query-ranked pool down to only photos
   whose tags include **every** currently selected chip (AND logic
   across chips — a photo needs all selected tags to survive, not just
   one). Chips **narrow** the original query; they never replace it or
   run as a standalone tag search on their own.
5. Route re-ranks the surviving, filtered photos by their original
   query-similarity score (from step 3) — chip selection filters which
   photos are eligible, it does not re-order by chip relevance.
6. From this narrowed pool, route recomputes chip frequency/ranking the
   same way `/api/search` does for its initial pool (already-selected
   chips should not reappear as unselected options).
7. Route returns the updated results + chips + counts.
8. Frontend updates the summary line, chip row, result-count line, and
   grid together.

   **Correctness check:** result count must only stay the same or
   shrink as more chips are selected (set intersection) — it must never
   grow, and results must always remain thematically connected to the
   original query. If tapping a chip returns photos unrelated to the
   original query, the implementation is incorrectly treating the chip
   as a standalone search instead of a filter on the query's candidate
   pool — re-check step 3-4 above.

### 3.3 Clear clues
1. User taps "Clear clues".
2. Frontend re-calls `POST /api/search` with the original query and no
   selected chips, restoring the initial state.

## 4. Folder structure (suggested)

```
/app                      # Next.js app router pages
  /api/search/route.ts
  /api/refine/route.ts
  /page.tsx                # main results screen
/components
  SearchBar.tsx
  SummaryLine.tsx
  ChipRow.tsx
  ResultCountLine.tsx
  PhotoGrid.tsx
  RelatedRow.tsx            # existing date-chip row, left as-is
/lib
  retrieval.ts              # scoring/ranking logic shared by both routes
  chips.ts                  # chip selection/ranking logic
  groq.ts                   # Groq API client helpers
/data
  photos.json                # generated by offline pipeline, committed
/scripts
  seed-photos.js
  tag-photos.js
  embed-photos.js
  build-dataset.js
/public/photos                # downloaded demo images
.env.local.example            # PEXELS_API_KEY, UNSPLASH_ACCESS_KEY, GROQ_API_KEY placeholders
```

## 5. Data models (canonical — matches `problem_statement.md` §7)

```ts
type Photo = {
  id: string;
  imageUrl: string;
  caption: string;
  tags: string[];
  date: string;
  isBestMatch: boolean;
};

type Chip = {
  label: string;
  matchCount: number;
};
```

`photos.json` stores `Photo` records plus one additional offline-only
field, `embedding: number[]` (or `tagVector` if using TF-IDF instead of
a true embedding) — used for scoring at request time but not sent to
the frontend as-is.

## 6. Deployment (Vercel)

- One Vercel project, connected to the repo. Framework preset: Next.js
  (auto-detected).
- Environment variables set in Vercel dashboard: `GROQ_API_KEY` (needed
  at runtime for live query/chip scoring), `PIXABAY_API_KEY` /
  `UNSPLASH_ACCESS_KEY` (only needed locally, for re-running the offline
  seeding scripts — not required by the deployed app itself, since
  `/data/photos.json` and `/public/photos` are already committed).
- No database, no separate server, no Docker — a standard Vercel
  Next.js deploy covers the entire system.
- Build step: standard `next build`. The offline pipeline scripts are
  **not** run during Vercel's build — they are a one-time local step
  whose output (`photos.json`, `/public/photos`) is committed before
  deploying.

## 7. Non-functional notes

- At 200-300 photos, in-memory scoring on every request is fast enough
  with no caching needed; if it becomes a bottleneck, cache the parsed
  `photos.json` at module scope so it's not re-read from disk on every
  invocation.
- Groq free-tier rate limits are more than sufficient for a 1-3 person
  usability test; the only place volume matters is the one-time offline
  tagging pass over 200-300 photos, which should be paced (e.g. small
  delay between calls) to stay under per-minute limits.
- No authentication, sessions, or persistence of user queries across
  visits is required for this MVP.