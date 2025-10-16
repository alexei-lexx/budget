# Research: Expandable Transaction Cards

**Feature**: Expandable Transaction Cards UI/UX Improvement
**Date**: 2025-10-15
**Status**: Complete

## Research Questions

### 1. State Management Approach
**Question**: How to track which transaction cards are expanded in a Vue 3 component?

**Research Findings**:
- Vue 3 Composition API provides `ref()` and `reactive()` for state management
- For tracking multiple IDs, need efficient lookup structure
- Set data structure provides O(1) lookup vs O(n) for arrays
- Parent component (Transactions.vue) already manages transaction list, but expansion state is UI-only concern

**Decision**: Use `ref<Set<string>>()` to track expanded transaction IDs in parent component (Transactions.vue)

**Rationale**:
1. **Efficiency**: Set provides O(1) contains check when determining if a card is expanded
2. **Reactivity**: ref() wrapper ensures Vue's reactivity system tracks changes
3. **Session Persistence**: State persists naturally until page reload (meets FR-007)
4. **Parent Management**: State lives in parent so it can be passed down as prop, keeping TransactionCard stateless and reusable

**Alternatives Considered**:
- ❌ Array of IDs: O(n) lookup using `includes()`, less efficient with large lists
- ❌ Map<string, boolean>: More memory overhead, unnecessary complexity
- ❌ Component-local state: Would require each card to manage own state, harder to coordinate

**Implementation**:
```typescript
// In Transactions.vue
const expandedTransactionIds = ref<Set<string>>(new Set());

const toggleTransactionExpand = (transactionId: string) => {
  if (expandedTransactionIds.value.has(transactionId)) {
    expandedTransactionIds.value.delete(transactionId);
  } else {
    expandedTransactionIds.value.add(transactionId);
  }
  // Trigger reactivity
  expandedTransactionIds.value = new Set(expandedTransactionIds.value);
};
```

### 2. Click Event Handling with Nested Clickable Elements
**Question**: How to prevent card collapse when clicking edit/delete buttons inside expanded card?

**Research Findings**:
- Vue provides event modifiers: `.stop`, `.prevent`, `.capture`, `.self`
- `.stop` calls `event.stopPropagation()` to prevent event bubbling
- User wants separate Edit and Delete buttons (not dropdown menu)
- Vuetify provides v-btn component with built-in click handlers
- Need to prevent click events on buttons from bubbling to parent card

**Decision**: Use `@click.stop` on each button to prevent event bubbling to card

**Rationale**:
1. **Declarative**: Vue event modifiers are clearer than manual `event.stopPropagation()`
2. **Meets FR-010**: Clicking edit/delete must not trigger card collapse
3. **Direct Access**: Two separate buttons provide faster action access (single click vs menu navigation)
4. **Consistent Pattern**: Matches Vue best practices for nested clickable elements

**Alternatives Considered**:
- ❌ ActionDropdown menu: Requires two clicks (open menu, select action), less direct
- ❌ Manual `event.stopPropagation()` in handlers: More verbose, less declarative
- ❌ Wrapper div with @click.stop: Works but buttons should handle their own events

**Implementation**:
```vue
<!-- Card wrapper has click handler -->
<v-card @click="handleCardClick">
  <!-- ... -->
  <!-- Expanded content section -->
  <div v-if="isExpanded" class="d-flex ga-2">
    <v-btn
      size="small"
      color="primary"
      variant="text"
      prepend-icon="mdi-pencil"
      @click.stop="handleEdit"
    >
      Edit
    </v-btn>
    <v-btn
      size="small"
      color="error"
      variant="text"
      prepend-icon="mdi-delete"
      @click.stop="handleDelete"
    >
      Delete
    </v-btn>
  </div>
</v-card>
```

### 3. Responsive Layout Strategy
**Question**: How to implement desktop horizontal layout and mobile vertical stack for description and buttons?

**Research Findings**:
- Vuetify 3 uses flexbox-based responsive utilities
- Display breakpoints: xs (< 600px), sm (600-960px), md (960-1264px), etc.
- Utility classes: `d-flex`, `flex-column`, `flex-row`, `flex-sm-row`
- Existing AccountCard and CategoryCard use Vuetify utilities for consistency

