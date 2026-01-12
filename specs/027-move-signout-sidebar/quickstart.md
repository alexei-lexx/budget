# Quickstart: Move Sign-Out Button to Main Sidebar Menu

**Branch**: 027-move-signout-sidebar
**Prerequisites**: Node.js, npm, local development environment running

## Overview

This feature moves the sign-out button from the top app bar to the main sidebar navigation menu. It's a frontend-only UI change requiring modification to a single file.

## Development Setup

### 1. Switch to Feature Branch

```bash
git checkout 027-move-signout-sidebar
```

### 2. Start Development Server

```bash
cd frontend
npm run dev
```

Access the app at `http://localhost:5173` (or port shown in terminal)

### 3. Sign In

Navigate to the app and sign in with your Auth0 credentials to see authenticated views.

## Implementation Steps

### Step 1: Locate the Target File

Open `frontend/src/App.vue` - this contains both:
- The app bar with current LogoutButton (line ~135)
- The navigation drawer/sidebar (lines ~140-186)

### Step 2: Add Sign-Out to Sidebar

**Location**: After the last navigation item (Monthly Report, line ~184)

Add before the closing `</v-list>` tag:

```vue
<!-- Visual separator -->
<v-divider v-if="isAuthenticated" />

<!-- Sign out item -->
<v-list-item
  v-if="isAuthenticated && !authLoading && !ensureUserLoading"
  prepend-icon="mdi-logout"
  title="Sign Out"
  :disabled="isLoading"
  @click="handleSignOut"
/>
```

### Step 3: Add Sign-Out Handler

**Location**: In the `<script setup>` section of App.vue

Add after the existing composable calls (after line ~12):

```typescript
const { logout, isLoading } = useAuth();

const handleSignOut = () => {
  if (mobile.value) {
    drawer.value = false;
  }
  logout();
};
```

**Note**: Import `useAuth` if not already imported:
```typescript
import { useAuth } from "@/composables/useAuth";
```

### Step 4: Remove from App Bar

**Location**: Line ~135 in App.vue

Find and remove this line:
```vue
<LogoutButton v-if="isAuthenticated && !authLoading && !ensureUserLoading" />
```

### Step 5: Optional Cleanup

The `LogoutButton` component can be removed since it's no longer used:
- Delete `frontend/src/components/auth/LogoutButton.vue`
- Remove the import from App.vue (if present): `import LogoutButton from "@/components/auth/LogoutButton.vue";`

Or keep it for potential future use - your choice.

## Testing the Change

### Desktop View (> 960px)

1. Refresh the browser
2. Verify sign-out button no longer appears in top app bar
3. Look at sidebar - sign-out should be at bottom, below divider
4. Click "Sign Out" → should sign out and redirect to sign-in page
5. Sign in again → verify behavior repeats correctly

### Mobile View (< 960px)

1. Resize browser to mobile width or use DevTools device emulation
2. Tap hamburger menu icon (top-left)
3. Sidebar opens as overlay
4. Verify sign-out button visible at bottom
5. Tap "Sign Out" → sidebar should close, then sign-out occurs
6. Redirected to sign-in page

### Tablet View (600px - 960px)

1. Resize to tablet width
2. Verify sign-out appears and functions correctly
3. Drawer behavior should be temporary (overlay mode)

## Expected Behavior

### Before Change
- Sign-out button in top-right corner of app bar
- Next to user avatar and email
- Visible on all authenticated pages

### After Change
- Sign-out button in sidebar navigation menu
- At bottom of menu, after visual divider
- Top app bar shows only: hamburger (mobile), title, user info
- Sign-out accessible via sidebar on all screen sizes

## Common Issues & Solutions

### Issue: "Cannot find name 'useAuth'"

**Solution**: Add import at top of script section:
```typescript
import { useAuth } from "@/composables/useAuth";
```

### Issue: "Cannot find name 'isLoading'"

**Solution**: Destructure `isLoading` from `useAuth()`:
```typescript
const { logout, isLoading } = useAuth();
```

### Issue: Drawer doesn't close on mobile after clicking sign-out

**Solution**: Verify `handleSignOut` includes the drawer close logic:
```typescript
if (mobile.value) {
  drawer.value = false;
}
```

### Issue: TypeScript errors about types

**Solution**:
1. Run `npm run type-check` to see specific errors
2. Ensure all imports are correct
3. Run `npm run format` to fix formatting issues

### Issue: Sign-out button not visible

**Solution**: Check that:
- You're signed in (button only shows when authenticated)
- The conditional includes all required flags: `v-if="isAuthenticated && !authLoading && !ensureUserLoading"`
- The sidebar drawer is open (click hamburger icon on mobile)

## Verification Checklist

- [ ] Sign-out removed from app bar
- [ ] Sign-out added to sidebar (bottom position)
- [ ] Visual divider appears before sign-out
- [ ] Desktop: sign-out works correctly
- [ ] Mobile: drawer closes, then sign-out works
- [ ] Loading state prevents double-clicks
- [ ] Redirects to sign-in page after sign-out
- [ ] Can sign in again successfully
- [ ] No console errors
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Code formatted (`npm run format`)

## Development Commands

```bash
# Run development server
npm run dev

# Type checking
npm run type-check

# Format code
npm run format

# Lint code
npm run lint

# Build for production
npm run build
```

## File Summary

**Modified**:
- `frontend/src/App.vue` - Add sign-out to sidebar, remove from app bar

**Optional Cleanup**:
- `frontend/src/components/auth/LogoutButton.vue` - Can be deleted if desired

**Unchanged**:
- `frontend/src/composables/useAuth.ts` - No changes needed
- All other files

## Next Steps

After completing implementation and manual testing:
1. Run `npm run type-check` - ensure no TypeScript errors
2. Run `npm run format` - format code per project standards
3. Run `npm run lint` - fix any linting issues
4. Test on actual mobile device if available
5. Ready for code review and merge

## Support

**Constitution Reference**: [Frontend Code Discipline](.specify/memory/constitution.md#frontend-code-discipline)
**Detailed Research**: [research.md](research.md)
**Implementation Plan**: [plan.md](plan.md)
