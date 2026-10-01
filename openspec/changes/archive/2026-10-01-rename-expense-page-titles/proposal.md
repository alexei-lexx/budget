## Why

The Reports and Trends pages show only expenses. Their titles are generic: "Reports" and "Trends". The titles suggest the pages also cover income. Income reporting is not planned, so the titles should say "expense".

## What Changes

- Rename the "Reports" navigation item and page title to "Expense Breakdown".
- Rename the "Trends" navigation item and page title to "Expense Trends".
- Update German translations: "Ausgabenaufteilung" and "Ausgabentrends".
- Rename translation keys `nav.reports` → `nav.expenseBreakdown` and `nav.trends` → `nav.expenseTrends`.
- Rename route names `ByCategoryReport` → `ExpenseBreakdown` and `Trends` → `ExpenseTrends`.
- Move `/reports/by-category` → `/reports/expense-breakdown` and `/trends` → `/reports/expense-trends`.
- The names leave room for future income and savings reports under `/reports/`.
- Page content and behavior stay unchanged.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `navigation`: The Section Navigation menu item names change from "Reports" and "Trends" to "Expense Breakdown" and "Expense Trends".

## Impact

- `frontend/src/locales/en.json`, `frontend/src/locales/de.json`: `nav.reports`, `nav.trends` renamed and relabeled.
- `frontend/src/router/index.ts`: route names, paths, and title keys.
- `frontend/src/App.vue`: drawer links and title keys.
- The same keys drive the navigation drawer and the app bar title. Both update together.
- Unchanged: the `reports.*` and `trends.*` text sections, the page files, and the backend.

## Constitution Compliance

- **UI Guidelines (mobile first)**: Complies. "Expense Breakdown" is short enough for the mobile app bar. Verify on a narrow screen.
- **Frontend Code Discipline**: Complies. Only translation strings and router configuration change. No custom components or CSS.
- **Test Strategy**: Complies. Frontend is tested manually. No tests reference the old labels.
- **Code Quality Validation**: Applies. Run the frontend test suite, typecheck, and format.
- Only frontend routing and text change. Backend principles do not apply.
