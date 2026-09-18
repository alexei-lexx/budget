## Why

The starred trends list sorts entries by category label text only. A preset with more categories can sort below a preset with fewer categories just because its label starts with a later letter. Presets covering more categories are broader and more informative at a glance, so they should surface first.

## What Changes

- Insert a new sort criterion into the starred trends list ordering: after the existing "all" (no categories) presets are placed first, presets with more categories sort before presets with fewer categories.
- The category-count criterion applies before the existing alphabetical category-label comparison. Presets with the same category count keep falling back to label, then period type, then lookback, then currency, exactly as today.
- No change to the "all" presets always sorting first, and no change to any other existing tiebreaker.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `trends`: The "Starred Trends List" requirement's ordering rule changes to sort by category count (descending) between the "all first" rule and the alphabetical category-label comparison.

## Impact

- Frontend: `frontend/src/components/reports/TrendPresetsList.vue` — `sortedTrendPresets` comparator gains a category-count comparison step.
- Frontend tests: `frontend/src/components/reports/TrendPresetsList.test.ts` — add coverage for the new ordering rule.
- No backend, schema, or data changes; ordering is a frontend display concern only.

## Constitution Compliance

- **Frontend Code Discipline**: No new custom CSS or components; change is confined to an existing comparator function.
- **Test Strategy**: Frontend testing is manual by default, but this component already has unit tests for its sort behavior (`TrendPresetsList.test.ts`), so new ordering scenarios are added there, consistent with the existing practice of testing this file.
- No other constitution principles apply (no backend, schema, or data-layer changes).
