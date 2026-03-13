## Context

All persistent form dialogs in the app use `<v-dialog persistent>`: four in
`Transactions.vue` (Create/Edit Transaction, Create/Edit Transfer), two in `Accounts.vue`
(Add/Edit Account), and two in `Categories.vue` (Add/Edit Category).
`persistent` is **intentional** — clicking outside should show a wobble animation and
keep the dialog open, preventing accidental data loss.

The bug is more targeted: pressing Escape works when the dialog first opens (the amount
field has `autofocus`, so focus is inside `<v-form>` and `@keydown.esc="$emit('cancel')"
fires). But after the user clicks the backdrop, Vuetify's wobble animation runs and
focus shifts away from the form content (to the overlay element or `body`). On the next
Escape press, focus is no longer inside `<v-form>`, so the form's `@keydown.esc`handler never fires, and Vuetify's`persistent` overlay handler intercepts the event
and plays the wobble instead of closing.

The Cancel button always works because it's an explicit click on a button inside the
card, unaffected by focus state.

## Goals / Non-Goals

**Goals:**

- Escape key closes any open transaction/transfer dialog at any point — including after
  a prior outside-click attempt
- Clicking outside keeps the current behavior: wobble animation, dialog stays open

**Non-Goals:**

- Changing outside-click behavior — `persistent` is intentional and stays
- "Unsaved changes" confirmation before closing via Escape — out of scope
- Any backend or GraphQL changes

## Decisions

### Handle Escape at the `<v-dialog>` level, not just inside `<v-form>`

**Decision**: Add `@keydown.esc="handleTransactionFormCancel"` directly to each of the
four `<v-dialog>` elements in `Transactions.vue`. Remove or keep the `@keydown.esc`
on `<v-form>` (it's harmless but redundant for cases where focus is inside the form).

**Why this fixes the bug**: The `@keydown.esc` Vue event listener on `<v-dialog>` is
attached to the rendered overlay container element. A keydown event on that element (or
any element inside the dialog) will bubble up and trigger the handler regardless of
where focus is — on the amount input, on the overlay itself, or anywhere within.

**Alternative considered — refocus the form after wobble**: Listen for `@after-leave` or
a custom event to move focus back to the first input. Rejected: fragile, depends on
internal Vuetify animation lifecycle, and requires knowing which input to focus per
form.

**Alternative considered — document-level keydown watcher**: Add a `useEventListener`
composable on `document` while a dialog is open. Rejected: more invasive, needs
explicit lifecycle management to add/remove, and is global state vs. a local template
binding.

**Does `@keydown.esc` on `v-dialog` work in Vuetify 3 persistent mode?**
Vuetify's `persistent` handler adds its own keydown listener on the overlay DOM node
but does not call `stopPropagation()`, so the event continues to bubble. A Vue
`@keydown.esc` binding on the `<v-dialog>` component will receive the event.

## Risks / Trade-offs

- **Accidental Escape while typing** → The same risk already exists when focus is in
  the form (Escape currently closes it immediately). Accepted.
- **Escape captured by inner dropdowns (e.g. autocomplete)** → Those components
  typically call `stopPropagation()` on Escape to close their own overlay first; the
  dialog handler only fires if the event reaches the dialog overlay.
