## 1. Refactor TransactionFilterBar

- [x] 1.1 Remove the `v-card` wrapper, `.filter-header` div, chevron icon, and `isExpanded` internal ref from `TransactionFilterBar.vue`
- [x] 1.2 Add a `modelValue` boolean prop to `TransactionFilterBar` to control panel visibility (replacing internal `isExpanded`)
- [x] 1.3 Wrap the existing panel content in `v-expand-transition` + `v-show="modelValue"` (keeping the inner grid and Apply/Clear buttons unchanged)
- [x] 1.4 Remove the `.filter-header` and `.cursor-pointer` CSS rules from the component's `<style scoped>` block

## 2. Add Filter Button to Transactions Page Header

- [x] 2.1 Add a `showFilter` ref (`ref<boolean>(false)`) to `Transactions.vue`
- [x] 2.2 Add a desktop Filter button (`d-none d-md-flex`) before the Add Transaction button, using `mdi-filter-variant` icon and "Filter" label, toggling `showFilter`
- [x] 2.3 Add a mobile Filter button (`d-flex d-md-none`) with icon-only style, `size="large"`, and `aria-label="Filter"`, also toggling `showFilter`
- [x] 2.4 Wrap both Filter buttons in `v-badge` with `dot` prop and `:model-value="transactionFilters.hasAppliedFilters.value"` to show the active-filter indicator
- [x] 2.5 Update the `TransactionFilterBar` usage in the template: pass `v-model="showFilter"` and remove the wrapping `<TransactionFilterBar>` card spacing (the component no longer provides its own `mb-4`)

## Constitution Compliance

- **Vue 3 + Vuetify**: All changes use Vue 3 Composition API (`ref`) and Vuetify components (`v-btn`, `v-badge`, `v-expand-transition`). Compliant.
- **TypeScript strict mode**: `showFilter` is typed as `ref<boolean>`. `modelValue` prop typed as `boolean`. Compliant.
- **Mobile-first / PWA**: Responsive dual-button pattern (`d-none d-md-flex` / `d-flex d-md-none`) is applied to the Filter button, consistent with existing buttons. Compliant.
- **No backend changes**: Pure frontend UI refactor with no API or GraphQL changes. Compliant.
