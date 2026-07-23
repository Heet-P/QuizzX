# SVG Icon Requests

This app never uses emoji in its UI — every icon is a real SVG (Lucide by
default). When a concept needs an icon and no suitable Lucide icon exists,
it gets logged here (name + description + suggested color palette) instead
of falling back to an emoji or a vague/wrong icon, so the user can commission
real artwork later.

## Fulfilled

The 4 requests below were logged 2026-07-23 for the shareable result card
(`components/quiz/ShareCardFace.tsx`), which had used emoji as a deliberate
one-off placeholder exception (see `MEMORY.md` Section 13, item 9). The user
supplied real commissioned artwork the same day — `public/crown.svg`,
`public/flame.svg`, `public/star.svg`, `public/globe.svg` — now wired into
`ShareCardFace.tsx` in place of the emoji:

1. **Crown** (`public/crown.svg`) — perfect-score (100%) badge above the
   avatar. Rendered at 96×96 with a drop-shadow, `.crown` class in
   `ShareCard.module.css`.
2. **Flame** (`public/flame.svg`) — the "Streak" stat box icon, cropped to a
   circle inside `.icon`/`.iconImg`.
3. **Star** (`public/star.svg`) — the "Score" stat box icon, same circular
   crop treatment as the flame.
4. **Globe** (`public/globe.svg`) — the small icon inline with "quizzx.app"
   in the footer pill, `.globeIcon` class, cropped to a 28px circle.

No more emoji anywhere in `ShareCardFace.tsx` — the exception noted in
`MEMORY.md` Section 13 item 9 no longer applies; that note should be updated
to reflect this is now real SVG artwork, not emoji.

## Standing rule

Never use emoji anywhere in the app. If a new UI surface needs an icon and
Lucide doesn't have a good match, add a new entry here (name + description +
suggested color palette) rather than reaching for an emoji.
