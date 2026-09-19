## Code Style

Apply `docs/code-style.md` during implementation.

## 1. Tests

- [ ] ~~1.1 (use `testing` skill) Write a test for `TrendFilters.vue` asserting: the Categories `v-col` is always full width; the checkbox and Currency `v-col` elements carry the `sm`-breakpoint responsive column classes that pair them side by side at 600px and up, and stack below 600px.~~ Skipped per user request (no layout tests).

## 2. Implementation

- [x] 2.1 In `frontend/src/components/reports/TrendFilters.vue`, move the "Include uncategorized" checkbox out of the Categories `v-col` into a new row, alongside the Currency filter.
- [x] 2.2 Set the Categories `v-col` to `cols="12"` (always full width, its own row).
- [x] 2.3 Set the checkbox and Currency `v-col` elements to `cols="12" sm="6"` so they stack below 600px and sit side by side at 600px and up.

## 3. Verification

- [x] 3.1 Run the frontend test suite and confirm existing tests pass.
- [x] 3.2 Manually check the Trends page filter panel at ~400px, ~700px, and ~1200px viewport widths to confirm: Categories is always its own full-width row; the checkbox and Currency stack below 600px and sit side by side at 600px and up.

## Constitution Compliance

- **Frontend stack (Vue 3, Vuetify, Vitest)**: implementation uses only existing Vuetify grid props and the project's existing test framework. No violations.
- **Vendor independence**: not affected; client-side layout only.
- **Schema-driven development**: not affected; no GraphQL schema change.
