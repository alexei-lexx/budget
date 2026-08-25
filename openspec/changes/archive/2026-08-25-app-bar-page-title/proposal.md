## Why

On phone and tablet, every page shows two stacked titles: the static app name in the top app bar, and the page's own title directly below it. The two rows compete for vertical space on small screens where space is already scarce. The app-bar title also never changes, so it adds no information beyond what the sidebar and the page already show.

## What Changes

- App bar title becomes route-driven instead of a static app name:
  - Desktop (permanent sidebar): shows `App Name › Page Title`.
  - Mobile and tablet (temporary sidebar): shows `Page Title` only.
  - Reuses the existing `nav.*` translation keys already used for the sidebar menu labels, rather than introducing new ones.
- The duplicate page-title heading is removed from every page (Transactions, Accounts, Categories, Reports, Assistant, Settings) — the app bar is now the single source of the page title.
- Action buttons that shared a row with the removed heading (filter, add, transfer, view-mode toggle, etc.) stay on the page, right-aligned.
- Sign In gets the same route-driven title treatment as every other page — no special case.
- The auth-loading spinner and user-creation warning icon in the app bar are unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `navigation`: the top app bar's title requirement changes from a static app name to a route-driven title, responsive by screen size.

## Impact

- Frontend only, no backend or infrastructure changes.
- `frontend/src/App.vue`: app bar title logic.
- `frontend/src/router/index.ts`: per-route title metadata.
- `frontend/src/views/Transactions.vue`, `Accounts.vue`, `Categories.vue`, `ByCategoryReport.vue`, `Assistant.vue`, `Settings.vue`: remove the page heading, keep and realign action buttons.

## Constitution Compliance

- **UI Guidelines** (mobile-first, responsive): this change directly serves that principle by reclaiming vertical space on phone and tablet.
- **Frontend Code Discipline** (prefer framework components, minimize custom CSS): implemented with Vuetify's `v-app-bar` title binding and existing utility classes; no custom CSS.
- **Test Strategy** (frontend: manual visual verification): no automated frontend tests required; verify visually across phone, tablet, and desktop breakpoints.

No violations identified.
