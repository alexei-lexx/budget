## Why

The signed-in user's email currently sits in the top app bar. On small screens it competes with the page title, and it disappears entirely below the `sm` breakpoint. Moving it into the sidebar, next to the sign-out control it identifies, keeps the account identity visible everywhere the sign-out action is.

## What Changes

- Remove the avatar + email display from the app bar's append slot.
- Add a signed-in user email row to the sidebar, placed between the divider and the "Sign Out" item.
- The sidebar row uses a generic account icon (`mdi-account`), matching the icon style of other sidebar items, instead of the profile picture shown in the app bar today. **BREAKING** for any user relying on seeing their Cognito profile picture in the UI — it is no longer displayed anywhere.
- Auth-loading spinner and user-creation-error indicator stay in the app bar; only the identity (avatar + email) block moves.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `navigation`: adds a requirement that the signed-in user's email is displayed in the sidebar, above the sign-out button, instead of in the app bar.

## Impact

- `frontend/src/App.vue`: remove the user-info block from the app bar `append` slot; add a list item for the user email in the navigation drawer, above the sign-out `v-list-item`.
- No GraphQL schema, backend, or i18n key changes — the email string source (`displayName` from `useAuth`) is reused as-is.

## Constitution Compliance

- **UI Guidelines** (mobile-first, responsive): sidebar is already used on all screen sizes for sign-out; this change makes identity visible on all screen sizes too, improving on today's `sm`-and-up-only display. Compliant.
- **Frontend Code Discipline** (framework components over custom): reuses `v-list-item` with `prepend-icon`, matching the existing sidebar items. No custom CSS added. Compliant.
- **Schema-Driven Development**: not applicable — no GraphQL schema change.
- **Test Strategy**: frontend change; manual visual verification per constitution, no new component test required.
