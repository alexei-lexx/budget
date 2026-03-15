## 1. Implementation

- [x] 1.1 In `Transactions.vue`, destructure `mobile` from the existing `useDisplay()` call (alongside `xs`)
- [x] 1.2 Wrap the `createTransactionFromTextInputRef.value?.focus()` call with `if (!mobile.value)` guard

## 2. Spec Update

- [x] 2.1 Update `openspec/specs/transactions/spec.md` — replace the "Focus Restored After Natural Language Transaction Creation" requirement with the desktop-only version (two scenarios: focus on desktop, no focus on mobile)
