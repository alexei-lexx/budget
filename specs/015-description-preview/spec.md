# Feature Specification: Transaction Description Preview in Collapsed Cards

**Feature Branch**: `015-description-preview`
**Created**: 2025-11-30
**Status**: Draft
**Input**: User description: "Given transactions list page where optional description is fully shown only when transaction card is expanded, show description (if given) also on collapsed transaction cards. It should follow <account> * <category> * <description>. If description is long then it should be truncated. When card is expanded then hide description in the card first line, show only in the expanded part. Visually it should be shown like something less important."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Description Preview on Collapsed Cards (Priority: P1)

Users viewing their transaction list need to see transaction descriptions at a glance without expanding each card. Currently, descriptions are only visible when a card is expanded, requiring extra clicks to view this information. The new design will display the description (when present) directly in the collapsed card's header line following the format: account name * category name * description.

**Why this priority**: This is the core functionality requested. Users frequently scan transaction lists to find specific transactions or verify details. Having descriptions immediately visible saves time and reduces the number of clicks needed to find relevant transactions. This delivers immediate value for the most common use case.

**Independent Test**: Navigate to transactions page, create a transaction with a description, verify the collapsed card shows "Account Name * Category Name * Description" in the header line. Create a transaction without a description and verify only "Account Name * Category Name" is shown. This fully tests the core feature independently.

**Acceptance Scenarios**:

1. **Given** a transaction has a description field populated, **When** viewing the transaction card in collapsed state, **Then** the header line displays account name, category name, and description separated by " * " delimiters
2. **Given** a transaction has no description (null or empty string), **When** viewing the transaction card in collapsed state, **Then** the header line displays only account name and category name with a single " * " delimiter between them
3. **Given** multiple transactions with varying description lengths, **When** viewing the transactions list in collapsed state, **Then** all transactions with descriptions show the full format "Account * Category * Description"
4. **Given** a transaction with description is displayed in collapsed state, **When** comparing with the current format, **Then** the new format adds the description as the third element after the existing account and category information

---

### User Story 2 - Truncate Long Descriptions with Ellipsis (Priority: P2)

Users viewing transactions with long descriptions need the collapsed card to remain visually clean and readable. Long descriptions that wrap multiple lines or overflow the card width would create visual clutter and inconsistent card heights. Truncating long descriptions with an ellipsis (...) maintains a clean, scannable list while still providing a preview of the content.

**Why this priority**: This ensures the UI remains clean and professional when descriptions vary in length. Without truncation, long descriptions could make the list difficult to scan. This is secondary to P1 because showing any description preview is more valuable than perfect truncation handling.

**Independent Test**: Create a transaction with a description longer than 50 characters, verify it truncates with ellipsis in collapsed state. Expand the card and verify the full description is visible in the expanded section. This can be tested independently and validates the truncation behavior.

**Acceptance Scenarios**:

1. **Given** a transaction has a description longer than the available space in the header line, **When** viewing the card in collapsed state, **Then** the description is truncated with an ellipsis (...) to fit within the card width
2. **Given** a transaction with a description of exactly the maximum displayable length, **When** viewing in collapsed state, **Then** the description is shown in full without ellipsis
3. **Given** transactions with varying description lengths, **When** viewing the list, **Then** all collapsed cards maintain consistent height regardless of description length
4. **Given** a transaction with a description containing line breaks or special characters, **When** displayed in collapsed state, **Then** the description is shown on a single line with whitespace normalized and special characters escaped

---

### User Story 3 - Hide Description from Header When Card is Expanded (Priority: P3)

Users who expand a transaction card to see full details should not see redundant information. Currently, when expanded, the full description is shown in a dedicated section within the expanded area. With descriptions now visible in the collapsed header, the expanded state should remove the description from the header line to avoid duplication and reduce visual noise.

**Why this priority**: This prevents information duplication and maintains a clean UI. When the card is expanded, the full description is visible in its dedicated section below, so showing it in the header becomes redundant. This is lowest priority because it's a refinement of the expanded state behavior.

**Independent Test**: Create a transaction with a description, verify it shows in the collapsed header line. Expand the card and verify the header shows only "Account * Category" while the description remains visible in the expanded section below. Collapse the card again and verify the description reappears in the header. This independently validates the conditional display logic.

**Acceptance Scenarios**:

1. **Given** a transaction card with a description is in expanded state, **When** viewing the card header line, **Then** only the account name and category name are displayed (format: "Account * Category") without the description
2. **Given** a transaction card is expanded showing full description in the expanded section, **When** the user collapses the card, **Then** the description reappears in the header line (format: "Account * Category * Description")
3. **Given** a transaction card is collapsed showing description in header, **When** the user expands the card, **Then** the description is removed from the header line and remains visible only in the expanded section
4. **Given** a transaction without a description, **When** toggling between collapsed and expanded states, **Then** the header line always shows "Account * Category" format in both states

---

### Edge Cases

- What happens when the account name or category name is null or undefined?
  - **Answer**: Follow existing behavior for null account/category. If account is null, use "Uncategorized Account" placeholder. If category is null, use "Uncategorized" placeholder.

