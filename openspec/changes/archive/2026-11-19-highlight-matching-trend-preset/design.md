# Design

## Context

- `useTrendPresets().matchingTrendPreset(selection)` already finds the saved preset that equals a selection
- `TrendFilters.vue` uses this function for the star control, with the applied selection as input
- `Trends.vue` already calls `useTrendPresets()` and passes `trendPresets` to `TrendPresetsList.vue`
- `Trends.vue` owns the applied selection as the `selection` computed value, with the default currency resolved
- `TrendPresetsList.vue` renders each preset as a `v-chip` with `variant="outlined"`

## Goals / Non-Goals

**Goals:**

- Reuse the existing equality rule, so that the list marking and the star control always agree
- Keep `TrendPresetsList.vue` a presentational component that does not know the equality rule

**Non-Goals:**

- No change to the click behavior of an entry: a click on the marked entry applies the same configuration again
- No marking for the draft (unapplied) filter values
- No prevention of duplicate presets: duplicates are not expected in normal use, and all of them are marked if they exist

## Decisions

### Add `matchingTrendPresets` to `useTrendPresets`

`matchingTrendPresets(selection)` returns all saved presets that equal the selection.
It and the existing `matchingTrendPreset` use one shared equality check.

- The shared check keeps the star control and the list marking in agreement
- The name follows the existing `matchingTrendPreset`

Alternative considered:

- Reuse `matchingTrendPreset`: it returns only the first match, so a duplicate entry stays unmarked

### Find the matches in `Trends.vue`, pass only the IDs to the list

`Trends.vue` gets `matchingTrendPresets` from `useTrendPresets()`.
It computes `selectedTrendPresetIds` as the IDs of `matchingTrendPresets(selection.value)`.
It passes this value to `TrendPresetsList.vue` as a new `selectedTrendPresetIds: string[]` prop.

- The input is `selection`, not `appliedSelection`, so that a URL or a stored selection without a currency matches after the default currency resolves
- The value is reactive, because `matchingTrendPresets` reads the reactive `trendPresets` list

Alternatives considered:

- Pass the selection to the list and compare there: the list would duplicate or import the equality rule
- Use `v-chip-group`: the group scrolls horizontally unless `column` is set, and it replaces the `ga-2` gap with its own chip margins

### Mark the selected chip with Vuetify chip props

All chips keep `variant="outlined"`.
The selected chip also gets `color="primary"`, so its border and text are primary.
The selected chip also gets `aria-current="true"`, so that assistive technology reads the state.

- No custom CSS, as the constitution requires
- The period pill keeps its own background color, so the period marking stays visible on the selected chip
- The chip background stays white, so the period pill text stays readable

Alternatives considered:

- `variant="flat"`: the filled chip is too heavy, and its white text is not readable on the light period pill
- `variant="tonal"`: the primary tint is weak next to the period pill tint, so the selected chip is hard to see

## Risks / Trade-offs

- [The primary text on the period pill can have low contrast] → check the chip in the running app, and change the color in the same task if the contrast is low

## Constitution Compliance

- **Frontend Code Discipline**: Vuetify chip props only, no custom CSS
- **UI Guidelines**: the chip style changes, the layout does not, so mobile behavior stays the same
- **Test Strategy**: co-located tests in `useTrendPresets.test.ts` and `TrendPresetsList.test.ts` cover the matching and the marking
- **Violations**: none
