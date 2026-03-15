## Why

PR #245 restored focus to the natural language text input after transaction creation, which works well on desktop. On mobile/touch devices, however, programmatically focusing a textarea triggers the virtual keyboard to open — an intrusive and unexpected interruption when the user has no immediate intention to type again.

## What Changes

- The post-creation focus restoration is limited to **non-touch (desktop) devices only**
- On mobile/touch devices, focus is intentionally skipped after a transaction is created
- No visual or structural changes to the UI

## Capabilities

### New Capabilities

_None_

### Modified Capabilities

- `transactions`: The "Focus Restored After Natural Language Transaction Creation" requirement is updated — focus restoration now applies only on desktop (non-touch) devices, not on mobile/touch devices

## Impact

- `frontend/src/views/Transactions.vue` — conditional guard around the `.focus()` call using Vuetify's `useDisplay().mobile`
- No backend changes
- No new dependencies
