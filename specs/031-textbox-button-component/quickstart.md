# Quickstart: TextboxButtonInput Component

**Feature**: `031-textbox-button-component`
**File**: `frontend/src/components/common/TextboxButtonInput.vue`

---

## Component Interface

```typescript
// Props
interface Props {
  modelValue: string;       // v-model — controlled textarea value
  loading?: boolean;        // shows spinner on submit btn, disables input (default: false)
  placeholder?: string;     // textarea placeholder text (default: '')
  inputAriaLabel?: string;  // aria-label for the textarea (default: '')
  submitAriaLabel?: string; // aria-label for the submit button (default: '')
}

// Emits
emit('update:modelValue', value: string)  // on every keystroke (v-model)
emit('submit')                            // on Enter key or send button click
```

---

## Usage

### Insight Page

```html
<TextboxButtonInput
  v-model="question"
  :loading="insightLoading"
  placeholder="Ask about your spending..."
  input-aria-label="Ask a question"
  submit-aria-label="Submit question"
  @submit="handleAskQuestion"
/>
```

### Transactions Page

```html
<TextboxButtonInput
  v-model="createTransactionFromTextQuestion"
  :loading="createTransactionFromTextLoading"
  placeholder="e.g., morning coffee 4.5 euro"
  input-aria-label="Create transaction"
  submit-aria-label="Add transaction"
  @submit="handleCreateTransactionFromText"
/>
```

---

## Footer Layout (both pages)

The component is always rendered inside a `<v-footer app>`:

```html
<!-- Placed outside the main v-container, as a sibling -->
<v-footer app elevation="4" class="pa-3 pa-sm-4">
  <!-- Optional: page-specific controls above the input (e.g., date chips on Insight page) -->
  <TextboxButtonInput ... />
</v-footer>
```

---

## Behaviour Reference

| Input state | Clear icon | Submit button |
|-------------|-----------|---------------|
| Empty | Hidden | Disabled |
| Has text | Visible (click to clear) | Enabled |
| Loading | N/A | Spinner, input disabled |

- **Enter key**: submits (same as clicking send button). Does not insert newline.
- **Clear icon click**: clears input; focus remains on textarea.
- **Textarea height**: starts at 1 row, grows to max 4 rows, then scrolls internally.

---

## Component Implementation Sketch

```html
<template>
  <div class="d-flex ga-2 align-end">
    <v-textarea
      :model-value="modelValue"
      :placeholder="placeholder"
      :disabled="loading"
      :aria-label="inputAriaLabel"
      variant="outlined"
      density="compact"
      auto-grow
      rows="1"
      max-rows="4"
      hide-details
      class="flex-grow-1"
      @update:model-value="$emit('update:modelValue', $event)"
      @keydown.enter.exact.prevent="$emit('submit')"
    >
      <template #append-inner>
        <v-icon
          v-if="modelValue.trim()"
          icon="mdi-close-circle"
          size="small"
          class="cursor-pointer"
          @click="$emit('update:modelValue', '')"
        />
      </template>
    </v-textarea>
    <v-btn
      icon="mdi-send"
      color="primary"
      :loading="loading"
      :disabled="loading || !modelValue.trim()"
      :aria-label="submitAriaLabel"
      @click="$emit('submit')"
    />
  </div>
</template>
```
