# Phase 0: Research - Expandable Card Pattern

**Date**: 2025-10-17
**Feature**: Expandable Card UI Consistency

## Research Goals

1. Understand the expandable card pattern from TransactionCard.vue
2. Identify state management requirements for AccountsList and Categories views
3. Document component API contracts and prop requirements
4. Establish styling patterns for hover effects and transitions

## Key Findings

### 1. Expandable Card Pattern (from TransactionCard.vue)

**Decision**: Follow the exact pattern established in TransactionCard.vue

**Pattern Components**:

1. **Props Required**:
   - Component data (transaction/account/category)
   - Display data (accountName, categoryName, etc.)
   - `isExpanded: boolean` - controlled by parent

2. **Events Emitted**:
   - `toggleExpand: [id: string]` - emitted on card click
   - `editX: [id: string]` - emitted when edit button clicked
   - `deleteX: [id: string]` - emitted when delete button clicked

3. **Template Structure**:
   ```vue
   <v-card @click="handleCardClick" :class="{ expanded: isExpanded }">
     <!-- Collapsed view: always visible -->
     <div class="d-flex align-center">
       <!-- Main content -->
     </div>

     <!-- Expanded view: conditional with v-if -->
     <div v-if="isExpanded" class="d-flex mt-3 justify-end">
       <ActionButtons @edit="handleEdit" @delete="handleDelete" />
     </div>
   </v-card>
   ```

4. **Event Handling**:
   - Card click handler emits `toggleExpand` with item ID
   - Action button handlers use `@click.stop` to prevent event propagation
   - This ensures clicking edit/delete doesn't collapse the card

5. **Styling Pattern**:
   ```css
   .card {
     cursor: pointer;
     transition: transform 0.2s ease, box-shadow 0.2s ease;
   }
   .card:hover {
     transform: translateY(-2px);
     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
   }
   .card.expanded:hover {
     transform: none; /* Disable hover transform when expanded */
   }
   ```

**Rationale**: This pattern has been battle-tested with transaction cards and provides:
- Clear separation of concerns (parent manages state, child renders)
- Reliable event handling without propagation issues
- Smooth, non-conflicting animations
- Consistent user experience

**Alternatives Considered**:
- Internal state management in each card - Rejected: Would require syncing state when items change
- Accordion pattern (only one expanded at a time) - Rejected: Current pattern allows multiple expanded cards, which user may want
- Modal for actions instead of inline expansion - Rejected: Adds unnecessary clicks and breaks established pattern

### 2. Parent Component State Management

**Decision**: Use Vue ref with Record<string, boolean> for tracking expanded state

**Pattern**:
```typescript
// In AccountsList.vue or Categories.vue
const expandedCards = ref<Record<string, boolean>>({});

const toggleExpand = (id: string) => {
  expandedCards.value[id] = !expandedCards.value[id];
};

const isExpanded = (id: string): boolean => {
  return expandedCards.value[id] ?? false;
};
```

**Rationale**:
- Simple and efficient - O(1) lookups
- Reactive - Vue automatically tracks changes
- Memory efficient - only stores expanded cards (defaults to false)
- Matches the pattern used in Transactions.vue

**Alternatives Considered**:
- Array of expanded IDs - Rejected: O(n) lookups, more complex add/remove logic
- Set of expanded IDs - Rejected: Not reactive by default in Vue
- Individual refs per card - Rejected: Doesn't scale, complex management

### 3. ActionButtons Component Integration

**Decision**: Reuse existing ActionButtons.vue component without modifications

**Component API** (from ActionButtons.vue):
```typescript
interface Props {
  editLabel?: string;      // Default: "Edit"
  deleteLabel?: string;    // Default: "Delete"
  editIcon?: string;       // Default: "mdi-pencil"
  deleteIcon?: string;     // Default: "mdi-delete"
  size?: "x-small" | "small" | "default" | "large" | "x-large"; // Default: "small"
}

// Events
emit('edit')   // Emitted when edit button clicked
emit('delete') // Emitted when delete button clicked
```

**Usage Pattern**:
```vue
<ActionButtons
  @edit="handleEditAccount"
  @delete="handleDeleteAccount"
/>
```

