# Feature Specification: Category Filter Sorting Enhancement

**Feature Branch**: `025-category-filter-sorting`
**Created**: 2026-01-02
**Status**: Draft
**Input**: User description: "Fix category sorting in transaction filter dropdown with global alphabetical sorting and visual type indicators"
**Related Issue**: #64

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

1. **Given** both an income category named "Refund" and an expense category named "Refund" exist, **When** the user views the dropdown, **Then** each displays a visual indicator (such as a prefix, icon, or color) that clearly identifies its type
2. **Given** the user needs to filter by expense categories only, **When** they scan the dropdown, **Then** they can immediately identify which "Refund" entry is the expense category
3. **Given** the user selects a category with a specific type indicator, **When** they apply the filter, **Then** only transactions matching both the name and type are displayed

---

### Edge Cases

- What happens when a category name contains special characters or starts with numbers (e.g., "401k Contribution")? Should these sort before or after alphabetic characters?
- What happens when there are no categories of a particular type (all income or all expense)? The indicator system should still function consistently.
- What happens when a user has many categories (50+)? The alphabetical sorting should make searching easier, but performance should remain acceptable.
- What happens when category names differ only in case (e.g., "Travel" vs "travel")? Case-insensitive sorting should be used for predictability.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display all categories in the transaction filter dropdown sorted alphabetically in a single unified list, regardless of category type (income or expense)
- **FR-002**: System MUST use case-insensitive alphabetical sorting for category names (e.g., "Travel" and "travel" should sort together)
- **FR-003**: System MUST display a visual indicator for each category showing whether it is an income or expense category
- **FR-004**: System MUST maintain the visual indicator consistently throughout the selection and display process
- **FR-005**: System MUST preserve existing filter functionality - selecting a category should filter transactions by both name and type
- **FR-006**: Visual indicators MUST be clearly distinguishable and immediately recognizable (e.g., distinct colors, icons, or text prefixes like "Income:" or "Expense:")

### Key Entities

- **Category**: Represents a classification for transactions; has a name (string) and type (income or expense). Multiple categories may share the same name if they have different types.
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
- Standard web accessibility guidelines should be followed for visual indicators (color alone should not be the only differentiator)

## Dependencies

- No external dependencies
- Assumes access to existing category data including name and type
- Assumes existing dropdown component can be modified or replaced to support the new sorting and display requirements

## Constraints

- Must maintain backward compatibility with existing transaction filter functionality
- Must not break any existing category selection or filtering logic
- Should follow the application's existing design system for visual indicators (colors, icons, typography)
