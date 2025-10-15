# Tasks: Expandable Transaction Cards

**Input**: Design documents from `/specs/001-improve-ui-ux/`
**Prerequisites**: plan.md, research.md, data-model.md, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: Vue 3.5.13, TypeScript 5.8, Vuetify 3.8.9
   → Structure: Frontend-only changes (no backend modifications)
2. Load design documents:
   → data-model.md: Component state (expandedTransactionIds Set)
   → research.md: Technical decisions (state management, event handling, layout)
   → quickstart.md: 11 manual test scenarios
3. Generate tasks by category:
   → State Management: Parent component expansion tracking
   → Component Modifications: TransactionCard template and behavior
   → Layout: Expanded content row with responsive design
   → Visual Feedback: Clickability indicators and styling
   → Testing: Manual verification scenarios
4. Apply task rules:
   → Sequential tasks (single file modifications, no parallelization)
   → Bottom-up approach (state → behavior → UI → styling → testing)
5. Number tasks sequentially (T001, T002...)
6. No automated tests per user requirement
7. Return: SUCCESS (8 tasks ready for execution)
```

## Format: `[ID] Description`
- No [P] markers - all tasks are sequential (same files)
- Include exact file paths in descriptions
- Each task is self-contained and executable

## Path Conventions
- **Frontend**: `frontend/src/`
- **Components**: `frontend/src/components/transactions/`
- **Views**: `frontend/src/views/`

## Phase 3.1: Parent Component State Management

### T001 Add expansion state to Transactions.vue
**File**: `frontend/src/views/Transactions.vue`

**Objective**: Add reactive state to track which transaction cards are expanded

**Implementation**:
1. Add import at top of script section:
   ```typescript
   import { ref } from 'vue';
   ```

2. Add state variable after existing composable declarations (around line 218):
   ```typescript
   const expandedTransactionIds = ref<Set<string>>(new Set());
   ```

3. Add toggle handler function after existing event handlers (around line 465):
   ```typescript
   const toggleTransactionExpand = (transactionId: string) => {
     if (expandedTransactionIds.value.has(transactionId)) {
       expandedTransactionIds.value.delete(transactionId);
     } else {
       expandedTransactionIds.value.add(transactionId);
     }
     // Trigger Vue reactivity by creating new Set instance
     expandedTransactionIds.value = new Set(expandedTransactionIds.value);
   };
   ```

4. Add computed helper function after toggleTransactionExpand:
   ```typescript
   const isTransactionExpanded = (transactionId: string): boolean => {
     return expandedTransactionIds.value.has(transactionId);
   };
   ```

**Acceptance Criteria**:
- ✅ expandedTransactionIds ref is declared with correct type
- ✅ toggleTransactionExpand function correctly adds/removes IDs
- ✅ isTransactionExpanded helper returns correct boolean
- ✅ No TypeScript errors
- ✅ Code compiles successfully

**Dependencies**: None (foundation task)

---

### T002 Pass expansion state to TransactionCard components
**File**: `frontend/src/views/Transactions.vue`

**Objective**: Pass isExpanded prop and toggleExpand event handler to each TransactionCard

**Implementation**:
1. Locate the TransactionCard component usage in template (around line 88-97)

2. Add two new props to TransactionCard:
   ```vue
   <TransactionCard
     v-for="transaction in paginatedTransactions"
     :key="transaction.id"
     :transaction="transaction"
     :account-name="getAccountName(transaction.accountId)"
     :category-name="getCategoryName(transaction.categoryId)"
     :is-expanded="isTransactionExpanded(transaction.id)"
     class="mb-3"
     @edit-transaction="handleEditTransaction"
     @delete-transaction="handleDeleteTransaction"
     @toggle-expand="toggleTransactionExpand"
   />
   ```

**Acceptance Criteria**:
- ✅ :is-expanded prop added with computed value
- ✅ @toggle-expand event handler added
- ✅ All existing props and events preserved
- ✅ No TypeScript errors
- ✅ Frontend compiles and runs

**Dependencies**: T001 (requires state and handlers)

---

## Phase 3.2: TransactionCard Component Modifications

### T003 Update TransactionCard props interface
**File**: `frontend/src/components/transactions/TransactionCard.vue`

**Objective**: Add isExpanded prop to component interface

**Implementation**:
1. Locate the Props interface in script section (around line 7-12)

2. Update interface to include isExpanded:
   ```typescript
   interface Props {
     transaction: Transaction;
     accountName: string;
     categoryName?: string;
     isExpanded: boolean;  // NEW
   }
   ```

3. Ensure props are defined with updated interface (should already be using defineProps<Props>())

**Acceptance Criteria**:
- ✅ isExpanded added to Props interface as required boolean
- ✅ TypeScript recognizes new prop
- ✅ No TypeScript errors
- ✅ Component still compiles

**Dependencies**: T002 (parent must pass prop)

---

### T004 Add toggleExpand event to TransactionCard
**File**: `frontend/src/components/transactions/TransactionCard.vue`

**Objective**: Add new event emission for card expand/collapse

**Implementation**:
1. Locate the emit interface in script section (around line 16-20)

2. Update interface to include toggleExpand:
   ```typescript
   const emit = defineEmits<{
     editTransaction: [transactionId: string];
     deleteTransaction: [transactionId: string];
     toggleExpand: [transactionId: string];  // NEW
   }>();
   ```

3. Add handler function after existing event handlers (around line 75-82):
   ```typescript
   const handleCardClick = () => {
     emit('toggleExpand', props.transaction.id);
   };
   ```

**Acceptance Criteria**:
- ✅ toggleExpand event added to emits interface
- ✅ handleCardClick function emits correct event with transaction ID
- ✅ TypeScript validates event signature
- ✅ No compilation errors

**Dependencies**: T003 (needs props interface complete)

---

### T005 Restructure TransactionCard template for collapsible content
**File**: `frontend/src/components/transactions/TransactionCard.vue`

**Objective**: Add click handler to card and create expandable content section

**Implementation**:
1. Locate the v-card element in template (around line 86)

2. Add click handler and cursor style:
   ```vue
   <v-card
     variant="outlined"
     class="transaction-card"
     :class="{ 'expanded': isExpanded }"
     @click="handleCardClick"
     style="cursor: pointer;"
   >
   ```

3. Locate the current card-text content (around line 87-112)

4. Restructure to separate collapsed and expanded content:
   ```vue
   <v-card-text class="py-3">
     <!-- Collapsed state: Single row with all info -->
     <div class="d-flex align-center">
       <!-- Icon -->
       <v-icon :color="amountColor" size="20" class="me-3 flex-shrink-0">
         {{ transactionIcon }}
       </v-icon>

       <!-- Main content -->
       <div class="flex-grow-1 me-3" style="min-width: 0">
         <h4 class="text-h6 mb-0 text-truncate">
           {{ formattedDate }} • {{ accountName
           }}<span v-if="categoryName"> • {{ categoryName }}</span>
         </h4>
       </div>

       <!-- Amount -->
       <div class="text-h5 font-weight-bold flex-shrink-0" :class="`text-${amountColor}`">
         {{ formattedAmount }}
       </div>
     </div>

     <!-- Expanded state: Second row with description and buttons -->
     <div
       v-if="isExpanded && transaction.description"
       class="d-flex flex-column flex-sm-row align-sm-center justify-sm-space-between ga-2 mt-3"
     >
       <!-- Description on left (top on mobile) -->
       <div class="text-body-2 flex-grow-1" style="min-width: 0">
         {{ transaction.description }}
       </div>

       <!-- Buttons on right (bottom on mobile) -->
       <div class="flex-shrink-0 d-flex ga-2" @click.stop>
         <v-btn
           size="small"
           color="primary"
           variant="text"
           prepend-icon="mdi-pencil"
           @click="handleEditTransaction"
         >
           Edit
         </v-btn>
         <v-btn
           size="small"
           color="error"
           variant="text"
           prepend-icon="mdi-delete"
           @click="handleDeleteTransaction"
         >
           Delete
         </v-btn>
       </div>
     </div>

     <!-- Expanded state without description: Only buttons -->
     <div
       v-else-if="isExpanded && !transaction.description"
       class="d-flex justify-end ga-2 mt-3"
       @click.stop
     >
       <v-btn
         size="small"
         color="primary"
         variant="text"
         prepend-icon="mdi-pencil"
         @click="handleEditTransaction"
       >
         Edit
       </v-btn>
       <v-btn
         size="small"
         color="error"
         variant="text"
         prepend-icon="mdi-delete"
         @click="handleDeleteTransaction"
       >
         Delete
       </v-btn>
     </div>
   </v-card-text>
   ```

**Acceptance Criteria**:
- ✅ Card has click handler that calls handleCardClick
- ✅ Collapsed view shows only icon, date, account, category, amount
- ✅ Description is NOT visible in collapsed state
- ✅ Expanded view shows description (if exists) and Edit/Delete buttons
- ✅ Edit/Delete buttons use @click.stop to prevent card collapse
- ✅ Responsive layout: vertical on mobile, horizontal on desktop (flex-sm-row)
- ✅ No TypeScript or template errors

**Dependencies**: T004 (needs event emission and handler)

---

## Phase 3.3: Visual Feedback & Styling

### T006 Add visual feedback for expanded state
**File**: `frontend/src/components/transactions/TransactionCard.vue`

**Objective**: Add styling to differentiate expanded cards and indicate clickability

**Implementation**:
1. Locate the style section at bottom of file (around line 117-128)

2. Update styles to add expanded state and enhance clickability:
   ```vue
   <style scoped>
   .transaction-card {
     cursor: pointer;
     transition:
       transform 0.2s ease,
       box-shadow 0.2s ease,
       border-color 0.2s ease;
   }

   .transaction-card:hover {
     transform: translateY(-2px);
     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
   }

   .transaction-card.expanded {
     border-color: rgb(var(--v-theme-primary));
     border-width: 2px;
   }

   .transaction-card.expanded:hover {
     transform: none; /* Disable hover transform when expanded */
   }
   </style>
   ```

**Acceptance Criteria**:
- ✅ Cursor changes to pointer on hover
- ✅ Card has subtle hover effect (transform + shadow)
- ✅ Expanded cards have distinct border color (primary theme color)
- ✅ Expanded cards don't transform on hover (clearer state)
- ✅ Smooth transitions between states
- ✅ Visual feedback works on desktop
- ✅ Border visible on mobile without hover

**Dependencies**: T005 (needs template structure complete)

---

## Phase 3.4: Manual Testing & Validation

### T007 Run quickstart.md test scenarios
**File**: `specs/001-improve-ui-ux/quickstart.md`

**Objective**: Manually verify all 11 functional requirements using test scenarios

**Implementation**:
1. Start backend and frontend development servers
2. Navigate to transactions page
3. Execute each test scenario from quickstart.md:
   - Scenario 1: Default collapsed state (FR-001, FR-002)
   - Scenario 2: Single card expansion (FR-003, FR-004)
   - Scenario 3: Card collapse (FR-005)
   - Scenario 4: Multiple independent expansions (FR-006)
   - Scenario 5: Empty description handling (FR-004)
   - Scenario 6: Button click doesn't collapse (FR-010)
   - Scenario 7: State persists after edit (FR-011)
   - Scenario 8: Long description wrapping (FR-012)
   - Scenario 9: Session persistence (FR-007)
   - Scenario 10: Visual feedback (FR-008, FR-009)
   - Scenario 11: Mobile responsive layout (FR-013)

4. Run Quick Smoke Test (30 seconds)

5. Run Regression Testing:
   - Transaction creation still works
   - Transaction editing still works
   - Transaction deletion still works
   - Transfer operations still work
   - Pagination still works

6. Verify performance:
   - Expand/collapse feels instant (< 100ms)
   - No lag with multiple expanded cards
   - Rapid toggling works smoothly

7. Check browser console for errors

**Acceptance Criteria**:
- ✅ All 11 scenarios pass completely
- ✅ Smoke test passes (all 6 steps work)
- ✅ Regression tests pass (no existing features broken)
- ✅ Performance is acceptable
- ✅ Works on desktop viewport (> 600px)
- ✅ Works on mobile viewport (< 600px) with vertical stacking
- ✅ No console errors during testing
- ✅ Edit and Delete buttons work correctly
- ✅ Clicking buttons doesn't collapse card

**Dependencies**: T006 (needs all implementation complete)

---

### T008 Verify responsive behavior and fix any issues
**File**: `frontend/src/components/transactions/TransactionCard.vue` (if fixes needed)

**Objective**: Ensure responsive layout works correctly on all screen sizes

**Implementation**:
1. Use Chrome DevTools to test multiple viewports:
   - Mobile: 375x667 (iPhone SE)
   - Tablet: 768x1024 (iPad)
   - Desktop: 1920x1080

2. For each viewport, verify:
   - Collapsed cards display correctly
   - Expanded cards display correctly
   - Description and buttons layout correctly
   - Mobile (< 600px): Vertical stack (description above, buttons below)
   - Desktop (>= 600px): Horizontal layout (description left, buttons right)

3. Test with different content:
   - Short description (1-20 chars)
   - Medium description (20-100 chars)
   - Long description (100+ chars)
   - No description

4. Verify buttons are tappable on mobile (min 44x44px touch target)

5. Fix any layout issues found:
   - Adjust Vuetify flex classes if needed
   - Add gap/spacing if elements are too close
   - Ensure text wraps properly
   - Verify buttons don't get cut off

**Acceptance Criteria**:
- ✅ Mobile viewport: Description and buttons stack vertically
- ✅ Desktop viewport: Description and buttons layout horizontally
- ✅ Long descriptions wrap properly without breaking layout
- ✅ Buttons are easily tappable on mobile
- ✅ No horizontal scrolling on any viewport
- ✅ Layout transitions smoothly at breakpoint (600px)
- ✅ All text is readable on all screen sizes

**Dependencies**: T007 (testing may reveal responsive issues)

---

## Dependencies Summary

```
T001 (Add state)
  ↓
