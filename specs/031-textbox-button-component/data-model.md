# Data Model & Component Design: TextboxButtonInput Component

**Phase**: 1 (Design & Contracts) | **Date**: 2026-03-06

## Component Structure

### TextboxButtonInput Component

**File Location**: `frontend/src/components/TextboxButtonInput.vue`

**Purpose**: Unified reusable input component combining a textarea with auto-growing height, clear button, and submit button.

**Component Hierarchy**:
```
TextboxButtonInput
├── Textarea (native <textarea> wrapped in Vuetify styling)
├── Clear Icon Button (VBtn + VIcon)
└── Submit Icon Button (VBtn + VIcon)
```

---

## Component Interface

### Props

```typescript
interface Props {
  /**
   * The text value of the textarea (v-model binding)
   * @required
   */
  modelValue: string

  /**
   * Placeholder text shown when textarea is empty
   * @optional
   * @default ''
   */
  placeholder?: string

  /**
   * Loading state - when true, disables input and shows spinner on submit button
   * @optional
   * @default false
   */
  loading?: boolean

  /**
   * Aria label for the textarea input
   * Provides screen reader context (e.g., "Ask a question")
   * @required
   */
  submitAriaLabel: string

  /**
   * Aria label for the clear button
   * Provides screen reader context (e.g., "Clear question")
   * @required
   */
  clearAriaLabel: string
}
```

### Events (Emits)

```typescript
emits<{
  /**
   * Fired when textarea content changes (v-model update)
   * @event update:modelValue
   */
  'update:modelValue': [value: string]

  /**
   * Fired when user submits via Enter key or submit button click
   * Includes the current textarea value
   * @event submit
   */
  submit: [value: string]
}>()
```

### Refs (Template Refs)

```typescript
// Internal reference to textarea element for height calculation and focus
const textareaRef = ref<HTMLTextAreaElement | null>(null)
```

---

## Behavioral Specification

### Textarea Auto-Growth

- **Minimum Height**: 1 row (~36px)
- **Maximum Height**: 4 rows (~144px)
- **Behavior**: Textarea grows as user types; stops at 4 rows with internal scroll
- **Implementation**: Vuetify `VTextarea` with `auto-grow` and `max-rows="4"` props
- **Update Triggers**: Input event, paste event, programmatic value changes (handled by Vuetify)

### Clear Button

- **Visibility**: Shown only when `modelValue` is non-empty
- **Action**: Clears textarea content (emits `update:modelValue` with empty string)
- **Focus**: Returns focus to textarea after clearing
- **Icon**: Vuetify close icon (`mdi-close`)

### Submit Button

- **Icon**: Vuetify send icon (`mdi-send`)
- **Disabled State**: When `modelValue` is empty or `loading` is true
- **Actions**:
  - Click: Emits `submit` event with current text
  - Enter key in textarea: Same as click (no newline inserted)
- **Loading State**: Shows spinner when `loading` prop is true

### Focus Management

- Clear button click → Focus returns to textarea
- Submit via Enter → Caller responsible for clearing value if desired
- Loading state → Textarea disabled (native browser behavior)

---

## State Management

### Component State

```typescript
// Reactive state
const text = computed<string>({
  get: () => props.modelValue,
  set: (value: string) => emits('update:modelValue', value)
})

// Clear button visibility
const showClear = computed(() => text.value.length > 0)

// Submit button disabled state
const isSubmitDisabled = computed(() => !text.value.trim() || props.loading)
```

### No Internal State

The component does NOT maintain internal state for:
- Form submission handlers (parent responsibility)
- Page-specific submit logic (parent responsibility)
- Clearing behavior after submission (parent responsibility)

**Rationale**: Component is presentational, ensuring parent control over business logic.

---

## Page Integration Model

### InsightPage Integration

Refactor from custom `.input-area` div to `<v-footer app>`:

