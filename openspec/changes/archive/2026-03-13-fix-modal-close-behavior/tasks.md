## 1. Fix Escape Key Handling in Transactions.vue

- [x] 1.1 Add `@keydown.esc="handleTransactionFormCancel"` to the Create Transaction `<v-dialog>` in `Transactions.vue`
- [x] 1.2 Add `@keydown.esc="handleTransactionFormCancel"` to the Edit Transaction `<v-dialog>` in `Transactions.vue`
- [x] 1.3 Add `@keydown.esc="handleTransactionFormCancel"` to the Create Transfer `<v-dialog>` in `Transactions.vue`
- [x] 1.4 Add `@keydown.esc="handleTransactionFormCancel"` to the Edit Transfer `<v-dialog>` in `Transactions.vue`

## 2. Fix Escape Key Handling in Accounts.vue

- [x] 2.1 Add `@keydown.esc="handleAccountCancel"` to the Add Account `<v-dialog>` in `Accounts.vue`
- [x] 2.2 Add `@keydown.esc="handleAccountCancel"` to the Edit Account `<v-dialog>` in `Accounts.vue`

## 3. Fix Escape Key Handling in Categories.vue

- [x] 3.1 Add `@keydown.esc="handleCategoryCancel"` to the Add Category `<v-dialog>` in `Categories.vue`
- [x] 3.2 Add `@keydown.esc="handleCategoryCancel"` to the Edit Category `<v-dialog>` in `Categories.vue`

## 4. Verify

- [ ] 4.1 Open a transaction dialog, press Escape — dialog closes
- [ ] 4.2 Open a transaction dialog, click outside (wobble plays), press Escape — dialog closes
- [ ] 4.3 Open a transfer dialog, click outside (wobble plays), press Escape — dialog closes
- [ ] 4.4 Open an account dialog, click outside (wobble plays), press Escape — dialog closes
- [ ] 4.5 Open a category dialog, click outside (wobble plays), press Escape — dialog closes
- [ ] 4.6 Click outside in all dialog variants — wobble plays, dialog stays open
- [ ] 4.7 Cancel button still closes all dialogs
