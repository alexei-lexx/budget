## Context

See proposal.md - Why.

Today `App.vue` renders a static `<v-app-bar :title="t('app.title')">`. Each view (`Transactions`, `Accounts`, `Categories`, `ByCategoryReport`, `Assistant`, `Settings`) renders its own `<h1>` title in a header `<div>`, and on `Accounts`/`Categories`/`ByCategoryReport`/`Transactions` that same `<div>` also holds the page's action buttons, laid out with `justify-sm-space-between` to push the buttons away from the heading. `Assistant` and `Settings` have no header buttons - their header `<div>` holds only the `<h1>`. `SignIn` has no page heading at all.

The router (`router/index.ts`) defines routes with no title metadata. Sidebar labels already exist as `nav.*` i18n keys (`nav.transactions`, `nav.signIn`, etc.) in `locales/en.json` / `de.json`. `App.vue` already reads `mobile` from Vuetify's `useDisplay()` to size the drawer and toolbar icons.

## Goals / Non-Goals

**Goals:**

- Compute the app bar title from the active route, reusing the existing `nav.*` keys
- Vary the app bar title format (app name + page title vs. page title alone) using the same `mobile` signal `App.vue` already uses for drawer behavior
- Remove the per-page `<h1>` and, where a header row also held action buttons, keep those buttons right-aligned
- Give `SignIn` the same route-driven title as every other route, with no special-casing

**Non-Goals:**

- No changes to `nav.*` key values, sidebar menu order, or icons
- No changes to route paths, names, or guards
- No new automated frontend tests (per constitution's frontend test strategy)

## Decisions

**Route-to-title mapping lives in route `meta`.** Add `meta: { titleKey: 'nav.transactions' }` (etc.) to each route, using the same key already used for that route's sidebar entry. `App.vue` reads `route.meta.titleKey` via `useRoute()`.

- Alternative considered: a lookup map keyed by route `name` inside `App.vue`. Rejected - it duplicates the route table instead of extending it, and `meta` is the existing Vue Router convention already used here for `beforeEnter` guards.

**Title format is a single computed in `App.vue`.** `computed(() => mobile.value ? t(titleKey) : `${t('app.title')} › ${t(titleKey)}`)`, bound to `v-app-bar`'s existing `:title` prop. Falls back to `t('app.title')` alone while the router hasn't resolved the initial route yet (`titleKey` is unset), see Risks below.

- Alternative considered: two `<template>` branches (mobile/desktop) inside the app bar. Rejected - `:title` already accepts a plain string, and a computed keeps the same pattern as the other `mobile` conditionals already in `App.vue`.
- Alternative considered: `v-app-bar`'s `#title` slot with the app name and page title in separate, differently-styled `<span>`s (e.g. bold page title). Tried and reverted - visually it read as weird/inconsistent; the plain single-string title stands.

**The "›" separator is a literal, not an i18n key.** It is a visual separator, not language-specific text, and reads fine in both `en` and `de`.

**Page headers lose their `<h1>`; surviving action buttons right-align.** Where the header `<div>` held only an `<h1>` (`Assistant`, `Settings`), remove the whole `<div>`. Where it also held buttons (`Transactions`, `Accounts`, `Categories`, `ByCategoryReport`), remove the `<h1>` and change the row's `justify-sm-space-between` to `justify-sm-end` (or `justify-end` where `ByCategoryReport`'s toggle isn't wrapped in the same flex utilities) so the buttons sit flush right; the existing `flex-column flex-sm-row` stacking on mobile is unaffected since there's now only one child.

## Risks / Trade-offs

- [Removing `<h1>` elements drops a heading-level landmark some screen readers use to jump to page content] → `v-app-bar`'s title renders as a `<div>`, not a heading; this is an accepted trade-off of the proposal (see proposal.md - Why) and matches the scenario in specs/navigation - page title appears once, in the app bar.
- [Hard-coded "›" may not suit a future right-to-left locale] → out of scope; the project currently ships `en`/`de` only, and RTL isn't a current requirement.
- [`route.meta.titleKey` is unset on the very first render of a hard page load/reload, before Vue Router resolves its initial navigation (`main.ts` calls `.mount()` without awaiting `router.isReady()`)] → `pageTitle` falls back to `t('app.title')` and `showAppNamePrefix` is `false` until `titleKey` resolves, so `t()` is never called with `undefined`. Calling `t(undefined)` previously threw inside vue-i18n during render, which corrupted that render pass (observed as duplicated app-bar/nav/main DOM and a stray "Authentication required" snackbar caused by the interrupted reactivity flush).

## Constitution Compliance

- **UI Guidelines** (mobile-first, responsive): title format and header layout both branch on Vuetify's `mobile` breakpoint, consistent with existing patterns in `App.vue` and the views.
- **Frontend Code Discipline** (prefer framework components, minimize custom CSS): uses `v-app-bar`'s built-in `title` prop and existing Vuetify spacing/flex utility classes; no custom CSS added.
- **TypeScript Code Generation** (naming, strict typing): `titleKey` route meta is a plain string field on the existing typed route config; no new abbreviations or assertions introduced.
- **Test Strategy** (frontend: manual visual verification): no automated frontend tests added; verified manually across phone, tablet, and desktop breakpoints per proposal.md.

No violations identified.
