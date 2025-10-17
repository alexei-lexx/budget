# Feature Specification: Expandable Card UI Consistency

**Feature Branch**: `002-expandable-card-consistency`
**Created**: 2025-10-17
**Status**: Draft
**Input**: User description: "UI consistency of expandable card. Recently we replaced actiondropdown with actionbuttons on the transaction card on the transactions page. to align UI/UX on all pages, I want to reuse the same approach for the accounts and categories pages - use ActionButtons.vue instead of ActionDropdown.vue, make account and category cards expandable on click to show edit and delete buttons, remove dropdown with edit and delete buttons"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Expandable Account Cards (Priority: P1)

Users viewing their accounts list need to manage account information by editing or deleting accounts. Currently, the action menu is always visible via a dropdown button. The new design will hide these actions by default and reveal them when the user clicks on the account card, creating a cleaner interface that matches the recently updated transaction cards.

**Why this priority**: Account cards are displayed on the main accounts page and are a primary interface element. Achieving UI consistency with transaction cards improves the overall user experience and reduces visual clutter on a frequently accessed page.

**Independent Test**: Navigate to the accounts page, click on any account card to expand it, verify edit and delete buttons appear, click the card again to collapse it and verify buttons are hidden. This can be tested completely independently and delivers immediate value through improved UI consistency.

**Acceptance Scenarios**:

1. **Given** a user is viewing the accounts page with multiple accounts, **When** they view an account card in its collapsed state, **Then** the card displays only the account name and balance without edit or delete buttons visible
2. **Given** a user clicks on a collapsed account card, **When** the card expands, **Then** edit and delete action buttons appear in the expanded area aligned to the right
3. **Given** a user clicks on an expanded account card, **When** the card collapses, **Then** the edit and delete buttons are hidden again
4. **Given** a user hovers over an account card, **When** the card is collapsed, **Then** the card shows a hover effect (slight elevation) indicating it's clickable
5. **Given** a user clicks the edit button in an expanded account card, **When** the edit action is triggered, **Then** the edit dialog opens without collapsing the card
6. **Given** a user clicks the delete button in an expanded account card, **When** the delete action is triggered, **Then** the delete confirmation dialog opens without collapsing the card

---

### User Story 2 - Expandable Category Cards (Priority: P2)

Users managing their categories need to edit or delete category information. Similar to accounts, the action menu is currently always visible. The new design will follow the same expandable pattern as transaction cards, hiding edit and delete actions until the user clicks on the category card.

**Why this priority**: Category cards are displayed on the categories page. While slightly less frequently accessed than accounts, maintaining UI consistency across all list views is important for user experience and interface predictability.

**Independent Test**: Navigate to the categories page, click on any category card to expand it, verify edit and delete buttons appear, click the card again to collapse it and verify buttons are hidden. This can be tested completely independently and provides the same UI consistency benefits as the account cards feature.

**Acceptance Scenarios**:

1. **Given** a user is viewing the categories page with multiple categories, **When** they view a category card in its collapsed state, **Then** the card displays only the category name without edit or delete buttons visible
2. **Given** a user clicks on a collapsed category card, **When** the card expands, **Then** edit and delete action buttons appear in the expanded area aligned to the right
3. **Given** a user clicks on an expanded category card, **When** the card collapses, **Then** the edit and delete buttons are hidden again
4. **Given** a user hovers over a category card, **When** the card is collapsed, **Then** the card shows a hover effect (slight elevation) indicating it's clickable
5. **Given** a user clicks the edit button in an expanded category card, **When** the edit action is triggered, **Then** the edit dialog opens without collapsing the card
6. **Given** a user clicks the delete button in an expanded category card, **When** the delete action is triggered, **Then** the delete confirmation dialog opens without collapsing the card

---

### User Story 3 - Remove ActionDropdown Component (Priority: P3)

After replacing all usages of ActionDropdown with ActionButtons in the expandable card pattern, the ActionDropdown component is no longer needed in the codebase. Removing it prevents future confusion and maintains a clean, consistent codebase.

**Why this priority**: Code cleanup that should happen after P1 and P2 are implemented. This ensures we don't have unused components in the codebase and maintains consistency in action button patterns across the application.

**Independent Test**: Verify that no components import or use ActionDropdown.vue, then delete the file. Run the application to confirm no errors occur. This can be tested independently as a final cleanup step after the other features are working.

**Acceptance Scenarios**:

1. **Given** all account and category cards have been updated to use ActionButtons, **When** searching the codebase for ActionDropdown imports, **Then** no active usages are found (only in git history)
2. **Given** the ActionDropdown component file is deleted, **When** the application is built and run, **Then** no errors occur related to missing ActionDropdown component
3. **Given** the ActionDropdown component is removed, **When** developers review the codebase, **Then** they only find ActionButtons as the standard pattern for card actions

