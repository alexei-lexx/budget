## Why

The starred trends list on the Trends page shows every preset as an identical outlined chip. When a user stars many presets, week-based and month-based presets look the same at a glance. The user has to read the full label text to tell them apart, which slows down picking the right one.

## What Changes

- Give each starred trend chip's period phrase (e.g. "6 weeks", "3 months") a tinted background pill: teal for Week, rose for Month, with the tint's lightness scaling by the preset's lookback (1–12) — shorter lookbacks fainter, longer ones stronger. The two hues are chosen outside the app's Vuetify theme tokens, a deliberate trade for a pair distinct enough to also carry the lightness gradient. The chip's outline shell and amber star are unchanged.
- No change to the chip's label text, ordering, click behavior, or the underlying data model.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trends`: the "Starred Trends List" requirement gains a rule that each entry's period type SHALL be visually distinguishable from the other period type.

## Impact

- Affected code: `frontend/src/components/reports/TrendPresetsList.vue` (chip rendering).
- No GraphQL schema, backend, or data model changes — `periodUnit` (`WEEK`/`MONTH`) already exists on `TrendPreset`.
- No new dependencies.

## Constitution Compliance

- **Frontend Code Discipline** (prefer framework components/styles, minimize custom CSS): satisfied with a narrow exception — Vuetify's `color` prop only accepts named theme tokens, not the custom hue-plus-lookback-driven lightness this design calls for, so the period-phrase pill needs one small bound inline `style` (no new CSS files or classes). Everything else (chip, icon, layout) still uses stock Vuetify props.
- **UI Guidelines** (mobile-first, responsive): satisfied — no layout change, only color, so mobile rendering is unaffected.
- No backend, data layer, schema, testing-strategy, or authentication principles apply — this is a frontend-only visual change to already-exposed data.