- How does the system handle special characters in descriptions (e.g., asterisks, HTML tags, emoji)?
  - **Answer**: Description text should be properly escaped to prevent rendering issues. Asterisks in descriptions should be displayed as literal text, not interpreted as delimiters. HTML tags should be escaped to prevent XSS.

- What happens when description contains only whitespace characters?
  - **Answer**: Treat whitespace-only descriptions as empty (no description). Do not display the description segment in the header line.

- How does truncation behave on different screen sizes (mobile vs desktop)?
  - **Answer**: Truncation point should be responsive based on available space. Mobile devices with narrower screens will truncate earlier than desktop views. Use CSS text-overflow: ellipsis with appropriate max-width constraints.

- What happens when the user's locale uses different text direction (RTL)?
  - **Answer**: Follow existing text direction handling. The delimiter " * " should adapt to RTL contexts appropriately.

- What happens when a transaction is in the middle of an edit operation?
  - **Answer**: Follow existing behavior. If the edit dialog is open, the card state (collapsed/expanded) should remain unchanged. When the edit is saved and description is modified, the header line should update to reflect the new description value immediately.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display transaction description in collapsed card header line when description field is populated
- **FR-002**: System MUST format collapsed card header as "Account Name * Category Name * Description" when description exists
- **FR-003**: System MUST format collapsed card header as "Account Name * Category Name" when description is empty, null, or whitespace-only
- **FR-004**: System MUST use " * " (space-asterisk-space) as the delimiter between header line elements
- **FR-005**: System MUST truncate descriptions that exceed available space in the header line
- **FR-006**: System MUST append ellipsis (...) to truncated descriptions
- **FR-007**: System MUST normalize whitespace in descriptions (convert line breaks and multiple spaces to single spaces) when displayed in header line
- **FR-008**: System MUST escape HTML and special characters in descriptions to prevent XSS and rendering issues
- **FR-009**: System MUST hide description from header line when card is in expanded state
- **FR-010**: System MUST continue to display full description in the dedicated expanded section regardless of header line state
- **FR-011**: System MUST restore description to header line when transitioning from expanded to collapsed state
- **FR-012**: System MUST apply visual styling to make description appear less prominent than account and category names
- **FR-013**: System MUST handle responsive truncation based on available screen width (mobile vs desktop)
- **FR-014**: System MUST maintain consistent card height in collapsed state regardless of description presence or length

### Key Entities

- **Transaction Card Header Line**: Visual element displaying transaction summary information in collapsed state
  - Composed of: account name, category name, and optionally description
  - Formatted with " * " delimiters
  - Subject to truncation constraints based on available width

- **Transaction Description**: Optional text field providing additional details about a transaction
  - Can be null, empty, or contain user-entered text
  - Displayed in two contexts: truncated in header (collapsed), full text in expanded section (expanded)
  - Visual treatment differs based on context (less prominent in header)

- **Card State**: Boolean value tracking whether a transaction card is expanded or collapsed
  - Affects description visibility in header line
  - Collapsed: description shown in header (if present)
  - Expanded: description hidden from header, shown only in expanded section

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view transaction descriptions without expanding cards, reducing clicks needed to scan transaction details by 100% for transactions with descriptions
- **SC-002**: Transaction list remains scannable with consistent card heights in collapsed state regardless of description length
- **SC-003**: Users can distinguish between account name, category name, and description through visual hierarchy (description appears less prominent)
- **SC-004**: All transactions with descriptions display the preview in under 16ms (single frame render time) without layout shift
- **SC-005**: Card expansion/collapse transitions maintain smooth 60fps animation without description causing layout jank
- **SC-006**: Description text is properly escaped with zero XSS vulnerabilities when rendering special characters or HTML
- **SC-007**: Header line format updates immediately (within 16ms) when toggling between collapsed and expanded states

## Assumptions

- The transaction card component already has expandable/collapsible functionality implemented
- The existing expanded section already displays full description in a dedicated area
- Account name and category name are already displayed in the collapsed card header
- The current delimiter between account and category is " * " or can be changed to this format
- The visual hierarchy for "less important" styling can be achieved through existing design system (likely opacity, font size, or color adjustments)
- Transaction descriptions are stored as plain text strings (not rich text or markdown)
- The frontend framework supports reactive updates when card state changes
- CSS text-overflow and max-width properties are sufficient for truncation implementation
- The current card layout has sufficient width to accommodate the new format without breaking responsive design

## Out of Scope

- Changes to how descriptions are entered or edited (form field modifications)
- Backend changes to description storage or validation
- Description search or filtering functionality
- Rich text formatting in descriptions (bold, italic, links, etc.)
- Description character limit enforcement (assumes existing limits are sufficient)
- Accessibility improvements beyond standard text rendering (screen reader optimizations)
- Customization of the delimiter character or format
- User preferences for showing/hiding descriptions in collapsed state
- Description translation or internationalization beyond existing i18n support
- Analytics or tracking of description usage patterns
- Bulk editing or formatting of existing transaction descriptions
- Different truncation strategies (e.g., truncate in middle, show first N characters)