**Rationale**:
- Component already has `@click.stop` on buttons to prevent event propagation
- Default styling and sizing work well for expanded cards
- No customization needed for this feature

**Alternatives Considered**:
- Create new button component - Rejected: Duplicates existing functionality
- Inline buttons without component - Rejected: Less maintainable, loses consistency

### 4. Component Modification Scope

**AccountCard.vue Modifications**:
- Add `isExpanded: boolean` prop
- Add `toggleExpand: [accountId: string]` event
- Replace ActionDropdown import with ActionButtons
- Add card click handler
- Wrap v-card with click handler and expanded class binding
- Move ActionDropdown to conditional expanded section with ActionButtons
- Update styles to disable hover transform when expanded

**CategoryCard.vue Modifications**:
- Add `isExpanded: boolean` prop
- Add `toggleExpand: [categoryId: string]` event
- Replace ActionDropdown import with ActionButtons
- Add card click handler
- Wrap v-card with click handler and expanded class binding
- Move ActionDropdown to conditional expanded section with ActionButtons
- Update styles to disable hover transform when expanded

**AccountsList.vue Modifications**:
- Add `expandedCards` ref with Record<string, boolean>
- Add `toggleExpand(id: string)` method
- Add `isExpanded(id: string)` computed helper
- Pass `isExpanded` prop to AccountCard
- Handle `toggleExpand` event from AccountCard

**Categories.vue Modifications**:
- Add `expandedCards` ref with Record<string, boolean>
- Add `toggleExpand(id: string)` method
- Add `isExpanded(id: string)` computed helper
- Pass `isExpanded` prop to CategoryCard
- Handle `toggleExpand` event from CategoryCard

### 5. Transition and Animation Considerations

**Decision**: Use CSS transitions only, no Vue transitions

**Rationale**:
- TransactionCard uses CSS transitions for smooth hover effects
- Vue transitions add complexity without significant benefit for this use case
- CSS transitions are more performant for simple show/hide
- Keeps implementation simple and maintainable

**Animation Specs**:
- Hover elevation: `transform: translateY(-2px)` with 0.2s ease
- Shadow transition: 0.2s ease
- Disable transform when expanded to prevent jarring effect when buttons appear

**Alternatives Considered**:
- Vue transition components - Rejected: Overkill for simple show/hide
- Animated expand/collapse with height transitions - Rejected: Current pattern doesn't animate expansion, keeps it instant
- Spring animations - Rejected: Adds library dependency for minimal benefit

### 6. Testing Strategy

**Decision**: Manual testing with documented test scenarios

**Test Scenarios** (documented in quickstart.md):
1. Verify cards start collapsed
2. Verify clicking card expands it and shows action buttons
3. Verify clicking expanded card collapses it
4. Verify clicking edit button opens edit dialog without collapsing
5. Verify clicking delete button opens delete dialog without collapsing
6. Verify hover effects work on collapsed cards
7. Verify hover effects disabled on expanded cards
8. Verify multiple cards can be expanded simultaneously
9. Verify ActionDropdown no longer present in UI

**Rationale**:
- Project has no automated test infrastructure currently
- Manual testing is consistent with existing development workflow
- Clear test scenarios ensure comprehensive coverage
- Visual testing is appropriate for UI consistency feature

**Alternatives Considered**:
- Add Vitest and component tests - Rejected: Out of scope, would require project setup
- E2E tests with Playwright - Rejected: No existing E2E infrastructure
- Visual regression tests - Rejected: Requires tooling not currently in project

## Research Summary

All technical unknowns have been resolved through analysis of the existing TransactionCard implementation. The pattern is well-established and can be directly applied to AccountCard and CategoryCard components with minimal modifications. No new patterns, libraries, or architectural changes are required.

**Key Success Factors**:
1. Strict adherence to TransactionCard pattern ensures consistency
2. Parent-controlled state management keeps components simple
3. Event propagation handling prevents bugs with nested clickables
4. CSS-only animations keep performance optimal
5. Reuse of ActionButtons component maintains code consistency
