## Bug Report

**Title**: Star button stays unstarred after starring a new Trend configuration

**Description**: On the Trends page, clicking the star button saves the current
filter selection as a new starred preset. The new preset appears at the top of
the page in the starred list. The star button in the filters panel stays
outlined (unstarred), even though the configuration it represents is now
saved.

## Why

The star control must reflect whether the applied configuration is saved, per
the existing "Star Reflects a Matching Saved Configuration" requirement. It
does not, so users cannot tell a preset was saved, and repeated clicks can
create duplicate presets for the same configuration.

## What Changes

- Fix the saved-preset match in `useTrendPresets` so `includeUncategorized` is
  compared consistently, regardless of whether the value is `undefined`,
  `null`, or `false`.

## Capabilities

No specs change. The "Star Reflects a Matching Saved Configuration"
requirement in `openspec/specs/trends/spec.md` already documents the correct
behavior; the implementation does not follow it. This is a pure bug fix with
no change to documented behavior, so `skip_specs: true` applies.

## Impact

- `frontend/src/composables/useTrendPresets.ts` — `matchingTrendPreset`
  comparison logic.
- Affects the star button in `TrendFilters.vue` and, indirectly, which chips
  in `TrendPresetsList.vue` a user can unstar (same matching function).

## Constitution Compliance

- **Frontend Code Discipline**: no new custom components or CSS; only a
  comparison fix in an existing composable.
- **TypeScript Code Generation**: fix keeps strict typing; no `any` or
  non-null assertions introduced.
- **Test Strategy**: frontend tests are optional per the constitution; a
  focused unit test for `useTrendPresets` is added since the fix is a pure
  logic function, cheap to test, and directly prevents regression of this bug.

No other constitution principles apply — this change is frontend-only, has no
GraphQL schema or backend impact.
