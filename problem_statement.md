# Solution Spec — AI-Native Retrieval MVP for Google Photos

## 1. What we are building

An AI-generated attribute-chip layer on the Google Photos "Ask Photos"
results screen. When a query returns a result set, the system analyzes
the full candidate pool (not just the visible grid) and surfaces a
ranked set of short, tappable chips describing attributes actually
detected in those photos (e.g. "Outdoors", "Group of friends", "Red
collar", "From WhatsApp", "Evening"). Tapping a chip **re-queries**
(combines the chip as an added clue with the original query) rather than
just filtering the currently visible grid.

## 2. Presentation: mobile device frame

The entire app is displayed inside a static mobile device frame (a
phone-mockup style container) — a rounded-rectangle phone body with
visible side buttons and a notch/dynamic-island cutout at the top,
holding the app content at a fixed phone-like aspect ratio (roughly
9:19.5), centered on the page. The frame is purely decorative chrome
(CSS/SVG), not a real responsive layout, and must render identically on
desktop and mobile browsers — this is for demo/grading presentation, not
an actual mobile deployment. The rest of the page background outside the
frame is plain/neutral so the phone reads as a distinct object on the
page. All UI described below (§3 onward) renders inside this fixed
viewport, scrolling within it if content overflows. Do not add real
mobile-specific behavior (touch gestures, viewport meta tweaks, etc.)
beyond what's already specified — this is a visual frame around the same
web app, nothing more. **The phone frame must always fit fully within
the visible browser viewport on page load, with no page-level scrolling
required to see the whole frame** — size it using viewport-relative
units with a sensible max size, scaling down proportionally on smaller
windows rather than overflowing. Scrolling should only ever occur for
content *inside* the phone's screen area, never for the frame itself
relative to the browser window.

## 3. UI placement (see reference screenshots)

- The existing AI-generated text summary/description block (the
  paragraph currently shown under the query title, e.g. "Here are some
  photos of your dogs...") is **removed**.
- The new attribute-chip row goes in that same position — **above the
  first row of photo results**, where the description used to be.
- The existing date-based "Related" chip row (further down the screen,
  showing dated moments like "Jun 11, 2020") **stays exactly where it
  currently is and is not modified, removed, or replaced.** The new
  attribute chips are a separate, additional row above the results; they
  do not touch or merge with the existing "Related" row.
- Everything else on the screen (header with back arrow + query title,
  thumbs up/down feedback icons, photo grid, "Most recent" section,
  bottom "Search or follow up" input) stays as in the reference
  screenshots.

## 4. Chip interaction logic

- A running summary line above the chip row shows the original query
  plus every currently selected clue as a breadcrumb, e.g. "Searching
  for: college outing · near water · group of friends · evening". This
  updates live as chips are toggled, so the user always sees what the
  system currently understands.
- Each chip displays its match count alongside its label (e.g. "Sea 14",
  "Group of friends 12") — this is the `matchCount` field on the `Chip`
  data model; it must be rendered on the chip itself, not just stored.
- Show the ~8 highest-value chips by default; the rest are available
  behind a "+N more" expandable control, which toggles to a "Show fewer"
  control to collapse back down.
- Rank chips by how evenly they split the current candidate pool (a chip
  matching ~95% or ~2% of candidates is low-value and should rank low).
- Specific actions and objects (e.g. "blowing out candles," "holding a
  cake," "wearing a party hat") must be tagged and surfaced as chips,
  not just generic scene-level attributes (setting, lighting, people
  count, colour). A distinctive action/object is usually what a user
  actually remembers and searches by — if the tagging pipeline only
  produces generic scene descriptors, the most identifying detail in a
  photo (e.g. a child blowing out birthday candles) can end up with no
  chip that describes it at all, even while it's the clear best match.
  When ranking, prefer specific action/object chips over generic
  scene-level chips at similar pool-split quality.
- Chip labels must be normalized before counting/ranking — equivalent
  attributes (e.g. "People: 0" and "0 people") must be merged into a
  single canonical label, never shown as separate chips with separate
  counts. Define one consistent tag vocabulary/schema at the tagging
  step (see §6) so this doesn't need fixing downstream.
- Multiple chips can be selected at once and compose as additive clues.
- A result-count line above the grid states the current result count and
  how it was reached, e.g. "48 loosely matching results" before any clue
  is selected, or "Re-searched with 2 clues: 8 results" after chips are
  applied — this confirms to the user that a tap changed something.
- A "Clear clues" control resets to the original, unfiltered query
  result.
- A visible fallback ("Nothing fits? Type your own clue") must always be
  available — chips should never be the only path forward.
- Every search input (the initial query box and the free-text fallback)
  must have a visible submit button (e.g. a search/magnifying-glass icon
  button) alongside it — submitting must not rely solely on the user
  knowing to press Enter, though Enter-to-submit should still work as a
  secondary path.
- The top-ranked/best-matching result in a narrowed set gets a subtle
  "best match" indicator.
- Selecting a chip triggers a fresh retrieval call (query + chip terms),
  not a client-side filter of the currently visible grid — the target
  photo may not have been in the original visible set at all.

## 5. Explicit scope boundaries

**In scope:**
- A working, deployed, shareable web app (mobile-first layout) usable on
  a phone or desktop browser.
- A seeded demo photo corpus (not personal photos).
- Free-text query → candidate retrieval → AI-detected, ranked chips →
  chip tap → re-query → narrowed results.
- Visual style closely matching the reference screenshots (Google Photos
  mobile UI, dark theme).

**Out of scope (do not build):**
- Real Google Photos account integration. Google removed the
  `photoslibrary.readonly` scope in March 2025; no third-party app can
  programmatically browse a user's existing library anymore. Only the
  Picker API (manual, per-session, user-driven selection) remains, which
  does not support this use case. Do not attempt OAuth against a real
  library.
- User accounts / authentication / multi-tenant data.
- A production-grade vector database — in-memory similarity search over
  precomputed embeddings is sufficient at 200-300 photos.
- Native mobile app packaging — a responsive web app is sufficient.
- Any conversational/multi-turn logic behind the "Search or follow up"
  box beyond a plain re-search in v1.

## 6. Technical stack

- **Frontend + hosting:** Next.js, deployed on Vercel (public URL, no
  separate server; API routes double as the backend).
- **"Database":** a single static JSON file (e.g. `/data/photos.json`)
  holding, per photo: file reference, AI-generated caption, detected
  attribute tags, and a precomputed embedding of the caption.
- **Photo corpus:** 200-300 free stock images pulled via the Pixabay API
  (primary — free, self-serve key shown on the logged-in API docs page,
  no approval wait, 100 req/minute) and/or Unsplash API (secondary,
  approval-gated, 50 req/hour free once granted — treat as optional,
  don't block the build on it), sourced across themed queries
  (beach/outdoor, cafes, birthday/festival, group photos, pets,
  documents, street scenes). Note Pixabay's response shape differs from
  a typical stock-photo API — image URLs come back as `webformatURL` /
  `largeImageURL`, and `tags` is a single comma-separated string, not an
  array — parse accordingly. API keys will be supplied before the
  seeding step — leave placeholders (`PIXABAY_API_KEY`,
  `UNSPLASH_ACCESS_KEY`) in env config until then.
- **AI model: Groq** (free tier).
  - *Offline tagging* (run once, pre-deploy): send each photo to a
    currently-live Groq vision-capable model to generate a caption plus
    structured attributes (people count, setting, objects, time-of-day,
    colour, activity). Check `console.groq.com/docs/models` for whatever
    vision model is currently served — do not hardcode an unverified
    model name.
  - *Live step* (query/refine time): a fast Groq text model handles
    query normalization and/or chip-relevance scoring.
  - *Embeddings:* if no dedicated embedding endpoint is available on
    Groq's free tier, TF-IDF or keyword-overlap similarity over
    captions/tags is an acceptable substitute at this corpus size.

## 7. API contract (Next.js API routes)

- `POST /api/search`
  Input: `{ query: string }`
  Output: `{ results: Photo[], chips: Chip[] }`

- `POST /api/refine`
  Input: `{ query: string, selectedChips: string[] }`
  Output: `{ results: Photo[], chips: Chip[] }`
  Recomputes the original query's candidate pool, then filters it to
  only photos matching **all** selected chips (AND, not a standalone
  chip search), then re-ranks survivors by original query-similarity.
  Result count must only shrink or stay level as chips are added, never
  grow — see `architecture.md` §3.2 for the exact algorithm.
  Already-selected chips should not reappear as unselected options.

`Photo`: `{ id, imageUrl, caption, tags: string[], date, isBestMatch: boolean }`
`Chip`: `{ label: string, matchCount: number }`

## 8. Definition of done

A person unfamiliar with the build can:
1. Open the deployed URL on a phone-sized screen.
2. Type a vague, natural-language query.
3. See a results screen with: a running "Searching for: …" summary line,
   attribute chips (each showing a match count) above the grid in place
   of the old description text, a result-count line above the grid, the
   untouched date-based "Related" row further down, and the photo grid.
4. Tap one or more attribute chips and see the summary line, result
   count, and results all update together, with a "best match" indicator
   on the top pick.
5. Use "Clear clues" to reset, and use the free-text fallback if no chip
   fits.
6. Find a specific, pre-planted target photo in the demo corpus this
   way.

## 9. Reference materials

Three mobile-app screenshots of the existing Google Photos "Ask Photos"
flow are provided alongside this document for UI/style reference only
(home grid → search/ask input screen → AI results screen with existing
date-based "Related" chips). Do not extract or reuse any personal
photos, faces, or identifying details visible in those screenshots —
they define layout, theme, and component style only.