---

### Edge Cases

- What happens when a user has multiple cards expanded at the same time? **Answer**: Each card maintains its own expanded/collapsed state independently. Multiple cards can be expanded simultaneously, matching the current transaction card behavior.
- How does the system handle rapid clicking on a card (toggling expand/collapse quickly)? **Answer**: Each click should toggle the state reliably. The implementation should prevent animation conflicts by using proper Vue transition states.
- What happens when a card is expanded and the user clicks the edit or delete button? **Answer**: The action (edit/delete) should be triggered without collapsing the card, allowing the dialog to open while the card remains in its expanded state. After closing the dialog, the card should remain expanded.
- What happens on mobile devices with limited screen space? **Answer**: The ActionButtons component already handles responsive layout, displaying buttons vertically on small screens. The expanded card content should adapt to available screen space.
- What happens when there are no accounts or categories to display? **Answer**: This scenario is unchanged - the existing empty state handling remains the same.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Account cards MUST be clickable to toggle between collapsed and expanded states
- **FR-002**: Category cards MUST be clickable to toggle between collapsed and expanded states
- **FR-003**: Account cards MUST hide edit and delete buttons when collapsed
- **FR-004**: Category cards MUST hide edit and delete buttons when collapsed
- **FR-005**: Account cards MUST display ActionButtons component in expanded state aligned to the right
- **FR-006**: Category cards MUST display ActionButtons component in expanded state aligned to the right
- **FR-007**: Account cards MUST show a cursor pointer style to indicate clickability
- **FR-008**: Category cards MUST show a cursor pointer style to indicate clickability
- **FR-009**: Account cards MUST disable hover transform effect when expanded (similar to transaction cards)
- **FR-010**: Category cards MUST disable hover transform effect when expanded (similar to transaction cards)
- **FR-011**: Edit and delete button clicks MUST NOT collapse the card (must stop event propagation)
- **FR-012**: Account cards MUST NOT display ActionDropdown component after implementation
- **FR-013**: Category cards MUST NOT display ActionDropdown component after implementation
- **FR-014**: ActionDropdown.vue component file MUST be removed from the codebase after all usages are replaced
- **FR-015**: Each card MUST maintain its own independent expanded/collapsed state
- **FR-016**: Multiple cards MUST be able to be expanded simultaneously

### Key Entities *(include if feature involves data)*

- **Account Card**: Visual representation of an account with expandable/collapsible state to show/hide action buttons
- **Category Card**: Visual representation of a category with expandable/collapsible state to show/hide action buttons
- **Card State**: Boolean state tracking whether each card is expanded or collapsed
- **ActionButtons Component**: Reusable component displaying edit and delete buttons with proper event handling

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view account and category lists with a cleaner interface showing only essential information until interaction
- **SC-002**: Users can expand any account or category card with a single click to reveal action buttons
- **SC-003**: Users can collapse any expanded card with a single click to hide action buttons
- **SC-004**: All three card types (transactions, accounts, categories) provide a consistent interaction pattern for accessing edit and delete actions
- **SC-005**: Interface visual consistency is achieved across all list views in the application (accounts, categories, transactions)
- **SC-006**: Users can interact with action buttons without unintended card collapse, ensuring reliable action execution
- **SC-007**: The codebase maintains a single, consistent pattern for card actions (ActionButtons) with no deprecated patterns remaining

## Assumptions

- The existing ActionButtons component already handles all necessary functionality (event propagation stopping, responsive layout, proper button styling)
- The transaction card expandable pattern is considered the desired standard for all card interactions
- Users are familiar with the expandable transaction card pattern and will intuitively understand the same pattern applies to other cards
- The hover effect behavior (disabled when expanded) from transaction cards is the desired behavior for all cards
- Multiple simultaneously expanded cards is an acceptable and desired behavior (no accordion-style single expansion limit)
- The parent components (AccountsList.vue, Categories page) already have or can easily add state management for tracking which cards are expanded
- No accessibility changes are required beyond what the existing transaction card implementation provides

## Out of Scope

- Changes to the transaction card implementation (already completed)
- Modifications to the ActionButtons component functionality or appearance
- Changes to account or category data structure or backend logic
- Accessibility improvements beyond matching the current transaction card pattern
- Animation customization or transition effects beyond what currently exists
- Keyboard navigation enhancements for expanding/collapsing cards
- Persistence of expanded/collapsed state across page reloads or navigation
- Different expand/collapse behavior for mobile vs desktop (uses same pattern on all devices)
