# Research: Reusable Textbox-Button Input Component

**Phase**: 0 — Pre-design research
**Branch**: `031-textbox-button-component`
**Date**: 2026-03-06

All patterns below are resolved by reading existing code in the repository. No external research required.

---

## 1. Textarea Pattern

**Decision**: Use `v-textarea` with `auto-grow`, `rows="1"`, `max-rows="4"`, and `#append-inner` slot for the clear icon — exactly as currently implemented in `Insight.vue`.

**Rationale**: The pattern is already proven in production. The `append-inner` slot places the clear icon inside the input border, which is the desired UX (icon visually part of the textarea).

**Source**: `frontend/src/views/Insight.vue` lines 68–89

```html
<v-textarea
  v-model="question"
  placeholder="Ask about your spending..."
  variant="outlined"
  density="compact"
  auto-grow
  rows="1"
  max-rows="4"
  hide-details
  :disabled="insightLoading"
  @keydown.enter.exact.prevent="handleAskQuestion"
>
  <template #append-inner>
    <v-icon
      v-if="question.trim()"
      icon="mdi-close-circle"
      size="small"
      class="cursor-pointer"
      @click="question = ''"
    />
  </template>
</v-textarea>
```

**Alternatives considered**: `v-text-field` (single-line, no auto-grow, already used on Transactions page) — rejected because it cannot grow to multiple rows.

---

## 2. Submit Button Pattern

**Decision**: Use `v-btn` with `icon="mdi-send"`, `color="primary"`, `:loading` and `:disabled` bindings — the send icon button currently on Insight page. Both pages will use this pattern in the unified component.

**Rationale**: The send icon clearly communicates "submit this input". The existing Transactions page footer used a text "Add" button, which is replaced by the icon button for visual consistency across both pages.

**Source**: `frontend/src/views/Insight.vue` lines 90–96

```html
<v-btn
  icon="mdi-send"
  color="primary"
  :loading="insightLoading"
  :disabled="insightLoading || !question.trim()"
  @click="handleAskQuestion"
/>
```

**Alternatives considered**: Text button with label (current Transactions page pattern) — rejected per spec FR-011 (send icon required on both pages).

---

## 3. Footer Layout

**Decision**: Use `<v-footer app elevation="4" class="pa-3 pa-sm-4">` — the native app footer already used by Transactions page. The Insight page's current `.input-area` div will be removed and replaced with this footer.

**Rationale**: `v-footer app` is a Vuetify layout component that pins to the bottom of the viewport, stretches full width, and integrates with the router-view content area (which adjusts its padding automatically). `elevation="4"` provides visual separation from content.

**Source**: `frontend/src/views/Transactions.vue` line 180

```html
<v-footer app elevation="4" class="pa-3 pa-sm-4">
```

**Impact on Insight page**: The `.insight-container` styles (`height: calc(100vh - 64px)`) and `.input-area` styles (border-top, padding) will be removed. Content scrolling in the answer area will need to remain, but the footer positioning is handled by Vuetify's layout system.

**Alternatives considered**: Keeping the Insight page's current inline `.input-area` div — rejected per spec FR-007 and user clarification.

---

## 4. Component Interface (Vue 3 Props/Emits)

**Decision**: The `TextboxButtonInput` component uses `v-model` for the text value and emits a `submit` event. No internal submission logic — parent page handles submission.

**Props**:
| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `modelValue` | `string` | required | v-model binding for textarea content |
| `loading` | `boolean` | `false` | Shows spinner on submit btn, disables input |
| `placeholder` | `string` | `''` | Textarea placeholder text |
| `inputAriaLabel` | `string` | `''` | aria-label on the textarea |
| `submitAriaLabel` | `string` | `''` | aria-label on the submit button |

**Emits**:
| Event | Payload | Trigger |
|-------|---------|---------|
| `update:modelValue` | `string` | Any keystroke (v-model) |
| `submit` | none | Enter key or send button click |

**Rationale**: Keeping submission logic in the parent preserves each page's independent business logic (Insight: `handleAskQuestion`; Transactions: `handleCreateTransactionFromText`). The component is purely presentational with controlled input.

**Alternatives considered**: Accepting a submit callback prop — rejected in favour of standard Vue emit pattern.

---

## 5. Insight Page Layout Adjustment

**Decision**: Remove the wrapping `v-container` + flex-column structure from Insight page. The answer area becomes a standalone scrollable `v-container`. The period selector chips and custom date inputs stay inside the `v-footer` above the `TextboxButtonInput`, as they are currently.

**Rationale**: When `v-footer app` is used, Vuetify automatically adjusts the main content area's bottom padding so content is not obscured by the footer. The existing `height: calc(100vh - 64px)` hack becomes unnecessary.

**Source observation**: Transactions page uses a plain `<v-container class="pa-3 pa-sm-6">` for its content, while the footer lives outside as a sibling. Insight page must adopt the same structure.

---

## Summary: All NEEDS CLARIFICATION Resolved

| Unknown | Resolution |
|---------|-----------|
| Textarea component source | Insight.vue `v-textarea` with `#append-inner` clear icon |
| Submit button style | Send icon button (`mdi-send`) from Insight page; applied to both pages |
| Footer layout source | Transactions.vue `<v-footer app elevation="4">` |
| Component interface pattern | Vue 3 `v-model` + `submit` emit |
| Insight layout restructuring | Remove flex-column wrapper; rely on Vuetify layout system |
| No backend/API changes needed | Confirmed — purely frontend refactor |
