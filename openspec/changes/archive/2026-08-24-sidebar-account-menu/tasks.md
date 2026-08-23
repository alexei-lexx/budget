## 1. Update Sidebar Account Row

- [x] 1.1 In `frontend/src/App.vue`, replace the "Signed-in user email" `v-list-item` and the "Sign out item" `v-list-item` in the `v-navigation-drawer` list with a single account `v-list-item` (icon `mdi-account`, title `displayName`, append-icon `mdi-chevron-down` to indicate it opens a menu), wrapped in a `v-menu` using `activator="parent"`, visible only when `isAuthenticated`.
- [x] 1.2 Inside the `v-menu`, add a `v-list` with a single `v-list-item` for "Sign Out" (`prepend-icon="mdi-logout"`, `:title="t('nav.signOut')"`, `@click="handleSignOut"`), shown only when `!authLoading && !ensureUserLoading`, matching the loading gating the old sign-out item had.

## 2. Verify

- [x] 2.1 Run the app (`npm run dev` in `frontend/`), sign in, and visually confirm: the sidebar shows a single account row (icon + email + dropdown indicator icon) where the separate email and sign-out rows used to be, on mobile, tablet, and desktop widths.
- [x] 2.2 Click the account row, confirm the menu opens showing "Sign Out", and confirm sign-out still works by selecting it.
- [x] 2.3 On a short viewport (e.g. landscape mobile or a short desktop window), confirm the account row is no longer clipped or hidden.
- [x] 2.4 Run `npm run typecheck` and `npm run format` in `frontend/` and fix any issues.

## Constitution Compliance

- **UI Guidelines** (mobile-first, responsive): verified visually across mobile/tablet/desktop, including short viewports, in tasks 2.1 and 2.3. Compliant.
- **Frontend Code Discipline** (framework components, minimal custom CSS): implementation reuses `v-menu`/`v-list-item`, no custom CSS. Compliant.
- **Test Strategy**: this is a simple, non-critical layout/interaction change; per constitution, frontend changes are verified manually and automated component tests are not required. No test task added.
- **Code Quality Validation**: task 2.4 covers typecheck and lint/format; no test suite step because no test files change.
