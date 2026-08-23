## 1. Update App Shell

- [x] 1.1 In `frontend/src/App.vue`, remove the "User info when authenticated" `div` (avatar + `displayName`) from the `v-app-bar` `append` slot, keeping the auth-loading spinner and user-creation-error tooltip in place.
- [x] 1.2 In the `v-navigation-drawer` list, add a non-interactive `v-list-item` showing `mdi-account` and `displayName`, placed after the existing `v-divider` and before the "Sign Out" `v-list-item`, visible only when `isAuthenticated`.

## 2. Verify

- [x] 2.1 Run the app (`npm run dev` in `frontend/`), sign in, and visually confirm: the app bar no longer shows the avatar/email, and the sidebar shows the email directly above "Sign Out" on mobile, tablet, and desktop widths.
- [x] 2.2 Confirm sign-out still works by clicking the sign-out item below the new email row.
- [x] 2.3 Run `npm run typecheck` and `npm run format` in `frontend/` and fix any issues.

## Constitution Compliance

- **UI Guidelines** (mobile-first, responsive): verified visually across mobile/tablet/desktop in task 2.1. Compliant.
- **Frontend Code Discipline** (framework components, minimal custom CSS): implementation reuses `v-list-item`/`prepend-icon`, no custom CSS. Compliant.
- **Test Strategy**: this is a simple, non-critical layout change; per constitution, frontend changes are verified manually and automated component tests are not required. No test task added.
- **Code Quality Validation**: task 2.3 covers typecheck and lint/format; no test suite step because no test files change.
