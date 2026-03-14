## 1. Expose focus method from TextboxButtonInput

- [x] 1.1 Add a template ref to the `v-textarea` inside `TextboxButtonInput.vue`
- [x] 1.2 Use `defineExpose` to expose a `focus()` method that delegates to the textarea ref

## 2. Restore focus after successful creation in Transactions.vue

- [x] 2.1 Add a template ref pointing to the `TextboxButtonInput` component instance
- [x] 2.2 After `createTransactionFromTextSubmit()` returns a transaction, call `nextTick` then `focus()` on the input ref

## 3. Update spec

- [ ] 3.1 Archive this change to apply the delta spec to `openspec/specs/transactions/spec.md`