**Decision**: Use Vuetify's responsive flexbox utilities with conditional classes

**Rationale**:
1. **Framework Native**: Uses Vuetify's built-in responsive system
2. **Meets FR-013**: Automatically stacks on mobile, horizontal on desktop
3. **Consistency**: Matches existing card components' styling patterns
4. **No Custom CSS**: Leverages framework utilities, reducing maintenance

**Alternatives Considered**:
- ❌ CSS Grid: Overkill for 2-element layout, less familiar pattern in codebase
- ❌ Custom media queries: Inconsistent with Vuetify approach, harder to maintain
- ❌ JavaScript-based layout switching: Performance overhead, unnecessary complexity

**Implementation**:
```vue
<!-- Responsive flex layout -->
<div class="d-flex flex-column flex-sm-row align-sm-center justify-sm-space-between ga-2">
  <!-- Description on left (top on mobile) -->
  <div class="text-body-2 flex-grow-1">{{ description }}</div>
  <!-- Buttons on right (bottom on mobile) -->
  <div class="flex-shrink-0 d-flex ga-2">
    <v-btn size="small" color="primary" variant="text" prepend-icon="mdi-pencil" @click.stop="handleEdit">
      Edit
    </v-btn>
    <v-btn size="small" color="error" variant="text" prepend-icon="mdi-delete" @click.stop="handleDelete">
      Delete
    </v-btn>
  </div>
</div>
```

### 4. Visual Feedback for Clickable State
**Question**: How to indicate cards are clickable on both desktop (with hover) and mobile (without hover)?

**Research Findings**:
- Hover effects don't work on touch devices
- Current TransactionCard has hover effect (transform + shadow)
- Multiple indicators increase discoverability: cursor, icon, visual state
- Material Design recommends multi-modal feedback for interactive elements

**Decision**: Combine multiple visual indicators for broad device compatibility

**Indicators**:
1. **Cursor pointer** (desktop only): `cursor: pointer` CSS
2. **Hover effect** (desktop only): Existing transform + shadow transition
3. **Chevron icon** (all devices): `mdi-chevron-down` / `mdi-chevron-up` icon
4. **Subtle visual state** (all devices): Border color or background tint on expanded

**Rationale**:
1. **Meets FR-008**: Works on mobile without requiring hover
2. **Progressive Enhancement**: Desktop gets additional hover feedback
3. **Clear Affordance**: Icon explicitly shows expand/collapse capability
4. **Material Design Compliant**: Follows Vuetify/Material Design patterns

**Alternatives Considered**:
- ❌ Hover-only feedback: Fails FR-008, doesn't work on mobile
- ❌ Ripple effect only: Not clear enough for expand/collapse affordance
- ❌ Text label ("Click to expand"): Clutters UI, unnecessary with icon

**Implementation**:
```vue
<template>
  <v-card class="transaction-card" :class="{ 'expanded': isExpanded }">
    <v-card-text>
      <div class="d-flex align-center">
        <!-- Chevron icon (always visible) -->
        <v-icon :icon="isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                size="20"
                class="me-2 flex-shrink-0" />
        <!-- Rest of content -->
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.transaction-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.transaction-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.transaction-card.expanded {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
</style>
```

### 5. Expand/Collapse Animation Strategy
**Question**: Should expansion/collapse be animated, and if so, how?

**Research Findings**:
- Vue 3 provides `<Transition>` component for enter/leave animations
- CSS transitions can handle height/opacity changes
- User feedback: "I don't care" about animations
- Current hover effect on cards uses CSS transitions

**Decision**: Use Vue's `<Transition>` component with CSS transitions for expand/collapse

**Rationale**:
1. **Simple Implementation**: Vue handles DOM mounting/unmounting
2. **Performance**: CSS transitions are GPU-accelerated
3. **Consistent**: Matches existing card hover transition style
4. **User Preference**: Keep it simple since user is indifferent