```vue
<template>
  <v-footer app elevation="4" class="pa-3 pa-sm-4">
    <TextboxButtonInput
      v-model="query"
      placeholder="Ask a question..."
      :loading="loading"
      submit-aria-label="Submit question"
      clear-aria-label="Clear question"
      @submit="submitQuery"
    />
  </v-footer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TextboxButtonInput from '@/components/TextboxButtonInput.vue'

const query = ref('')
const loading = ref(false)

const submitQuery = async (text: string) => {
  loading.value = true
  try {
    // Call GraphQL mutation or service
    await insight.query(text)
    query.value = '' // Clear after successful submission
  } finally {
    loading.value = false
  }
}
</script>
```

### TransactionsPage Integration

Replace existing `v-text-field` with component (footer already exists):

```vue
<template>
  <v-footer app elevation="4" class="pa-3 pa-sm-4">
    <!-- BEFORE: <v-text-field v-model="..." /> -->
    <!-- AFTER: -->
    <TextboxButtonInput
      v-model="description"
      placeholder="e.g., morning coffee 4.5 euro"
      :loading="loading"
      submit-aria-label="Add transaction"
      clear-aria-label="Clear description"
      @submit="createTransaction"
    />
  </v-footer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TextboxButtonInput from '@/components/TextboxButtonInput.vue'

const description = ref('')
const loading = ref(false)

const createTransaction = async (text: string) => {
  loading.value = true
  try {
    // Call GraphQL mutation or service
    await transactions.create(text)
    description.value = '' // Clear after successful submission
  } finally {
    loading.value = false
  }
}
</script>
```

---

## CSS & Styling

### Vuetify Integration

- Component uses Vuetify `VBtn`, `VIcon`, and `VTextarea` for consistent theming
- No custom CSS — relies entirely on Vuetify defaults
- Mobile-first responsive design (Vuetify handles this automatically)

### Layout Structure

```vue
<div class="textbox-button-input">
  <v-textarea
    v-model="text"
    auto-grow
    max-rows="4"
    :disabled="loading"
  />
  <div class="action-buttons">
    <v-btn v-if="showClear" @click="clearInput" icon />
    <v-btn :disabled="isSubmitDisabled" :loading="loading" @click="submit" icon />
  </div>
</div>
```

---

## Testing Model

### Unit Tests Location

`frontend/src/components/TextboxButtonInput.test.ts`

### Test Categories

1. **Rendering** (Props validation)
   - Component renders with required props
   - Placeholder displays correctly
   - Initial state is empty

2. **Textarea Interaction**
   - Text input updates `modelValue` via emit
   - Height grows as text increases (up to 4 rows)
   - Height caps at 4 rows with internal scroll

3. **Clear Button**
   - Clear button hidden when input is empty
   - Clear button visible when input has text
   - Click clears input and returns focus

4. **Submit Button**
   - Submit button disabled when input is empty
   - Submit button enabled when input has text
   - Click emits `submit` event with text

5. **Keyboard Handling**
   - Enter key emits `submit` event
   - Enter key does NOT insert newline
   - Shift+Enter behavior (if allowed) handled correctly

6. **Loading State**
   - Textarea disabled when `loading` is true
   - Submit button shows spinner when `loading` is true
   - Submit button disabled when `loading` is true

7. **Accessibility**
   - Textarea has aria-label
   - Submit button has aria-label
   - Clear button has aria-label

---

## No Backend/API Changes Required

This component is **purely presentational** with no backend dependencies:
- ✅ No GraphQL schema changes
- ✅ No mutations or queries in component code
- ✅ No API contracts needed
- ✅ Parent pages handle all business logic and API calls

---

## Summary

| Aspect | Detail |
|--------|--------|
| **Type** | Vue 3 Presentational Component |
| **State** | Reactive props + computed properties (no internal state) |
| **Props** | 5 (modelValue, placeholder, loading, 2 aria-labels) |
| **Events** | 2 (update:modelValue, submit) |
| **Features** | Auto-grow textarea, clear button, submit button, keyboard shortcuts |
| **Testing** | Jest + @vue/test-utils, co-located .test.ts |
| **Integration** | InsightPage, TransactionsPage via v-footer |
| **CSS** | Vuetify components + minimal height calculations |
| **Accessibility** | Full aria-label support on all interactive elements |
