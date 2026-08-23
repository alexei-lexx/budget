## Why

The sidebar footer currently spends two full-height rows on the signed-in user's email (static, non-interactive) and the sign-out button (used once per session). Unlike the nav items above them, this footer does not scroll, so on short screens it can be clipped out of view entirely. Collapsing both rows into a single account row, with sign-out behind a click, removes that risk and matches a pattern users already know from other apps (Slack, Notion, GitHub, Gmail).

## What Changes

- Replace the two separate sidebar footer rows (email row, sign-out row) with one row showing the account icon, email, and a dropdown indicator icon.
- Clicking that row opens a menu containing a single "Sign Out" item; selecting it runs the existing sign-out behavior (session cleared, tokens removed, redirect to sign-in).
- **BREAKING** for anyone relying on sign-out as a single always-visible click in the sidebar — it now takes two clicks (open the account row, then click "Sign Out").

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `navigation`: changes the "Sign-Out in Sidebar" requirement — sign-out is triggered from a menu opened by the account row instead of being its own always-visible sidebar item; the account row's email is no longer required to sit directly above a separate sign-out row.

## Impact

- `frontend/src/App.vue`: replace the email `v-list-item` and sign-out `v-list-item` in the navigation drawer with a single trigger row and a `v-menu` containing one "Sign Out" item that calls the existing `handleSignOut`.
- No GraphQL schema, backend, or i18n key changes — reuses `displayName` from `useAuth` and the existing sign-out handler as-is.

## Constitution Compliance

- **UI Guidelines** (mobile-first, responsive): `v-menu` works the same way via tap or click across mobile, tablet, and desktop. Compliant.
- **Frontend Code Discipline** (framework components over custom): uses Vuetify's `v-menu` and `v-list-item`, no custom CSS. Compliant.
- **Schema-Driven Development**: not applicable — no GraphQL schema change.
- **Test Strategy**: frontend change; manual visual verification per constitution, no new component test required.
