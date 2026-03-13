## 1. Fix Layout Overflow

- [x] 1.1 In `CategoryBreakdownTable.vue`, add a scoped deep style to force `table-layout: fixed; width: 100%` on the `v-table`'s inner `<table>` element

## 2. Validation

- [x] 2.1 Run `npm run typecheck` and `npm run format` in `frontend/` — confirm no errors
- [ ] 2.2 Manually verify on a narrow viewport (≤480px) that expanding a category shows transactions without horizontal overflow and the amount is fully visible
- [ ] 2.3 Manually verify on desktop that the category breakdown layout is unchanged