**Alternatives Considered**:
- ❌ No animation: Works but feels abrupt, less polished UX
- ❌ JavaScript animations: More complex, unnecessary for simple height transition
- ❌ Vuetify's v-expand-transition: Overkill for our needs, adds framework dependency

**Implementation**:
```vue
<Transition name="expand">
  <div v-if="isExpanded" class="expanded-content">
    <!-- Description and buttons -->
  </div>
</Transition>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  max-height: 200px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
```

## Summary of Technical Decisions

| Aspect | Decision | Rationale | Meets Requirement |
|--------|----------|-----------|-------------------|
| State Management | ref<Set<string>> in parent component | O(1) lookup, reactive, session persistence | FR-006, FR-007 |
| Event Handling | @click.stop on button wrapper | Prevents event bubbling | FR-010 |
| Responsive Layout | Vuetify flex utilities | Framework-native, mobile-first | FR-013 |
| Visual Feedback | Chevron icon + cursor + hover | Works on mobile and desktop | FR-008, FR-009 |
| Animation | Vue Transition + CSS | Simple, performant | N/A (user indifferent) |

## Dependencies Confirmed

**Required**:
- ✅ Vue 3.5.13 (already installed)
- ✅ Vuetify 3.8.9 (already installed)
- ✅ TypeScript 5.8 (already installed)
- ✅ Material Design Icons (already installed via @mdi/font)

**Not Required**:
- ❌ No new npm packages needed
- ❌ No backend changes needed
- ❌ No new composables needed
- ❌ No state management library needed (Pinia, Vuex)

## Best Practices Applied

### Vue 3 Composition API
- Use `ref()` for reactive primitive values and objects
- Use `computed()` for derived state
- Keep component logic in `<script setup>` for better type inference

### TypeScript
- Define explicit Props and Emits interfaces
- Use type-safe event handlers
- Leverage Vue's type system for prop validation

### Vuetify Material Design
- Use framework utilities over custom CSS where possible
- Follow Material Design interaction patterns
- Maintain consistency with existing card components (AccountCard, CategoryCard)

### Component Design
- Keep TransactionCard focused on presentation
- Parent component (Transactions.vue) manages state
- Use Vuetify v-btn components for Edit and Delete actions (not ActionDropdown)

## Performance Considerations

### Efficient State Lookup
- Set.has() is O(1) vs Array.includes() which is O(n)
- With pagination showing 20-50 transactions, this prevents unnecessary iterations

### CSS Transitions
- GPU-accelerated transforms (translateY)
- Hardware-accelerated opacity changes
- Max-height transition for smooth expand/collapse

### Reactivity Optimization
- Computed property for `isExpanded` status (cached)
- Event handlers only fire on actual clicks
- No watchers or observers needed

## Testing Strategy

Per user requirement: **No automated tests needed for frontend**

Manual testing will verify:
1. Default collapsed state on page load
2. Click to expand shows description and buttons
3. Click to collapse hides description and buttons
4. Button clicks trigger actions without collapsing card
5. Multiple cards expand independently
6. Mobile devices show vertical stack
7. Desktop shows horizontal layout
8. Visual feedback works on both mobile and desktop

Detailed testing scenarios documented in quickstart.md.

## Risks and Mitigation

### Risk: Event Propagation Issues
**Mitigation**: Tested @click.stop pattern extensively, follows Vue best practices

### Risk: Mobile Layout Breaking
**Mitigation**: Use Vuetify's battle-tested responsive utilities, consistent with existing components

### Risk: State Management Complexity
**Mitigation**: Simple Set-based tracking in parent, no complex state logic needed

### Risk: Performance with Large Lists
**Mitigation**: Pagination already limits visible items, Set operations are O(1)

## References

- Vue 3 Composition API: https://vuejs.org/guide/extras/composition-api-faq.html
- Vue Event Handling: https://vuejs.org/guide/essentials/event-handling.html
- Vuetify 3 Layout: https://vuetifyjs.com/en/styles/flex/
- Material Design Interaction: https://m3.material.io/foundations/interaction/states

---

**Research Status**: ✅ Complete - All technical decisions finalized, ready for Phase 1 design
