# Quickstart: Textbox-Button Component Implementation

**Phase**: 1 (Design & Contracts) | **Date**: 2026-03-06

## Quick Overview

You are building a reusable Vue 3 component called `TextboxButtonInput` that:
- Combines a textarea with auto-growing height (1–4 rows)
- Includes a clear button (hidden when empty)
- Includes a submit button with send icon
- Supports submission via Enter key or button click
- Shows a loading spinner during submission
- Requires descriptive aria-labels for accessibility

The component is **presentational** — it handles UI interactions and emits events. Parent pages handle the actual business logic.

---

## File Structure

```
frontend/src/components/
├── TextboxButtonInput.vue           # NEW: Component implementation
└── TextboxButtonInput.test.ts       # NEW: Component tests
```

---

## Minimal Example (Parent Page Usage)

```vue
<template>
  <v-footer app>
    <TextboxButtonInput
      v-model="text"
      placeholder="Type here..."
      :loading="isLoading"
      submit-aria-label="Submit"
      clear-aria-label="Clear"
      @submit="handleSubmit"
    />
  </v-footer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TextboxButtonInput from '@/components/TextboxButtonInput.vue'

const text = ref('')
const isLoading = ref(false)

const handleSubmit = async (value: string) => {
  isLoading.value = true
  try {
    // Do something with the text
    console.log('Submitted:', value)
    text.value = '' // Clear after submission if desired
  } finally {
    isLoading.value = false
  }
}
</script>
```

---

## Component Props

| Prop | Type | Required | Purpose |
|------|------|----------|---------|
| `modelValue` | `string` | ✓ | The textarea content (v-model) |
| `placeholder` | `string` | — | Placeholder text |
| `loading` | `boolean` | — | Disable input & show spinner |
| `submitAriaLabel` | `string` | ✓ | Screen reader label for submit |
| `clearAriaLabel` | `string` | ✓ | Screen reader label for clear |

---

## Component Events

| Event | Payload | When |
|-------|---------|------|
| `update:modelValue` | `string` | Text changes in textarea |
| `submit` | `string` | User clicks submit or presses Enter |

---

## Key Behaviors

### Textarea Auto-Growth
- Starts at 1 row (~36px)
- Grows automatically as user types (Vuetify handles this)
- Caps at 4 rows (~144px)
- Beyond 4 rows: internal scroll (no impact on page layout)
- Uses Vuetify's `auto-grow` and `max-rows="4"` props

### Clear Button
- Only visible when textarea has text
- Click clears the textarea
- Focus returns to textarea after clearing

### Submit Button
- Disabled when textarea is empty
- Disabled when `loading` is true
- Shows spinner when `loading` is true
- Triggers submit on click or when user presses Enter

### Keyboard Shortcuts
- **Enter** → Submit (no newline inserted)
- **Shift+Enter** → Currently same as Enter (no special handling)

---

## Implementation Steps (for reference)

1. **Create component** at `frontend/src/components/TextboxButtonInput.vue`
2. **Create tests** at `frontend/src/components/TextboxButtonInput.test.ts`
3. **Refactor InsightPage** to use the component in a `<v-footer app>` layout
4. **Refactor TransactionsPage** to use the component in its existing `<v-footer app>` layout
5. **Run tests** to verify functionality
6. **Manual testing** on both pages to ensure consistency

---

## Testing Checklist

```typescript
// Component tests should cover:
✓ Renders with all required props
✓ Textarea text updates on input
✓ Clear button visible/hidden based on text
✓ Clear button clears text and returns focus
✓ Submit button disabled when text is empty
✓ Submit button emits 'submit' event on click
✓ Enter key emits 'submit' event (no newline)
✓ Loading state disables textarea and shows spinner
✓ Aria-labels present on all interactive elements
✓ Textarea height grows to 4 rows max
```

---

## Integration Pattern for Both Pages

### Before (Current)
```vue
<!-- InsightPage: custom .input-area div with textarea -->
<div class="input-area">
  <v-textarea auto-grow max-rows="4"></v-textarea>
  <v-btn icon="mdi-send"></v-btn>
</div>

<!-- TransactionsPage: v-footer with v-text-field (single-line) -->
<v-footer app elevation="4" class="pa-3 pa-sm-4">
  <v-text-field placeholder="e.g., morning coffee 4.5 euro" />
  <v-btn>Add</v-btn>
</v-footer>
```

### After (With Component)
```vue
<!-- Both pages: unified TextboxButtonInput in v-footer app -->
<v-footer app elevation="4" class="pa-3 pa-sm-4">
  <TextboxButtonInput
    v-model="text"
    :loading="isLoading"
    submit-aria-label="..."
    clear-aria-label="..."
    @submit="handleSubmit"
  />
</v-footer>
```

**Footer with `app` attribute** ensures:
- Fixed position at bottom of viewport
- No overlap with page content
- Auto-grow textarea expands upward naturally within the fixed footer
- Elevation provides visual separation
- Responsive padding (`pa-3 pa-sm-4`) adjusts for screen size

---

## Vuetify Components Used

- **VFooter** — App footer container (`app` attribute makes it persistent)
- **VTextarea** — Textarea with Vuetify styling
- **VBtn** — Button component for clear & submit
- **VIcon** — Icon display (mdi-close, mdi-send)

---

## No GraphQL/API Changes

This component does not:
- Make GraphQL queries or mutations
- Interact with Apollo Client
- Depend on backend schema changes

Parent pages remain responsible for all API interactions via their existing submit handlers.

---

## Debugging Tips

**Textarea not growing?**
- Verify `auto-grow` prop is set on VTextarea
- Verify `max-rows="4"` is set on VTextarea

**Clear button not returning focus?**
- Check `nextTick()` is called before `ref.focus()`
- Verify `textareaRef` is properly bound

**Enter key not submitting?**
- Verify `@keydown.enter.prevent` is on textarea
- Check parent is listening to `@submit` event

**Loading spinner not showing?**
- Ensure parent passes `:loading="true"` to component
- Check parent actually sets loading state

---

## Next Steps

1. Implement `TextboxButtonInput.vue` following research.md patterns
2. Write comprehensive tests in `TextboxButtonInput.test.ts`
3. Integrate into InsightPage and TransactionsPage
4. Run full frontend test suite: `npm test` (from `frontend/`)
5. Test manually on both pages to verify consistency
6. Run typecheck and linting: `npm run typecheck && npm run format`
