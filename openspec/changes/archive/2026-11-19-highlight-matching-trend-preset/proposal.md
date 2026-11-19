# Proposal

## Why

The starred trends list on the Trends page does not show which entry is active.
When the applied filters equal a starred configuration, the user cannot see this in the list.
The user must compare the filter values with the entry labels to find the active entry.

## What Changes

- Mark every starred trends list entry that equals the applied trend configuration as selected
- Use the same equality rule as the star control: same period type, lookback, currency, and include-uncategorized setting, and the same set of categories in any order
- Remove the selected marking when the applied configuration stops matching the entry
- Do not mark an entry when the user changes the filters but does not apply them

## Capabilities

### New Capabilities

None

### Modified Capabilities

- `expense-trends`: the starred trends list marks each entry that equals the applied configuration

## Impact

- Frontend only: `frontend/src/views/Trends.vue` and `frontend/src/components/reports/TrendPresetsList.vue`
- Frontend composable: `frontend/src/composables/useTrendPresets.ts`
- Frontend tests: `frontend/src/components/reports/TrendPresetsList.test.ts` and `frontend/src/composables/useTrendPresets.test.ts`
- No change to the GraphQL schema, the backend, or the stored data

## Constitution Compliance

- **Frontend Code Discipline**: the selected marking uses Vuetify chip props, with no custom CSS
- **UI Guidelines**: the marking works on mobile screens because it changes only the chip style, not the layout
- **Schema-Driven Development**: not applicable, the API does not change
- **Test Strategy**: frontend tests are optional; a component test covers the selected marking because the list already has tests
- **Violations**: none
