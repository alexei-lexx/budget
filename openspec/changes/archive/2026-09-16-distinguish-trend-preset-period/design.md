## Context

`TrendPresetsList.vue` renders each starred configuration as a `v-chip` (`variant="outlined"`, `size="small"`). The only color used today is the static amber star icon (`amber-darken-2`), shared with the star toggle in `TrendFilters.vue`. There is no per-category or per-currency color source in the app; `ExpenseTrendChart.vue` is the one place that assigns color meaning, and it does so by pulling semantic tokens off the active Vuetify theme (`theme.current.value.colors`, e.g. `primary`, `secondary`, `info`, `warning`) rather than hardcoded hex values. See proposal.md - Why for the motivation.

## Goals / Non-Goals

**Goals:**

- Let a user tell a Week entry from a Month entry in the starred list without reading the label.
- Keep the chip shell itself (outline, amber star) completely untouched — the period-type cue lives entirely in a tinted background behind the period phrase in the label.

**Non-Goals:**

- Changing chip layout, label text, sort order, or click behavior.
- Introducing a general-purpose color-coding system for other preset attributes (category, currency).
- Adding a legend explaining the colors — the chip label already states the period in words, so the color is a secondary, glanceable cue, not the sole source of truth.

## Decisions

**Where the marking lives:** color the leading star icon's background is not viable (it must stay amber, matching the star elsewhere), and coloring the whole chip shell competes visually with that outline/star rather than reading as a distinct cue. Instead, the marking lives inside the label text itself: the period phrase substring (the `{lookback} {week|weeks|month|months}` piece, e.g. "6 weeks", "3 months") is wrapped in its own inline element and given a tinted, rounded background — a small pill — driven by `periodUnit` (hue) and `lookback` (lightness). This means `formatEntry()`'s single interpolated string splits into prefix / period-phrase / suffix pieces so the template can wrap just the period phrase; the visible words, their order, and the rest of the chip are unchanged.

**Which colors:** use two custom hues instead of Vuetify theme tokens — teal for `WEEK`, rose for `MONTH`.

**Lightness scales with lookback:** within each hue, background lightness is scaled relative to the lookback values of the entries currently visible in that hue's group — not the fixed 1–12 app-wide bound. For the Week entries on screen, the smallest `lookback` renders faintest and the largest renders strongest; the Month entries on screen scale the same way, independently. A hue group with only one visible entry has no second point to scale against, so it renders at the strongest tint. This means a preset's tint can shift as other presets are starred or unstarred — the label text remains the literal, stable source of truth for the exact lookback; the tint is a relative, glanceable "shorter vs longer among what's currently starred" cue, not an absolute measure. The lightness range is clamped so both ends stay legible: the faintest tint still reads as a visible pill (not indistinguishable from the chip's white background), and the strongest tint still leaves enough contrast for the label text on top (not so dark/saturated that it becomes hard to read). Exact clamp values are an implementation detail for tasks.md.

**Scope of the change:** implementation still touches only `TrendPresetsList.vue` — `formatEntry()` splits into prefix / period-phrase / suffix, and the template wraps the period-phrase in a `<span>` with a computed inline `style`. The color computation needs, per hue, the min/max `lookback` among the currently starred entries of that `periodUnit` (similar to the existing `sortedTrendPresets` computed) to place each entry's lightness within that range. No change to `useTrendPresets.ts`, GraphQL schema, or the chip's click/apply behavior.

## Risks / Trade-offs

- [Color alone is not accessible to color-blind users] → The chip label still spells out "week"/"month" in text, so color is a supplementary cue, not the only one.
- [Two hardcoded hues live only in this component, outside the app's theme system, so they won't pick up a future theme/color-system change automatically] → Low risk: the app has no dark mode or theme switcher today (confirmed in `frontend/src/plugins/vuetify.ts`), and the surface is a single component; revisit if that changes.
- [Tint is relative to the currently-starred set, so the same lookback can render a different lightness on different visits (e.g. a 6-week entry is "strongest" when it's the longest starred Week preset, but mid-tint once a 12-week Week preset is also starred)] → Intentional: the tint is a glanceable "shorter vs longer among what's shown" cue, not a stable absolute encoding — the label text is the stable source of truth.
- [Clamping too loosely could let the strongest tint get dark/saturated enough to hurt label-text legibility, while clamping too tightly could make the faintest and strongest ends hard to tell apart] → Clamp both ends to a legible band (visible tint, readable text) instead of sweeping to pure white or full saturation; exact values are an implementation detail for tasks.md.

## Constitution Compliance

- **Frontend Code Discipline** (prefer framework components/styles, minimize custom CSS): satisfied with a narrow exception — the tinted pill's color is computed from `periodUnit` and `lookback`, which Vuetify's `color` prop can't express (it only accepts named theme tokens), so it needs one small bound inline `style` on the period-phrase span. No new CSS files, classes, or component libraries.
- **UI Guidelines** (mobile-first, responsive): satisfied — no layout or sizing change.
- No other constitution principles apply to this frontend-only styling change.