T002 (Pass props)
  ↓
T003 (Update interface)
  ↓
T004 (Add event)
  ↓
T005 (Restructure template)
  ↓
T006 (Add styling)
  ↓
T007 (Manual testing)
  ↓
T008 (Responsive fixes)
```

**Sequential Execution**: All tasks must be completed in order (T001 → T002 → ... → T008)

**No Parallel Execution**: All tasks modify the same two files, requiring sequential implementation

## Implementation Notes

### Files Modified
1. `frontend/src/views/Transactions.vue` (Tasks T001, T002)
   - Add expansion state management
   - Pass props to child components

2. `frontend/src/components/transactions/TransactionCard.vue` (Tasks T003-T006, T008)
   - Update props and events
   - Restructure template
   - Add styling

### No New Files
- No new components needed
- No new composables needed
- No new utilities needed

### Testing Strategy
- No automated tests (per user requirement)
- Manual testing using quickstart.md scenarios
- Regression testing to ensure existing features work
- Responsive testing across multiple viewports

### Key Technical Decisions
- **State Management**: ref<Set<string>> for O(1) lookup
- **Event Handling**: @click.stop on buttons to prevent collapse
- **Responsive Layout**: Vuetify flex utilities (flex-column, flex-sm-row)
- **Visual Feedback**: Border color change, hover effects, cursor pointer
- **No Animation Complexity**: Simple CSS transitions (user indifferent)

### Performance Targets
- Expand/collapse: < 100ms perceived latency
- Smooth scrolling with 10+ expanded cards
- No lag during rapid toggling

### Browser Support
- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

## Validation Checklist
*Completed before marking feature as done*

- [x] All tasks numbered sequentially (T001-T008)
- [x] Each task specifies exact file path
- [x] Dependencies clearly documented
- [x] Acceptance criteria defined for each task
- [x] Manual testing scenarios referenced
- [x] No parallel execution (sequential required)
- [x] No automated tests (per user requirement)
- [x] Responsive requirements included
- [x] Performance targets specified

---

**Task Generation Status**: ✅ Complete - 8 sequential tasks ready for implementation
