# Feature Specification: Reusable Textbox-Button Input Component

**Feature Branch**: `031-textbox-button-component`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "Create a unified reusable textbox-button input component and apply it consistently across Insight and Transactions pages"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit Text Input via Button Click (Priority: P1)

A user on either the Insight or Transactions page types text into the input area and clicks the submit icon button to perform an action (send an insight query or create a transaction).

**Why this priority**: This is the core interaction — submitting text is the primary purpose of both pages' input areas and the foundation of the component.

**Independent Test**: Can be tested on either page by typing text and clicking the submit icon button, verifying the action is triggered and the component behaves consistently across both pages.

**Acceptance Scenarios**:

1. **Given** the user is on the Insight page with an empty input, **When** they type a query and click the submit icon button, **Then** the query is submitted and the component behaves consistently with existing behavior.
2. **Given** the user is on the Transactions page with an empty input, **When** they type a description and click the submit icon button, **Then** the action is triggered and the component behaves consistently with the Insight page.
3. **Given** the input is empty, **When** the user clicks the submit icon button, **Then** the submission is prevented or handled gracefully.

---

### User Story 2 - Submit via Keyboard Shortcut (Priority: P2)

A user types text into the input area and presses Enter to submit without using the mouse.

**Why this priority**: Keyboard submission improves efficiency for power users.

**Independent Test**: Can be tested independently by typing text in either page's input and pressing Enter, confirming the same action as clicking the submit button.

**Acceptance Scenarios**:

1. **Given** the user has typed text into the input, **When** they press Enter, **Then** the form is submitted exactly as if the submit button was clicked.
2. **Given** the input is empty, **When** the user presses Enter, **Then** nothing is submitted (consistent with button-click behavior).

---

### User Story 3 - Clear Input Content (Priority: P3)

A user who has typed content into the input field can clear it quickly using a clear/close icon that appears when there is content.

**Why this priority**: Quality-of-life feature that reduces friction when the user wants to start over, but the core flow works without it.

**Independent Test**: Can be tested by typing text and verifying the clear icon appears, then clicking it to confirm the input is cleared.

**Acceptance Scenarios**:

1. **Given** the input is empty, **When** the user views the component, **Then** no clear icon is shown.
2. **Given** the user has typed text into the input, **When** they view the component, **Then** a clear/close icon appears.
3. **Given** the clear icon is visible, **When** the user clicks it, **Then** the input content is cleared and the clear icon disappears.

---

### User Story 4 - Auto-Growing Textarea (Priority: P4)

A user typing a long message sees the input area grow vertically to accommodate the text, avoiding the need to scroll within a fixed-height box.

**Why this priority**: Enhances usability for multi-line input but does not block core functionality.

**Independent Test**: Can be tested independently by typing multiple lines of text and verifying the input area expands without scrolling.

**Acceptance Scenarios**:

1. **Given** the user types a single line, **When** viewing the component, **Then** the textarea shows at its minimum height.
2. **Given** the user types enough text to wrap to multiple lines (up to 4 rows), **When** viewing the component, **Then** the textarea grows vertically to show all content without internal scrolling.
3. **Given** the user types beyond 4 rows of content, **When** viewing the component, **Then** the textarea stops growing at 4 rows and scrolls internally beyond that limit.

---

### Edge Cases

- What happens when the user pastes a very long block of text? The textarea should still auto-grow and not overflow its container.
- What happens if the clear icon is clicked while the input is focused? Focus should remain on the input after clearing.
- What happens when the component is rendered on a small screen or mobile viewport? The layout should remain functional.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST provide a single, reusable textbox-button input component that combines a text input area with a submit icon button.
- **FR-002**: The component MUST display a clear/close icon when the input contains text, and hide it when the input is empty.
- **FR-003**: Users MUST be able to clear the input by clicking the clear/close icon.
- **FR-004**: The component MUST support submission via the Enter key. Pressing Enter submits the form; it does not insert a newline.
- **FR-005**: The component MUST support submission via clicking the icon button.
- **FR-006**: The component's text input area MUST automatically grow in height as the user types, starting at 1 row and capping at 4 rows maximum, with no internal scrolling within that range.
- **FR-007**: The Insight page MUST be refactored to place the textbox-button component inside a native app footer (`<v-footer app>`), using the identical footer structure and elevation as the Transactions page, replacing its current inline `.input-area` layout.
- **FR-008**: The Transactions page MUST be refactored to use the reusable textbox-button component in its existing native app footer position, replacing the current text-input-with-text-button pattern.
- **FR-009**: The component MUST present a consistent visual appearance and interaction model across both the Insight and Transactions pages.
- **FR-010**: The component MUST accept a `loading` state that, when active, shows a spinner on the submit button and disables the text input, preventing further interaction until loading completes.
- **FR-011**: The submit button MUST use the send icon (the same icon currently used on the Insight page) on both pages.
- **FR-012**: The text input area MUST have a descriptive `aria-label` appropriate to its page context. The submit button MUST have a descriptive `aria-label` appropriate to its page context.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Both the Insight and Transactions pages use the same input component, with no bespoke input patterns remaining on either page.
- **SC-002**: Users can submit input by clicking the icon button or pressing Enter on both pages, with identical outcomes.
- **SC-003**: The clear icon appears whenever the input contains text and disappears when the input is empty, on both pages.
- **SC-004**: The input area grows to fit multi-line text without requiring the user to scroll inside the input box.
- **SC-005**: No visual regressions are introduced on either page — the layout and styling remain consistent with the existing design.

## Clarifications

### Session 2026-03-06

- Q: Where should the textbox-button component be positioned on each page? → A: Both pages MUST use an identical native app footer layout (`<v-footer app>`). The Insight page must be refactored to replace its current inline `.input-area` div with the same footer structure already used on the Transactions page.
- Q: What icon should the submit button use? → A: The send icon (currently used on the Insight page's submit button), applied consistently on both pages.
- Q: Are accessibility labels required? → A: Yes. The text input and submit button MUST each have descriptive aria-labels appropriate to their page context (e.g., "Ask a question" / "Submit question" on Insight; "Create transaction" / "Add transaction" on Transactions).
- Q: What keyboard shortcut triggers submission? → A: Plain Enter only (same as current behavior on both pages); Enter does NOT insert a newline. Ctrl+Enter is not required.
- Q: Should the textarea have a maximum height cap? → A: Yes, fixed at 4 rows maximum — same as current Insight behavior, applied to both usages.
- Q: How should the component handle loading/disabled state? → A: Component accepts a `loading` prop — shows a spinner on the submit button and disables the input while true.

## Assumptions

- The existing behavior (what happens after submission) on each page remains unchanged; only the input component is unified.
- The submit button icon is the send icon, as currently used on the Insight page.
- "Supports keyboard submit (Enter)" means the component listens for the Enter key and triggers the same action as clicking the submit button; Enter does not insert a newline.
- The component does not need to support configurable keyboard shortcuts.
- The clear icon behavior (click to clear) does not require a confirmation step.
