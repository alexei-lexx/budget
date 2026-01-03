# Feature Specification: Category Filter Sorting Enhancement

**Feature Branch**: `025-category-filter-sorting`
**Created**: 2026-01-02
**Status**: Draft
**Input**: User description: "Fix category sorting in transaction filter dropdown with global alphabetical sorting and visual type indicators"
**Related Issue**: #64

## Clarifications

### Session 2026-01-02

- Q: How should special characters and numbers sort relative to alphabetic characters (e.g., "401k Contribution")? → A: Use standard Unicode/ASCII collation (numbers before letters: "401k", "AAA", "Travel")
- Q: What visual indicator approach should be used (text prefix, icon, color, or combination)? → A: Colored icons matching category page tabs design, positioned right of category name text
- Q: How should the dropdown behave when there are no categories of a particular type (all income or all expense)? → A: Show all categories with their type icons regardless of type distribution (consistent behavior)
- Q: Should there be a specific performance target for category lists larger than 100 (e.g., 50+ categories)? → A: No additional performance target beyond SC-004
- Q: Are category names that differ only in case (e.g., "Travel" vs "travel") treated as the same category or distinct categories? → A: Case variations are distinct categories (both can exist and are shown separately in sorted order)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Quick Category Location (Priority: P1)

When filtering transactions, a user needs to quickly find and select the desired category from a dropdown containing both income and expense categories.

**Why this priority**: This is the core usability issue - users spend unnecessary time scanning the dropdown due to unclear ordering. Fixing this directly impacts the efficiency of the primary transaction filtering workflow.

**Independent Test**: Can be fully tested by opening the category filter dropdown and verifying all categories appear in a single alphabetically sorted list, delivering immediate value by reducing search time.

**Acceptance Scenarios**:

1. **Given** the user opens the category filter dropdown, **When** they view the list, **Then** all categories (both income and expense) are sorted alphabetically as a single unified list
2. **Given** categories named "Groceries", "Salary", "Entertainment", and "Bonus" exist, **When** the user views the dropdown, **Then** they appear in order: Bonus, Entertainment, Groceries, Salary (regardless of type)
3. **Given** the user is familiar with alphabetical ordering, **When** they need to find a category, **Then** they can locate it predictably without scanning multiple separate lists

---

### User Story 2 - Category Type Disambiguation (Priority: P2)

When two categories share the same name but have different types (one income, one expense), the user needs to clearly distinguish between them to select the correct one.

**Why this priority**: This prevents selection errors when categories have identical names. While less common than the sorting issue, incorrect selection can lead to data integrity problems requiring correction.

**Independent Test**: Can be independently tested by creating two categories with the same name (one income, one expense), opening the dropdown, and verifying each has a clear visual indicator showing its type.

**Acceptance Scenarios**:

1. **Given** both an income category named "Refund" and an expense category named "Refund" exist, **When** the user views the dropdown, **Then** each displays a colored icon (positioned right of the name) that clearly identifies its type
2. **Given** the user needs to filter by expense categories only, **When** they scan the dropdown, **Then** they can immediately identify which "Refund" entry is the expense category
3. **Given** the user selects a category with a specific type indicator, **When** they apply the filter, **Then** only transactions matching both the name and type are displayed

---

### Edge Cases

- Category names containing special characters or starting with numbers (e.g., "401k Contribution") will sort using standard Unicode/ASCII collation, placing numeric prefixes before alphabetic characters.
- When there are no categories of a particular type (all income or all expense), type icons will still be displayed for all categories to maintain consistent UI behavior.
- For users with many categories beyond the SC-004 threshold (>100 categories), alphabetical sorting will aid findability, but no additional performance requirements are defined.
- Category names that differ only in case (e.g., "Travel" vs "travel") are treated as distinct categories and will be shown separately; they will be sorted together using case-insensitive sorting but displayed with their original casing preserved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all categories in the transaction filter dropdown sorted alphabetically in a single unified list, regardless of category type (income or expense)
- **FR-002**: System MUST use case-insensitive alphabetical sorting for category names using standard Unicode/ASCII collation (e.g., "Travel" and "travel" should sort together; numeric prefixes like "401k" sort before alphabetic characters)
- **FR-003**: System MUST display a visual indicator for each category showing whether it is an income or expense category
- **FR-004**: System MUST maintain the visual indicator consistently throughout the selection and display process
- **FR-005**: System MUST preserve existing filter functionality - selecting a category should filter transactions by both name and type
- **FR-006**: Visual indicators MUST use colored icons positioned to the right of the category name, matching the icon design used on the category page tabs, ensuring clear visual distinction between income and expense categories
- **FR-007**: System MUST display type icons for all categories consistently, regardless of whether both income and expense categories are present

### Key Entities

- **Category**: Represents a classification for transactions; has a name (string, case-sensitive) and type (income or expense). Multiple categories may share the same name if they have different types. Categories with names that differ only in case (e.g., "Travel" vs "travel") are treated as distinct entities.
- **Transaction**: References a category; filtering by category should match both the category name and type.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can locate a specific category in the dropdown 40-60% faster compared to the current separate-sorting approach (measured by time from dropdown open to category selection)
- **SC-002**: Zero user-reported incidents of confusion or incorrect selection when income and expense categories share the same name
- **SC-003**: 95% of users successfully select the correct category type on their first attempt when duplicated names exist
- **SC-004**: Category dropdown renders and displays sorted list in under 300ms for up to 100 categories
- **SC-005**: User satisfaction with category filtering increases measurably (via user feedback or survey) after implementation

## Assumptions

- The application currently has a transaction filter with a category dropdown that displays categories
- Categories are already typed as either "income" or "expense" in the data model
- The current implementation sorts categories in two groups (income categories together, expense categories together) rather than globally
- Users may create categories with identical names for different types (this is an allowed use case)
- The category page tabs already have an established colored icon design that distinguishes income from expense categories, which will be reused in the dropdown
- Standard web accessibility guidelines should be followed for visual indicators (icons provide visual distinction beyond color alone)

## Dependencies

- No external dependencies
- Assumes access to existing category data including name and type
- Assumes existing dropdown component can be modified or replaced to support the new sorting and display requirements

## Constraints

- Must maintain backward compatibility with existing transaction filter functionality
- Must not break any existing category selection or filtering logic
- Should follow the application's existing design system for visual indicators (colors, icons, typography)
