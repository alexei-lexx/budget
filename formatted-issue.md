# show transaction buttons as icons on small screens

## Problem

Transaction page buttons ("Add Transaction" and "Add Transfer") display with icon and text on all screen sizes, creating an inconsistent user experience. The "Add account" and "Add category" buttons on other pages are reduced to icon-only on small screens, but transaction buttons do not follow this pattern.

## Solution

Update the transaction page buttons to be responsive:
- Desktop (≥600px): Show buttons with icon and text
- Mobile (<600px): Show icon-only round buttons

## Acceptance Criteria

- [ ] "Add Transaction" button displays as icon-only on small screens
- [ ] "Add Transfer" button displays as icon-only on small screens
- [ ] Both buttons maintain icon + text on desktop screens
- [ ] Button behavior matches Accounts and Categories pages

## UI Behavior

- Use conditional rendering with `v-if="$vuetify.display.smAndUp"` and `v-else`
- Desktop variant: `prepend-icon` with text label
- Mobile variant: `icon` prop with `size="large"` for round icon-only buttons
- Maintain existing button colors (primary/secondary)
