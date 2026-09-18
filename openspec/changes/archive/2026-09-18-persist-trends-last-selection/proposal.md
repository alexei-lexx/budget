## Why

The Trends page only remembers the applied selection in the URL. Navigating away and back via in-app navigation (not the browser back button) loads a fresh URL with no query, so the chart resets to hardcoded defaults instead of the user's last selection. Users expect their last choice to still be there when they return to the page.

## What Changes

- Persist the applied trend selection (period type, lookback, currency, categories, include-uncategorized) to `localStorage` whenever it changes, including when the user clears the selection back to defaults.
- On page load with no selection in the URL, hydrate the applied selection from the stored value instead of the hardcoded defaults, then reflect it in the URL.
- URL query parameters keep taking priority over the stored value, so bookmarked and shared links keep working as before.
- Validate the stored value the same way URL query parameters are validated today. A missing or invalid stored value falls back to the hardcoded defaults without showing an error.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `trends`: the "Trend URL State" requirement currently falls back straight to hardcoded defaults when the URL carries no selection; it now falls back to the user's last applied selection first, stored outside the URL, before falling back to hardcoded defaults.

## Impact

- Affected code: `frontend/src/views/Trends.vue` (initial hydration and the `handleApply`/`handleClear` paths), likely a new small persistence helper alongside `frontend/src/lib/appStorage.ts`.
- No backend or GraphQL schema changes.
- No new dependencies.

## Constitution Compliance

- **Vendor Independence**: uses the browser's `localStorage` API only; no new dependency, frontend remains deployable to any static host.
- **Schema-Driven Development**: not applicable, no GraphQL schema or API change.
- **UI Guidelines**: no new user-facing error paths; invalid stored data falls back silently, consistent with existing invalid-URL-parameter handling. No snackbar needed.
- **Frontend Code Discipline**: reuses the existing `frontend/src/lib/appStorage.ts` namespacing convention rather than introducing a new storage mechanism or a state management library.
- **Test Strategy**: frontend is tested manually per the constitution; no test files are required, though the stored-value validation logic is small and self-contained enough to unit test if desired.

Compliant, no violations.
