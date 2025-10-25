# Feature Specification: Relocate Sort Chips on Report Page

**Feature Branch**: `004-relocate-sort-chips`
**Created**: 2025-10-26
**Status**: Draft
**Input**: User description: "properly relocate sort chips on the report page - no new features is added, no feature modified - it is pure UI little change - just display category sort chip above the category column and display amount sort chip above percentage column"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Improved Sort Control Visual Alignment (Priority: P1)

Users viewing the monthly expense report want to quickly understand which columns the sort controls affect. Currently, sort chips are positioned in the top-right of the card, separated from the table columns they control, making the relationship between sort controls and columns less intuitive.

**Why this priority**: This is the core functionality of the feature - improving visual usability by aligning sort controls with their corresponding columns. It's the only story needed for MVP.

**Independent Test**: This can be fully tested by verifying that sort chips appear above their corresponding table columns and that clicking each chip still sorts the table by the correct column.

**Acceptance Scenarios**:

1. **Given** a user is viewing the monthly expense report with the category breakdown table, **When** they look at the table header area, **Then** the "category" sort chip appears above the "Category Name" column
2. **Given** a user is viewing the monthly expense report with the category breakdown table, **When** they look at the table header area, **Then** the "amount" sort chip appears above the "Percentage" column
3. **Given** the "category" sort chip is above the Category Name column, **When** the user clicks the chip, **Then** the table sorts alphabetically by category name and the chip shows visual active state
4. **Given** the "amount" sort chip is above the Percentage column, **When** the user clicks the chip, **Then** the table sorts by amount (descending) and the chip shows visual active state
5. **Given** sort chips are relocated to column headers, **When** the user selects a sort option, **Then** the previous sort option is deselected (only one active at a time)

### Edge Cases

- What happens on narrow viewports when columns are compressed? Sort chips should remain visible and functional
- How should the visual layout handle when the table has only one currency vs multiple currencies (different row heights)? Sort chips should align with the first data row of the table
- What if no data is available? Sort chips should not be visible (consistent with current behavior when categories list is empty)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display the "category" sort chip positioned above and aligned with the "Category Name" table column (left side)
- **FR-002**: System MUST display the "amount" sort chip positioned above and aligned with the "Percentage" table column (right side)
- **FR-003**: System MUST use the existing `v-chip-group` container and distribute chips using flexbox layout (category chip left, amount chip right)
- **FR-004**: System MUST maintain the existing sort functionality where clicking a chip sorts the table and makes the chip appear selected
- **FR-005**: System MUST NOT add or remove any sorting options - only the visual positioning should change
- **FR-006**: System MUST keep both sort chips visible above the table, with category chip aligned to table's left edge and amount chip aligned to table's right edge
- **FR-007**: System MUST handle multi-currency scenarios where table rows have rowspans - sort chips remain positioned above the full table width

### Key Entities *(include if feature involves data)*

- **Sort Chip**: A visual control element that indicates sortable columns and current sort selection
  - Has a label ("category" or "amount")
  - Has an icon indicating sort direction (ascending/descending)
  - Shows visual active/inactive state
  - Occupies a small, compact space in the header

- **Table Column**: The data column that can be sorted
  - Category Name column (first/leftmost)
  - Percentage column (rightmost)
  - May have rowspans for multi-currency display

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sort chips appear visually aligned above their corresponding columns (within same column boundaries on desktop viewports)
- **SC-002**: Clicking either sort chip still correctly sorts the table by its column (category alphabetically or amount descending)
- **SC-003**: Sort chip active state indicator remains accurate - only one chip shows as selected at a time
- **SC-004**: UI layout remains responsive on mobile and tablet viewports (md breakpoint: 6 columns width threshold)
- **SC-005**: Table renders without layout shifts or overlapping elements when sort chips are repositioned to header area

## Assumptions

- Sort chip positioning is a visual/layout-only change; no backend or API changes required
- The existing sort logic (alphabetical for category, descending numeric for amount) remains unchanged
- The table component uses the same column structure (Category Name, Amount, Percentage) that currently exists
- Multi-currency display with rowspans continues to work as-is; sort chips align with the first visible data row
- Responsive design should maintain sort chip visibility and alignment on all viewport sizes

## Clarifications

### Session 2025-10-26

- Q: How should sort chips be positioned relative to the table columns? → A: Keep chips in existing `v-chip-group` container and distribute using flexbox layout (category chip left-aligned, amount chip right-aligned) to align naturally with their corresponding columns below
