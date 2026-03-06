# Research: Textbox-Button Component Implementation

**Date**: 2026-03-06 | **Status**: Phase 0 Complete

## Research Topics

### 1. Vue 3 Textarea Auto-Growing Pattern

**Decision**: Use Vuetify `VTextarea` component with `auto-grow` and `max-rows="4"` props for built-in auto-expanding behavior.

**Rationale**:
- Vuetify's VTextarea provides native auto-grow support with no manual computation needed
- `max-rows="4"` constraint is enforced by the framework
- Constitutional requirement: "Prefer framework components" — leverage Vuetify features
- Simpler, cleaner code with no height calculation overhead
- Existing Insight.vue already uses this pattern, ensuring consistency

**Alternatives Considered**:
- Manual scrollHeight computation with native textarea — unnecessary complexity
- External auto-grow library — adds dependency weight, redundant with framework
- **Selected**: Vuetify `VTextarea` with `auto-grow` + `max-rows` (framework-native, proven pattern)

**Implementation Pattern**:
```vue
<v-textarea
  v-model="text"
  auto-grow
  max-rows="4"
  :disabled="loading"
  :placeholder="placeholder"
  :aria-label="ariaLabel"
/>
```

### 2. Vue 3 Event Handling: Enter Key vs. Newline

**Decision**: Prevent Enter key default behavior to block newline insertion; emit submit event instead.

**Rationale**:
- Requirement FR-004: "Pressing Enter submits the form; it does not insert a newline"
- Vue 3 event modifiers (`@keydown.enter.prevent`) provide clean syntax
- Clear separation between submit action and content modification

**Implementation Pattern**:
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    emits('submit', text.value)
    // Caller handles clearing after submission
  }
}
```

### 3. Vuetify Icon Components & Accessibility

**Decision**: Use Vuetify `VIcon` for send/clear icons, with descriptive `aria-label` on parent button. Use `VBtn` with icon prop for consistent styling.

**Rationale**:
- Constitutional requirement: "Prefer framework components" — use Vuetify VBtn and VIcon
- VBtn handles focus, ripple, and accessibility defaults
- Requirement FR-012: Component must have descriptive aria-labels

**Implementation Pattern**:
```vue
<v-btn
  :aria-label="submitAriaLabel"
  @click="emits('submit', text)"
  icon
>
  <v-icon icon="mdi-send" />
</v-btn>

<v-btn
  v-if="text"
  :aria-label="clearAriaLabel"
  @click="clearInput"
  icon
  size="small"
>
  <v-icon icon="mdi-close" />
</v-btn>
```

### 4. Component Props & Emits Pattern

**Decision**: Use TypeScript `type Props` with `defineProps`, and `emits()` with typed event definitions for full type safety.

**Rationale**:
- Vue 3 `<script setup>` with TypeScript provides compile-time type checking
- Constitutional requirement: "Avoid non-null assertions and type assertions"
- Prevents prop drilling and maintains parent control over submit behavior

**Implementation Pattern**:
```typescript
interface Props {
  modelValue: string
  placeholder?: string
  loading?: boolean
  submitAriaLabel: string
  clearAriaLabel: string
}

const emits = defineEmits<{
  submit: [value: string]
  'update:modelValue': [value: string]
}>()
```

### 5. Loading State & Disabled Input Pattern

**Decision**: When `loading` prop is true, disable textarea with `disabled` attribute and show spinner in submit button.

**Rationale**:
- Requirement FR-010: "Component accepts loading state that shows spinner and disables text input"
- Native HTML disabled attribute prevents all interactions
- Vuetify VBtn `:loading` prop shows spinner automatically

**Implementation Pattern**:
```vue
<v-textarea
  :disabled="loading"
  :model-value="modelValue"
  @update:model-value="emits('update:modelValue', $event)"
/>

<v-btn
  :loading="loading"
  :disabled="!text"
  @click="emits('submit', text)"
/>
```

### 6. Focus Management: Post-Clear Behavior

**Decision**: After clearing input via clear button, return focus to textarea so user can continue typing without mouse movement.

**Rationale**:
- Requirement edge case: "Focus should remain on the input after clearing"
- Improves UX for keyboard users
- Avoids focus loss that could confuse users

**Implementation Pattern**:
```typescript
const clearInput = () => {
  emits('update:modelValue', '')
  nextTick(() => {
    textareaRef.value?.focus()
  })
}
```

### 7. Jest Testing Strategy for Vue 3 Component

**Decision**: Test component in isolation using `@vue/test-utils` with `flushPromises` for async behavior. Mock parent callbacks.

**Rationale**:
- Constitutional requirement: Component tests required for complex/critical components
- Mock props and emits to isolate component logic
- No GraphQL integration needed for unit tests

**Test Categories**:
1. **Props & Rendering**: Component renders with correct props and defaults
2. **User Interaction**: Click events, keyboard input, focus management
3. **State Management**: Text updates, height calculations, loading state
4. **Accessibility**: aria-labels present, keyboard shortcuts functional

**Implementation Pattern**:
```typescript
const wrapper = mount(TextboxButtonInput, {
  props: {
    modelValue: '',
    submitAriaLabel: 'Submit',
    clearAriaLabel: 'Clear',
  },
})

expect(wrapper.find('textarea').exists()).toBe(true)
await wrapper.find('textarea').setValue('test')
expect(wrapper.emitted('update:modelValue')).toBeTruthy()
```

### 8. Page Integration: InsightPage & TransactionsPage Refactoring

**Decision**: Both pages use identical component in `<v-footer app>` layout. No changes to submit handlers or parent logic — only UI refactoring.

**Rationale**:
- Requirement FR-007, FR-008, FR-009: Consistency across pages
- Requirement SC-001: Single component, no bespoke patterns
- Handlers already exist in page components; component is presentation-only

**Integration Points**:
- InsightPage: Replace `.input-area` div with component, pass `modelValue` and `loading` props
- TransactionsPage: Replace text-input-with-button pattern with component
- Both: Maintain existing submit handler logic (parent concerns)

---

## Decisions Summary

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Textarea Growth | Native textarea + computed height | Control over max-height, no library dependency |
| Enter Key | Prevent default, emit submit | Requirement: no newline on Enter |
| Icons | Vuetify VIcon/VBtn | Consistency with framework components |
| Props Pattern | TypeScript defineProps | Type safety per constitution |
| Loading State | `:disabled` + `:loading` props | Clear disabled UI feedback |
| Focus After Clear | `nextTick()` + `.focus()` | UX improvement for keyboard users |
| Testing | Jest + @vue/test-utils | Per test strategy; co-located .test.ts |
| Page Integration | Replace inline UI with component | No handler changes, presentation refactor |

---

## Unknowns Resolved

✅ Vue 3 textarea auto-grow pattern → Established via scrollHeight computation
✅ Vuetify best practices for this use case → Prefer VBtn, VIcon, VTextarea where appropriate
✅ Jest testing patterns for Vue 3 → @vue/test-utils with component isolation
✅ Focus management in Vue 3 → nextTick() + ref.focus() pattern
✅ Accessibility requirements → aria-label attributes on interactive elements

No blocking unknowns remain. Phase 0 research complete.
