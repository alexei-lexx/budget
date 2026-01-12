# Research: Move Sign-Out Button to Main Sidebar Menu

**Date**: 2026-01-12
**Branch**: 027-move-signout-sidebar

## Summary

This document captures the technical research findings for relocating the sign-out button from the app bar to the main sidebar navigation menu. The implementation requires modifying a single file (App.vue) with no API, backend, or data layer changes.

## Current Implementation Analysis

### Sign-Out Button Location

**File**: [frontend/src/components/auth/LogoutButton.vue](../../../frontend/src/components/auth/LogoutButton.vue)

The sign-out button is currently implemented as a standalone component:
- **Component**: `LogoutButton.vue` (22 lines)
- **Location in UI**: Top app bar, right side (`:append` slot)
- **Styling**: Secondary color, outlined variant, with `mdi-logout` icon
- **State**: Shows loading state during sign-out operation
- **Visibility**: Conditional on `isAuthenticated && !authLoading && !ensureUserLoading`

**Current Usage** ([App.vue:135](../../../frontend/src/App.vue#L135)):
```vue
<LogoutButton v-if="isAuthenticated && !authLoading && !ensureUserLoading" />
```

### Sidebar Structure

**File**: [frontend/src/App.vue](../../../frontend/src/App.vue) (lines 140-186)

The main sidebar uses Vuetify's navigation drawer pattern:
- **Component**: `v-navigation-drawer`
- **Behavior**:
  - Temporary (overlay) on mobile (< 960px breakpoint)
  - Permanent (fixed) on desktop
- **Width**: Responsive (280px on xs, 300px otherwise)
- **Menu Items**: All use `v-list-item` with Vue Router integration
- **Icons**: Material Design Icons (mdi-*)
- **Mobile UX**: Drawer auto-closes on item click via `@click="mobile && (drawer = false)"`

**Current Menu Items**:
1. Sign In (unauthenticated users only)
2. Transactions (`mdi-swap-horizontal`)
3. Accounts (`mdi-bank`)
4. Categories (`mdi-tag-multiple`)
5. Monthly Report (`mdi-table-large`)

### Sign-Out Logic

**File**: [frontend/src/composables/useAuth.ts](../../../frontend/src/composables/useAuth.ts) (lines 26-32)

The logout functionality is exposed via the `useAuth` composable:
```typescript
const logoutUser = () => {
  logout({
    logoutParams: {
      returnTo: window.location.origin,
    },
  });
};
```

**Auth Provider**: Auth0 via `@auth0/auth0-vue`
- Clears Auth0 session
- Redirects to `window.location.origin`
- Token stored in localStorage
- Vue Router guards redirect to SignIn page for unauthenticated users

### Responsive Design Patterns

**Mobile Detection** ([App.vue:17-27](../../../frontend/src/App.vue#L17-L27)):
```typescript
import { useDisplay } from "vuetify";
const { mobile } = useDisplay();
```

**Breakpoints**:
- `mobile`: < 960px (handles tablets and phones)
- `xs`: < 600px (phones)
- Used for conditional rendering and sizing

**Responsive Features**:
- Hamburger menu icon (mobile only)
- Drawer state management (open on desktop, closed on mobile initially)
- Compact list density on xs screens
- Drawer auto-close on mobile navigation

## Implementation Approach

### Decision: Direct Integration in App.vue

**Rationale**:
- Simplest approach avoiding unnecessary component abstractions
- Consistent with existing menu item pattern
- No props/events needed
- Single file change

**Alternative Considered**: Reuse LogoutButton.vue component
- **Rejected because**: Would need to modify the component's appearance to match list items, defeating the purpose of component reuse

### Implementation Strategy

1. **Add sign-out list item to sidebar** (after line 184 in App.vue):
   - Use `v-divider` for visual separation from navigation items
   - Add `v-list-item` with same pattern as existing items
   - Call `logout()` from `useAuth` composable
   - Include mobile drawer close logic
   - Use existing `mdi-logout` icon
   - Title: "Sign Out"

2. **Remove LogoutButton from app bar** (line 135 in App.vue):
   - Delete the `<LogoutButton>` element
   - Component file can remain for potential future use or be deleted

3. **Maintain existing behavior**:
   - Conditional rendering based on `isAuthenticated`
   - Same loading states (handled by auth composable)
   - Same redirect behavior (handled by Auth0)
   - Same error handling (handled by auth system)

### Vuetify Component Patterns

**Standard List Item Pattern** (observed in existing code):
```vue
<v-list-item
  v-if="isAuthenticated"
  prepend-icon="mdi-icon-name"
  title="Display Text"
  @click="handleClick"
/>
```

**For Sign-Out Implementation**:
```vue
<v-divider v-if="isAuthenticated" />
<v-list-item
  v-if="isAuthenticated && !authLoading && !ensureUserLoading"
  prepend-icon="mdi-logout"
  title="Sign Out"
  :disabled="isLoading"
  @click="handleSignOut"
/>
```

Where `handleSignOut` method:
```typescript
const handleSignOut = () => {
  if (mobile.value) {
    drawer.value = false;
  }
  logout();
};
```

### Files Requiring Modification

| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/src/App.vue` | Modify | Add sign-out list item to sidebar, remove LogoutButton from app bar |

### Files Not Modified

| File | Reason |
|------|--------|
| `frontend/src/components/auth/LogoutButton.vue` | Can be retained for future use or deleted in cleanup |
| `frontend/src/composables/useAuth.ts` | No changes needed - already exports logout function |
| `frontend/src/plugins/auth0.ts` | No changes to auth configuration |
| `frontend/src/router/index.ts` | No changes to routing |

## Technical Decisions

### Visual Design

**Decision**: Add divider before sign-out item

**Rationale**:
- Visually separates action (sign out) from navigation items
- Common UX pattern for destructive/exit actions
- Matches Material Design guidelines
- No custom CSS required

**Implementation**: Use `<v-divider>` component with same conditional as sign-out item

### Accessibility

**Decision**: Maintain same accessibility as existing list items

**Implementation**:
- Vuetify `v-list-item` provides built-in ARIA attributes
- Icon + text label pattern (same as other items)
- Keyboard navigation supported by Vuetify
- Focus states handled automatically
- No additional work required

### Loading State

**Decision**: Use disabled state during sign-out

**Rationale**:
- Prevents double-clicks
- Consistent with button behavior (LogoutButton uses `:loading`)
- `v-list-item` supports `:disabled` prop
- Auth composable exposes `isLoading` ref

**Implementation**:
```vue
:disabled="isLoading"
```

Where `isLoading` comes from `useAuth()` composable

### Error Handling

**Decision**: Maintain existing error handling (no changes)

**Rationale**:
- Auth0 handles sign-out errors
- Error display already implemented in App.vue for user operations
- No additional error handling needed for this UI change

## Testing Strategy

### Manual Testing Checklist

Per constitution (Test Strategy section), frontend changes are verified manually:

1. **Desktop View** (> 960px):
   - [ ] Sign-out button visible in sidebar (bottom, after divider)
   - [ ] Sign-out button removed from app bar
   - [ ] Click sign-out button → user signed out
   - [ ] After sign-out → redirected to sign-in page
   - [ ] After sign-out → cannot access protected routes

2. **Mobile View** (< 960px):
   - [ ] Sign-out button visible in sidebar
   - [ ] Click sign-out → drawer closes → user signed out
   - [ ] Hamburger menu still functional

3. **Tablet View** (600px - 960px):
   - [ ] Sign-out button visible and functional
   - [ ] Responsive behavior correct

4. **Loading State**:
   - [ ] Sign-out button disabled during logout operation
   - [ ] No double-click issues

5. **Accessibility**:
   - [ ] Sign-out item keyboard navigable
   - [ ] Focus visible on keyboard navigation
   - [ ] Screen reader announces "Sign Out"

## Dependencies

**No new dependencies required**:
- All required packages already in use (Vue 3, Vuetify, @auth0/auth0-vue)
- No additional npm packages
- No additional imports needed (all composables and components already imported in App.vue)

## Performance Considerations

**No performance impact expected**:
- Same number of components rendered
- No additional network requests
- No additional state management
- Simple DOM reorganization
- Icon already loaded (mdi-logout used by LogoutButton)

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| User doesn't find sign-out button in new location | Medium | Low | Sidebar is primary navigation, bottom placement is conventional for sign-out |
| Mobile drawer doesn't close after sign-out | Low | Low | Implement same pattern as existing menu items |
| Loading state not visible | Low | Low | Use disabled state like other operations |
| Breaking existing auth flow | High | Very Low | No changes to auth logic, only UI reorganization |

## Open Questions

None - all technical details resolved through codebase analysis.

## References

- **Constitution**: [Frontend Code Discipline](.specify/memory/constitution.md#frontend-code-discipline)
- **Constitution**: [UI Guidelines](.specify/memory/constitution.md#ui-guidelines)
- **Vuetify Documentation**: [Navigation Drawer](https://vuetifyjs.com/en/components/navigation-drawers/)
- **Vuetify Documentation**: [Lists](https://vuetifyjs.com/en/components/lists/)
- **Material Design Icons**: [mdi-logout](https://pictogrammers.com/library/mdi/icon/logout/)
