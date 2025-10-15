
# Implementation Plan: Expandable Transaction Cards

**Branch**: `001-improve-ui-ux` | **Date**: 2025-10-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-improve-ui-ux/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → Feature spec loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Implement expandable transaction cards to reduce visual clutter in the transactions list. Cards will show essential information (date, account, category, amount) by default and expand on click to reveal description and edit/delete buttons. This is a frontend-only UI/UX enhancement requiring no backend changes.

## Technical Context
**Language/Version**: TypeScript 5.8, Vue 3.5.13
**Primary Dependencies**: Vuetify 3.8.9 (Material Design components), Vue Router 4.5.1
**Storage**: Client-side component state (no persistence required)
**Testing**: No automated tests required per user guidance
**Target Platform**: Web browsers (responsive design for desktop and mobile)
**Project Type**: Web application (frontend + backend, but this feature is frontend-only)
**Performance Goals**: Smooth expand/collapse transitions, responsive interaction (< 100ms)
**Constraints**: Must work on mobile devices without hover effects, must preserve existing edit/delete functionality
**Scale/Scope**: Single component modification (TransactionCard.vue), affects transactions list display

**User-Provided Context**:
- Analyzed frontend/src/views/Transactions.vue: Parent component managing transaction list, dialogs, and CRUD operations
- Analyzed frontend/src/components/transactions/TransactionCard.vue: Current implementation shows all fields in single line with ActionDropdown menu
- Analyzed frontend/src/components/common/ActionDropdown.vue: Reusable dropdown menu for edit/delete actions (will NOT be used in expanded state)
- Current pattern: Cards use Vuetify v-card with hover effects, ActionDropdown for actions, composables for data management
- User preference: Replace ActionDropdown with two separate Edit and Delete buttons in expanded state
- No tests needed for frontend per user requirement

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: Constitution file contains only template placeholders, no actual project-specific principles defined. Proceeding with standard frontend development best practices.

**Standard Frontend Best Practices Applied**:
- ✅ Component-based architecture (Vue SFC pattern)
- ✅ Composition API with TypeScript for type safety
- ✅ Vuetify component library (v-btn for Edit/Delete buttons)
- ✅ Consistent styling patterns (Vuetify Material Design)
- ✅ Responsive design (mobile-first approach)
- ✅ No unnecessary complexity (pure UI state management)

## Project Structure

### Documentation (this feature)
```
specs/001-improve-ui-ux/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Web application structure
frontend/
├── src/
│   ├── components/
│   │   ├── transactions/
│   │   │   └── TransactionCard.vue      # PRIMARY: Component to modify
│   │   └── common/
│   │       └── (no new components needed)
│   ├── views/
│   │   └── Transactions.vue              # MODIFIED: Add expansion state management
│   └── composables/
│       └── useTransactions.ts            # UNCHANGED: Data management
```

**Structure Decision**: Web application (Option 2) - Frontend-only changes, no backend modifications needed

## Phase 0: Outline & Research
*Status: Completed*

### Research Findings

#### 1. Vue 3 Composition API with Reactive State
**Decision**: Use `ref<Set<string>>()` to track expanded transaction IDs
**Rationale**:
- Set provides O(1) lookup for checking if transaction is expanded
- Reactive ref ensures Vue reactivity system tracks changes
- Persistent across component lifecycle until page reload (meets FR-007)

**Alternatives Considered**:
- Array of IDs: O(n) lookup, less efficient
- Map<string, boolean>: More memory overhead, unnecessary complexity

#### 2. Click Event Handling with Event Propagation Control
**Decision**: Use `@click.stop` on each Edit and Delete button to prevent card expand/collapse
**Rationale**:
- Meets FR-010: Clicking edit/delete buttons must not trigger card collapse
- Vue's event modifiers provide clean, declarative solution
- Prevents event bubbling to parent card element
- Two separate buttons provide direct, single-click access to actions

**Alternatives Considered**:
- ActionDropdown menu: Requires two clicks (open menu, select action), less direct
- Manual event.stopPropagation() in handlers: More verbose, less declarative

#### 3. Responsive Layout with Vuetify Flexbox Utilities
**Decision**: Use Vuetify's `d-flex`, `flex-column`, and responsive breakpoint classes
**Rationale**:
- Meets FR-013: Mobile devices stack description and buttons vertically
- Consistent with existing AccountCard and CategoryCard patterns
- No custom CSS needed, uses framework utilities

**Alternatives Considered**:
- CSS Grid: Overkill for simple 2-element layout
- Custom media queries: Inconsistent with Vuetify patterns

