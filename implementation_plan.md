# Implementation Plan — AI-Native Retrieval MVP

Companion to `problem_statement.md` (the "what") and `architecture.md`
(the "how"). This document sequences the build into 6 phases, each with
a clear exit condition, so progress can be checked incrementally rather
than only at the very end.

---

## Phase 1 — Project scaffold & environment

**Goal:** an empty but deployable skeleton, before any real logic exists.

**Tasks:**
- Initialize a Next.js project with the folder structure from
  `architecture.md` §4.
- Set up `.env.local.example` with placeholders: `PEXELS_API_KEY`,
  `UNSPLASH_ACCESS_KEY`, `GROQ_API_KEY`, `HF_API_KEY`.
- Connect the repo to a new Vercel project (framework auto-detected).
- Deploy the untouched Next.js starter page to confirm the pipeline
  (repo → Vercel → public URL) works before any custom code is added.

**Inputs needed:** none (API keys are not required yet).

**Exit criteria:** a public Vercel URL loads a blank/default Next.js
page. Nothing custom is built yet — this phase only proves the
deployment path works, so later phases aren't blocked debugging infra
at the same time as logic.

---

## Phase 2 — Photo corpus sourcing

**Goal:** 200-300 real stock photos downloaded and stored locally,
matching the themed categories from `problem_statement.md` §6.

**Tasks:**
- Implement `scripts/seed-photos.js`.
- Query Pixabay API (primary — self-serve key, no approval wait) across
  themed searches: beach/outdoor, cafes, birthday/festival, group
  photos, pets, documents, street scenes. Note its response shape:
  `webformatURL`/`largeImageURL` for images, `tags` as a comma-separated
  string.
- Supplement with Unsplash API where available (optional — approval-
  gated; don't block this phase on it, mind its 50 req/hour limit if
  granted).
- Save images to `/public/photos/`, and write a plain manifest (id,
  filename, source, theme) — this manifest feeds Phase 3.

**Inputs needed:** `PIXABAY_API_KEY` (and `UNSPLASH_ACCESS_KEY` if/when
approved) — supplied by the case author before this phase starts.

**Exit criteria:** `/public/photos/` contains 200-300 images spanning
all listed themes, with a manifest file listing each one. No tagging or
app logic yet.

---

## Phase 3 — Offline tagging & dataset build

**Goal:** `/data/photos.json` fully populated — this is the single
artifact every later phase depends on.

**Tasks:**
- Implement `scripts/tag-photos.js`: for each photo in the manifest,
  call a currently-live Groq vision-capable model (check
  `console.groq.com/docs/models` first) to produce a caption and
  structured attribute tags (people count, setting, objects, time-of-
  day, colour, activity). Pace calls to stay under Groq's free-tier
  per-minute limits.
- Implement `scripts/embed-photos.js`: build a similarity representation
  per photo (real embedding if a free endpoint is available, otherwise
  TF-IDF/keyword-overlap vector over caption + tags).
- Implement `scripts/build-dataset.js`: merge manifest + tags +
  embeddings into `/data/photos.json`, matching the `Photo` schema in
  `architecture.md` §5 (plus the offline-only `embedding`/`tagVector`
  field).
- Manually spot-check ~15-20 entries for caption/tag quality before
  moving on — bad tags here silently break chip quality later.

**Inputs needed:** `GROQ_API_KEY`, `HF_API_KEY`; Phase 2's manifest and
images.

**Exit criteria:** `/data/photos.json` exists, contains one well-formed
record per photo, and spot-checked entries have plausible, specific
(not generic) captions and tags.

---

## Phase 4 — Retrieval & chip logic (API layer)

**Goal:** `/api/search` and `/api/refine` work correctly when called
directly (e.g. via curl/Postman), before any UI exists.

**Tasks:**
- Implement `/lib/retrieval.ts`: scoring function that ranks all photos
  in `photos.json` against a query string using the embedding/vector
  similarity.
- Implement `/lib/chips.ts`: from a candidate pool, compute attribute
  frequency, filter near-universal (~95%+) and near-unique (single-
  photo) tags, rank the remainder by how evenly they split the pool, and
  return the top chips with `matchCount`.
- Implement `POST /api/search` per the contract in
  `problem_statement.md` §7, wiring together retrieval + chip logic.
- Implement `POST /api/refine` per the same contract — re-scores the
  **full** candidate pool using query + selected chip terms (not a
  filter of the prior response), and excludes already-selected chips
  from the returned chip list.
- Write a few manual test queries covering: a query with an obvious
  match, a vague query returning a large pool, and a query where the
  target requires at least one refinement step to surface.

**Inputs needed:** Phase 3's `photos.json`.

**Exit criteria:** both endpoints return well-formed JSON matching the
contract for all three manual test queries above, with chip counts and
rankings that look sensible on inspection.

---

## Phase 5 — Frontend build

**Goal:** the full UI from `problem_statement.md` §3-4, wired live to
the Phase 4 API, visually matching the reference screenshots.

**Tasks:**
- Build the results screen per `problem_statement.md` §3: header with
  back arrow + query title, running "Searching for: …" summary line,
  attribute chip row (in the position of the old description text, with
  match counts, "+N more" / "Show fewer" toggle), result-count line,
  photo grid with "best match" badge, the untouched existing "Related"
  date-chip row lower on the screen, and the bottom search/follow-up
  input.
- Wire the search bar to `POST /api/search` and chip taps / "Clear
  clues" to `POST /api/refine`.
- Match the dark theme, spacing, and component styling from the
  reference screenshots as closely as practical.
- Implement the free-text fallback ("Nothing fits? Type your own clue")
  as a plain re-search in v1 (no conversational logic, per
  `problem_statement.md` §5).

**Inputs needed:** Phase 4's working API; reference screenshots.

**Exit criteria:** a person can type a query, see the full results
screen render correctly, tap chips and watch the summary line/result
count/grid update together, and use "Clear clues" to reset — all in a
local dev environment (`next dev`), not yet deployed.

---

## Phase 6 — Deploy, end-to-end test & handoff readiness

**Goal:** the deployed MVP satisfies every item in `problem_statement.md`
§8 (Definition of done), ready for 1-3 real users to test.

**Tasks:**
- Set `GROQ_API_KEY` and `HF_API_KEY` in the Vercel project's
  environment variables
  (`PIXABAY_API_KEY`/`UNSPLASH_ACCESS_KEY` are not needed in production —
  seeding is a local, one-time step).
- Deploy to Vercel; confirm `/data/photos.json` and `/public/photos` are
  committed and served correctly.
- Plant one specific target photo in the corpus ahead of time (matching
  a real scenario from the original interviews, e.g. "college outing
  near water") and confirm the full flow finds it: initial query →
  chips appear → tapping relevant chip(s) narrows results → target photo
  surfaces with a "best match" badge.
- Walk through every Definition of done item in `problem_statement.md`
  §8 on the live URL, on a phone-sized viewport, and check each one off.
- Fix any visual or functional gaps found during this pass before
  considering the MVP ready to hand to test users.

**Inputs needed:** Phase 5's working local build; Vercel project from
Phase 1.

**Exit criteria:** the deployed public URL, opened fresh on a phone-
sized screen by someone unfamiliar with the build, satisfies all six
Definition of done steps in `problem_statement.md` §8. This is the point
at which the MVP is ready for Part 6 of the case (testing with 3+ users
from the target segment).