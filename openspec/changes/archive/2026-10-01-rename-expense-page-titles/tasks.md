## Code Style

Apply [docs/code-style.md](../../../docs/code-style.md) during implementation.

## 1. Translations

- [x] 1.1 In `frontend/src/locales/en.json`, set `nav.reports` to "Expense Breakdown" and `nav.trends` to "Expense Trends"
- [x] 1.2 In `frontend/src/locales/de.json`, set `nav.reports` to "Ausgabenaufteilung" and `nav.trends` to "Ausgabentrends"

## 2. Verification

- [x] 2.1 Open the app. Check that the navigation drawer shows "Expense Breakdown" and "Expense Trends" in the correct order
- [x] 2.2 Open each page. Check that the app bar title matches its menu item on desktop and on a narrow mobile screen
- [x] 2.3 Switch the language to German. Check the drawer and app bar titles
- [x] 2.4 In `frontend/`, run `npm test`, `npm run typecheck`, and `npm run format`

## 3. Keys, Routes, and Paths

- [x] 3.1 In `frontend/src/locales/en.json` and `de.json`, rename `nav.reports` → `nav.expenseBreakdown` and `nav.trends` → `nav.expenseTrends`
- [x] 3.2 In `frontend/src/router/index.ts`, rename routes to `ExpenseBreakdown` and `ExpenseTrends`, set paths `/reports/expense-breakdown` and `/reports/expense-trends`, and update `titleKey`
- [x] 3.3 In `frontend/src/App.vue`, update the drawer links and title keys

## 4. Verification

- [x] 4.1 Check that drawer links open the new paths and the titles still match
- [x] 4.2 In `frontend/`, run `npm test`, `npm run typecheck`, and `npm run format`

## Constitution Compliance

- **Test Strategy**: Complies. Frontend is tested manually. No automated test covers these labels, so no tests are written first.
- **UI Guidelines (mobile first)**: Complies. Task 2.2 checks the title on a mobile screen.
- **Frontend Code Discipline**: Complies. Only translation strings and router configuration change.
- **Code Quality Validation**: Complies. Tasks 2.4 and 4.2 run the required pipeline.