#### 4. Visual Feedback for Clickable State
**Decision**: Combine multiple indicators for mobile compatibility
**Rationale**:
- Cursor pointer (desktop hover)
- Subtle border color change on hover
- Optional chevron icon indicating expand/collapse state (always visible, including mobile)
- Meets FR-008: Visual feedback that works on mobile without hover

**Alternatives Considered**:
- Hover-only feedback: Doesn't work on mobile (rejected per FR-008)
- Ripple effect only: Not clear enough indicator

#### 5. Expand/Collapse Animation
**Decision**: Use Vue's `<Transition>` component with CSS transitions
**Rationale**:
- Smooth, performant animations
- Vue handles DOM mounting/unmounting
- User stated "I don't care" about animation, so keep it simple

**Alternatives Considered**:
- No animation: Works but less polished UX
- JavaScript animations: More complex, unnecessary

### Technical Decisions Summary

| Aspect | Decision | Key Benefit |
|--------|----------|-------------|
| State Management | ref<Set<string>> | O(1) lookup, reactive |
| Event Handling | @click.stop on buttons | Prevents unwanted collapse |
| Layout | Vuetify flex utilities | Responsive, consistent |
| Visual Feedback | Multi-indicator approach | Mobile-friendly |
| Animation | Vue Transition + CSS | Simple, performant |

**Output**: research.md created with all technical decisions documented

## Phase 1: Design & Contracts
*Status: Completed*

### Data Model
**Entity**: TransactionCardState (Component-local state)
- `expandedTransactionIds`: Set<string> - Tracks which transaction cards are currently expanded
- Lifecycle: Created on component mount, cleared on component unmount
- Persistence: Session-only (no localStorage, meets FR-007)

**No Backend Changes Required**: This is purely a UI state change, existing Transaction entity unchanged

### Component Contracts

#### TransactionCard.vue (Modified)
**Props** (Unchanged):
```typescript
interface Props {
  transaction: Transaction;
  accountName: string;
  categoryName?: string;
}
```

**Events** (Unchanged):
```typescript
interface Emits {
  editTransaction: [transactionId: string];
  deleteTransaction: [transactionId: string];
}
```

**New Internal State**:
```typescript
const isExpanded = computed(() => expandedIds.has(props.transaction.id))
const toggleExpand = () => { /* ... */ }
```

#### Vuetify v-btn Components
Edit and Delete actions will use separate Vuetify buttons in expanded state:
- Edit button: primary color, mdi-pencil icon, small size, text variant
- Delete button: error color, mdi-delete icon, small size, text variant
- Both buttons use @click.stop to prevent card collapse

### User Interaction Contracts

**Collapsed State** (Default):
- Click anywhere on card → Expand
- Shows: icon, date, account name, category name (if exists), amount
- Hides: description, Edit/Delete buttons

**Expanded State**:
- Click on card (but not on buttons) → Collapse
- Click on Edit or Delete button → Trigger action only, stay expanded
- Shows: All collapsed content + second row with description (left) and Edit/Delete buttons (right)
- Mobile: Description and buttons stack vertically (description above, buttons below)

### Testing Approach
Per user requirement: **No automated tests needed for frontend**

Manual testing checklist captured in quickstart.md

### Generated Artifacts
1. ✅ data-model.md - Component state structure
2. ✅ quickstart.md - Manual testing scenarios
3. ❌ No contracts/ folder - Frontend component, no API contracts
4. ❌ No test files - User specified no frontend tests

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base structure
2. Generate tasks from Phase 1 design:
   - **State Management Tasks**: Add reactive state for tracking expanded IDs
   - **Component Modification Tasks**: Update TransactionCard template and script
   - **Layout Tasks**: Add expanded content row with responsive behavior
   - **Event Handling Tasks**: Implement click handlers with proper event propagation
   - **Visual Feedback Tasks**: Add clickability indicators and expanded state styling
   - **Testing Tasks**: Manual verification using quickstart.md scenarios

**Ordering Strategy**:
1. Component state setup (foundation)
2. Click handler implementation (behavior)
3. Template restructuring (layout)
4. Styling updates (visual feedback)
5. Responsive behavior (mobile support)
6. Manual testing (validation)

**Estimated Output**: 8-10 numbered, dependency-ordered tasks in tasks.md

**Key Principles**:
- Each task modifies single concern (SRP)
- Tasks ordered by dependency (state before handlers before UI)
- No parallel execution markers [P] - single file modification sequence
- Each task includes acceptance criteria from functional requirements

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following Vue 3 best practices)
**Phase 5**: Validation (manual testing using quickstart.md scenarios)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

**No Violations**: This feature follows standard frontend component patterns with no constitutional deviations.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning approach described (/plan command)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no violations)
- [x] Post-Design Constitution Check: PASS (no violations)
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---
*Based on Constitution v2.1.1 (template) - See `.specify/memory/constitution.md`*
