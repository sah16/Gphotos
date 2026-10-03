# How to Test This MVP

This is a prototype of an AI-generated attribute-chip retrieval flow for
Google Photos, addressing: *increase the percentage of users who
successfully retrieve a photo they remember but cannot precisely
describe when they start searching.*

The problem this solves, in short: when someone's memory of a photo is
vague (a place, a few people, a rough occasion — not an exact date or
filename), a normal search either returns nothing useful or returns too
many similar-looking results to scan through. This MVP adds AI-detected
"clue chips" to the results screen — tap a remembered detail, and the
system re-searches using that clue, narrowing things down without
requiring an exact query up front.

**Live URL:** https://gphotos-one.vercel.app/

## What's in the demo corpus

The photo library behind this demo is seeded from free stock photography
(not real personal photos), spanning these themes: outdoor/beach scenes,
cafes, birthday/festival photos, group photos, pets, documents, and
street scenes. You don't need to know exactly what's in there — that's
the point of the flow below — but this gives you a sense of what kinds
of queries will return meaningful results.

## Suggested test walkthrough (recommended starting point)

This scenario is deliberately set up so the target photo is **not**
obvious from the first set of results, to demonstrate the actual problem
being solved:

1. Search: **"walking on the beach"** or **"Cafe Images"**
2. Notice the results are broad/ambiguous — several plausible-looking
   photos, no single obvious match.
3. Look at the AI-detected chips shown above the results (these are
   generated from what's actually in the current result pool, not a
   fixed list).
4. Tap a chip that matches a detail you'd plausibly remember (e.g. a
   setting, a group size, a time of day).
5. Watch the results narrow and re-rank — the summary line and result
   count update to reflect your added clue.
6. Repeat with a second chip if needed until the "best match" photo
   surfaces.
7. Try "Clear clues" to reset, and try the free-text fallback ("type
   your own clue") if no chip fits what you remember.

## Try your own queries

Beyond the guided scenario above, feel free to search anything plausible
given the themes listed above — e.g. "a cafe," "people at a party,"
"a document," "someone's dog." Results and chip quality will vary by
query, since this is a small (200-300 photo), free-stock demo corpus,
not a real personal photo library — see "Known limitations" below.

## What to look for

- Do the chips reflect real, sensible attributes of the current result
  set (not generic or irrelevant labels)?
- Does tapping a chip actually change the results (re-search), not just
  filter what's already on screen?
- Does the flow feel like it would help you find a photo you couldn't
  describe precisely, versus just typing a better keyword yourself?
- Is there always a way forward if chips don't match your memory (the
  free-text fallback)?

## Known limitations (in scope vs. out of scope)

This is a prototype focused specifically on the chip-refinement
interaction, not a full product rebuild. By design, it does **not**:
- Connect to any real Google Photos account (Google removed the API
  scope that would allow this in March 2025 — see `problem_statement.md`
  for detail).
- Include user accounts, login, or personalization.
- Support multi-turn conversational refinement beyond a single re-search
  on the free-text fallback.
- Guarantee high-quality results on arbitrary queries outside the
  seeded corpus's themes — this is a small demo dataset, not Google's
  full-scale index.

See `problem_statement.md` for the complete scope and rationale, and
`architecture.md` / `implementation_plan.md` for how it was built.
