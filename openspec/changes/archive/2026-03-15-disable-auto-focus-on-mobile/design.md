## Context

`Transactions.vue` currently calls `createTransactionFromTextInputRef.value?.focus()` unconditionally inside `handleCreateTransactionFromText` after a successful transaction creation. On mobile/touch devices this triggers the browser to open the virtual keyboard — an intrusive side effect that disrupts reading the updated transaction list.

Vuetify's `useDisplay` composable is already imported in `Transactions.vue` (used for `xs` to compute `dialogMaxWidth`). It exposes a reactive `mobile` boolean based on Vuetify's configured mobile breakpoint.

## Goals / Non-Goals

**Goals:**

- Skip the `.focus()` call on mobile/touch devices after natural language transaction creation
- Preserve existing desktop focus-restore behavior unchanged
- Use the project's existing Vuetify display utilities; no new imports or dependencies

**Non-Goals:**

- Changing focus behavior for any other interaction (form dialogs, filters, etc.)
- Detecting physical keyboard presence on tablets
- Addressing the same pattern on the Insights page (which does not implement focus restoration)

## Decisions

### Decision: Use `useDisplay().mobile` from Vuetify

**Chosen:** Destructure `mobile` from the already-imported `useDisplay()` call and guard `.focus()` with `if (!mobile.value)`.

**Alternatives considered:**

- `navigator.maxTouchPoints > 0` — more accurate for touch hardware detection, but not reactive and not consistent with how the rest of the codebase distinguishes mobile from desktop.
- `window.matchMedia('(pointer: coarse)')` — semantically closest to "no physical pointing device," but introduces a raw browser API where Vuetify's abstraction already exists.
- Custom composable — unnecessary overhead for a one-line guard.

**Rationale:** `useDisplay().mobile` is already in use in the component, is reactive, and is consistent with all other mobile/desktop layout decisions in the app (dialog widths, button styles). The edge cases (touch-enabled laptop, tablet with connected keyboard) are negligible for this app's audience and the degraded behavior (no auto-focus) is still acceptable.

## Risks / Trade-offs

- **Touch laptops get desktop treatment** → `mobile` is breakpoint-based, not touch-hardware-based. A touch laptop at full-screen width will be `mobile: false` and will receive focus restoration. This is the desired behavior (focus won't open a virtual keyboard on a touch laptop with a physical keyboard).
- **Narrow desktop browser windows get mobile treatment** → If a desktop browser window is resized below Vuetify's mobile breakpoint, focus restoration is skipped. Acceptable trade-off for consistency with the rest of the app's responsive logic.
