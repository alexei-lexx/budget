## 1. Router title metadata

- [x] 1.1 Add `meta: { titleKey }` to every route in `frontend/src/router/index.ts`, reusing the matching `nav.*` key (`nav.signIn`, `nav.transactions`, `nav.accounts`, `nav.categories`, `nav.reports`, `nav.assistant`, `nav.settings`)

## 2. App bar title

- [x] 2.1 In `frontend/src/App.vue`, add a computed app bar title that reads `route.meta.titleKey` via `useRoute()` and formats it as `${t('app.title')} › ${t(titleKey)}` on desktop (`!mobile`) or `t(titleKey)` alone on mobile/tablet
- [x] 2.2 Bind `v-app-bar`'s `:title` to the new computed, replacing the static `t('app.title')`

## 3. Remove duplicate page headings

- [x] 3.1 `Transactions.vue`: remove the `<h1>`, change the header row's `justify-sm-space-between` to `justify-sm-end` so the filter/add/transfer buttons stay right-aligned
- [x] 3.2 `Accounts.vue`: remove the `<h1>`, change the header row's `justify-sm-space-between` to `justify-sm-end` so the add-account button stays right-aligned
- [x] 3.3 `Categories.vue`: remove the `<h1>`, change the header row's `justify-sm-space-between` to `justify-sm-end` so the add-category button stays right-aligned
- [x] 3.4 `ByCategoryReport.vue`: remove the `<h1>`, right-align the monthly/yearly view-mode toggle in its header row
- [x] 3.5 `Assistant.vue`: remove the header `<div>` that wraps only the `<h1>`
- [x] 3.6 `Settings.vue`: remove the header `<div>` that wraps only the `<h1>`

## 4. Manual verification

- [x] 4.1 On desktop (permanent sidebar), confirm every page's app bar shows `App Name › Page Title`, including Sign In
- [x] 4.2 On mobile and tablet (temporary sidebar), confirm every page's app bar shows only the page title
- [x] 4.3 Confirm no page repeats its title in the page body, and that action buttons (filter, add, transfer, view-mode toggle) remain visible and right-aligned at each breakpoint
- [x] 4.4 Confirm the auth-loading spinner and user-creation warning icon in the app bar still render correctly next to the new title

## Constitution Compliance

- **Test Strategy**: frontend changes are UI-only (title computation, template edits); per the constitution's frontend test strategy, verified manually (section 4) rather than with automated tests - not a complex/critical component requiring unit tests.
- **TypeScript Code Generation**: new `titleKey` route meta field and app-bar computed use descriptive names and existing typing patterns; no assertions or non-null operators introduced.
- **Frontend Code Discipline**: implemented with Vuetify's `v-app-bar` title binding and existing utility classes; no custom CSS.

No violations identified.
