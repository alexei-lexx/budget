## Context

After a successful natural language transaction creation, `handleCreateTransactionFromText` in `Transactions.vue` calls `createTransactionFromTextSubmit()`, which clears the textarea value via the `createTransactionFromTextQuestion` v-model. Vue then re-renders, but browser focus is not programmatically returned to the textarea, so it is lost.

The text input is rendered by `TextboxButtonInput.vue`, which wraps a Vuetify `v-textarea`. The component currently has no way for the parent to programmatically focus it.

## Goals / Non-Goals

**Goals:**

- Return focus to the natural language text input immediately after a transaction is successfully created
- Keep the change minimal and localised to the frontend

**Non-Goals:**

- Changing focus behaviour on error (focus is already retained because the input is not cleared on error)
- Any backend, GraphQL schema, or infrastructure changes

## Decisions

### Expose a `focus()` method from `TextboxButtonInput`

Add a template ref to the inner `v-textarea` in `TextboxButtonInput.vue` and expose a `focus()` method via `defineExpose`. The parent (`Transactions.vue`) holds a ref to the component and calls `focus()` after a successful creation.

**Alternatives considered:**

- **Emit a `focused` event / callback prop**: More ceremony than necessary; `defineExpose` is the idiomatic Vue 3 pattern for imperative actions on child components.
- **Move focus logic into the composable**: The composable has no knowledge of DOM elements; coupling it to a DOM ref would violate separation of concerns.
- **Use `nextTick` + `document.querySelector`**: Fragile, bypasses component encapsulation.

## Risks / Trade-offs

- [Vuetify internal structure may change] `v-textarea` exposes a `.focus()` method as part of its public API and is stable. → Low risk; this is documented Vuetify behaviour.
- [Focus call timing] The input value is cleared reactively; calling `focus()` before the next tick could conflict with re-render. → Wrap the `focus()` call in `nextTick` inside `handleCreateTransactionFromText` to ensure the DOM is settled first.
