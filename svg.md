# SVG Icon Requests

This app never uses emoji in its UI — every icon is a real SVG (Lucide by
default). When a concept needs an icon and no suitable Lucide icon exists,
it gets logged here (name + description + suggested color palette) instead
of falling back to an emoji or a vague/wrong icon, so the user can commission
real artwork later.

## Open requests

Logged 2026-07-23 — the shareable result card
(`components/quiz/ShareCardFace.tsx`) currently uses emoji as placeholders,
as a deliberate one-off exception (see `MEMORY.md` Section 13, item 9): it
was built to match a reference design the user hand-authored and supplied
directly (`public/shareCard/`), which itself used emoji throughout. These
four should eventually be replaced with real SVG artwork:

1. **Crown** (👑 placeholder)
   - Used for: perfect-score (100%) badge above the avatar.
   - Description: a simple, chunky, hand-drawn-style royal crown — 3-5
     points, flat fill, thick dark outline to match the app's "tactile"
     design language (see other cards/badges in the app).
   - Color palette: gold/yellow fill (`--color-yellow` `#ffd200`), ink
     outline (`--color-ink` `#14120f`), optionally 2-3 small gem accents in
     `--color-coral`/`--color-blue`/`--color-green`.

2. **Flame / streak** (🔥 placeholder)
   - Used for: the "Streak" stat box icon.
   - Description: a simple rounded flame silhouette, flat fill, thick dark
     outline, matching the app's existing `Flame` Lucide icon usage
     elsewhere (e.g. dashboard streak chip) but as a bespoke filled/colored
     asset instead of a line icon, since this card's icon circles use solid
     fills.
   - Color palette: `--color-orange` (`#ff9500`) fill, ink outline.

3. **Star / score** (⭐ placeholder)
   - Used for: the "Score" stat box icon.
   - Description: a simple 5-point star, flat fill, thick dark outline,
     same "tactile" style as the flame above.
   - Color palette: `--color-yellow` (`#ffd200`) fill, ink outline.

4. **Globe / link** (🌐 placeholder)
   - Used for: the "quizzx.app" pill in the card footer.
   - Description: could likely just use the existing Lucide `Globe` icon
     directly instead of commissioning custom artwork — lower priority than
     the three above, listed for completeness.
   - Color palette: white/`--color-yellow` outline to match the footer pill.

## Standing rule

Never use emoji anywhere else in the app. If a new UI surface needs an icon
and Lucide doesn't have a good match, add a new entry above rather than
reaching for an emoji.
