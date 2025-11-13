# Feature Specification: Monthly Expense Report by Weekday

**Feature Branch**: `010-weekday-expense-report`
**Created**: 2025-11-12
**Status**: Draft
**Input**: User description: "Monthly expense report by week day with total and average spending bars"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Weekday Spending Patterns (Priority: P1)

Users need to understand their spending habits by identifying which days of the week they tend to spend more money. This helps them recognize behavioral patterns tied to specific days (weekend shopping, weekday dining, etc.) and make informed budgeting decisions.

**Why this priority**: This is the core value proposition of the feature. Without this, the feature has no purpose.

**Independent Test**: Can be fully tested by navigating to the Reports page, clicking the "By Weekday" tab, and verifying that a vertical bar chart displays with 7 weekdays showing total and average expense amounts for the current month.

**Acceptance Scenarios**:

1. **Given** user is on the Reports page, **When** they click the "By Weekday" tab, **Then** they see a vertical bar chart with 7 weekdays (Mon-Sun) on the X-axis
2. **Given** the weekday chart is displayed, **When** viewing any weekday, **Then** they see two bars: one for total spending and one for average spending on that day
3. **Given** the chart is displayed, **When** user hovers (desktop) or taps (mobile) on a total bar, **Then** tooltip shows "Weekday: $amount (percentage%)" where percentage is that day's share of total monthly expenses
4. **Given** the chart is displayed, **When** user hovers (desktop) or taps (mobile) on an average bar, **Then** tooltip shows "Weekday: $amount" without percentage
5. **Given** the chart displays weekday data, **When** calculating the average, **Then** average = total ÷ number of times that weekday appeared in the month (not ÷ number of transactions)

---

### User Story 2 - Navigate Between Months (Priority: P2)

Users want to compare their weekday spending patterns across different months to identify long-term trends and seasonal variations.

**Why this priority**: Essential for understanding spending patterns over time, but the core chart display (P1) must work first.

**Independent Test**: Can be tested by clicking the previous/next month arrows and verifying that the chart updates to show the selected month's data.

**Acceptance Scenarios**:

1. **Given** user is viewing the weekday report, **When** they click the "next month" arrow, **Then** the chart updates to show next month's weekday spending data
2. **Given** user is viewing the weekday report, **When** they click the "previous month" arrow, **Then** the chart updates to show previous month's weekday spending data
3. **Given** user navigates to a different month, **When** the month changes, **Then** the month display shows the new month and year (e.g., "November 2025")
4. **Given** user switches between months, **When** returning to current month, **Then** the chart shows current month's data accurately

---

### User Story 3 - Switch Between Report Types (Priority: P3)

Users want to view both category-based and weekday-based expense reports, switching between them while maintaining their selected month.

**Why this priority**: Enhances usability by allowing users to analyze expenses from multiple perspectives, but requires P1 and P2 to be functional first.

**Independent Test**: Can be tested by switching between "By Category" and "By Weekday" tabs and verifying that the selected month persists and the URL updates to allow bookmarking.

**Acceptance Scenarios**:

1. **Given** user is on the "By Category" tab, **When** they click the "By Weekday" tab, **Then** the weekday chart displays for the same month
2. **Given** user is on the "By Weekday" tab, **When** they click the "By Category" tab, **Then** the category report displays for the same month
3. **Given** user selects a specific tab, **When** the tab changes, **Then** the URL updates to reflect the selected tab (bookmarkable)
4. **Given** user has bookmarked a specific tab URL, **When** they visit that URL, **Then** the correct tab is selected and displayed
5. **Given** user switches tabs, **When** tab changes, **Then** the month navigation controls remain visible and functional

---

### Edge Cases

- What happens when a user has no expenses for the selected month?
  - Display consistent empty state message as used in existing reports
  - Do NOT show chart with zero bars

- How does the system handle loading states?
  - Display loading indicator consistent with existing reports
  - Prevent interaction during data fetch

- What happens when an error occurs fetching expense data?
  - Display error message consistent with existing reports
  - Provide retry mechanism if applicable

- How are expenses in multiple currencies displayed?
  - Currency selector dropdown with options:
    - "All" - sums amounts from all currencies without conversion
    - Individual currency options (e.g., "USD", "EUR") - shows only that currency's expenses
  - Selector appears above the chart when user has multiple currencies
  - Default selection: "All"

- What happens when a weekday has zero expenses?
  - Show zero-height bars for both total and average
  - Tooltip shows "$0" for that weekday

- How are weekdays with only 1 occurrence handled?
  - Average bar shows same amount as total bar (total ÷ 1 = total)
  - Chart displays normally

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a new "By Weekday" tab on the Reports page alongside the existing "By Category" tab
- **FR-002**: System MUST calculate total expense amounts for each weekday (Monday through Sunday) for the selected month
- **FR-003**: System MUST calculate average expense amounts for each weekday by dividing total by the number of times that weekday appears in the month
- **FR-004**: System MUST display weekday data as a vertical bar chart with 7 weekday groups on the X-axis and currency amounts on the Y-axis
- **FR-005**: System MUST show two bars per weekday: a dark blue bar for total spending and a light blue bar for average spending
- **FR-006**: System MUST label weekdays as 3-letter abbreviations (Mon, Tue, Wed, Thu, Fri, Sat, Sun) starting with Monday
- **FR-007**: System MUST include a legend below the chart identifying "Total" and "Average" bars
- **FR-008**: System MUST provide month navigation controls (previous/next arrows) shared between report tabs
- **FR-009**: System MUST default to the "By Category" tab when users first visit the Reports page
- **FR-010**: System MUST persist the selected month when users switch between tabs
- **FR-011**: System MUST update the URL when tab selection changes to allow bookmarking
- **FR-012**: System MUST display tooltips on hover (desktop) or tap (mobile) showing detailed amounts
- **FR-013**: Total bar tooltips MUST show format "Weekday: $amount (percentage%)" where percentage is that day's share of total monthly expenses
- **FR-014**: Average bar tooltips MUST show format "Weekday: $amount" without percentage
- **FR-015**: System MUST start Y-axis from $0 for all charts
- **FR-016**: System MUST include grid lines on the chart for readability
- **FR-017**: System MUST include ARIA labels for chart elements for screen reader accessibility
- **FR-018**: System MUST support keyboard navigation for tabs
- **FR-019**: System MUST display consistent empty state message when no expenses exist for selected month
- **FR-020**: System MUST display consistent loading indicators when fetching data
- **FR-021**: System MUST display consistent error messages when data fetch fails
- **FR-022**: System MUST only include expense transactions (exclude income and transfers)
- **FR-023**: System MUST show zero-height bars for weekdays with no expenses
- **FR-024**: Chart bars MUST use sufficient color contrast between dark blue (total) and light blue (average) for accessibility
- **FR-025**: System MUST display a currency selector dropdown above the chart when user has expenses in multiple currencies
- **FR-026**: Currency selector MUST include an "All" option that sums amounts from all currencies without conversion
- **FR-027**: Currency selector MUST include individual options for each currency the user has expenses in
- **FR-028**: Currency selector MUST default to "All" when user has multiple currencies
- **FR-029**: When a specific currency is selected, system MUST display only expenses in that currency
- **FR-030**: Currency selector MUST be hidden when user has expenses in only one currency

### Key Entities

- **Expense Transaction**: Existing transaction records with type=EXPENSE, containing date, amount, and currency information
- **Weekday Aggregation**: Computed data grouping expenses by day of week (Monday-Sunday) with total and average amounts
- **Monthly Report Period**: Time boundary defining which transactions to include in the aggregation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their weekday spending chart within 3 seconds of clicking the "By Weekday" tab
- **SC-002**: Users can identify which weekday has the highest spending at a glance (no more than 5 seconds to determine)
- **SC-003**: Users can navigate between months without full page reload (chart updates in under 2 seconds)
- **SC-004**: Tooltips appear within 300 milliseconds of hover (desktop) or tap (mobile)
- **SC-005**: Chart is readable on mobile devices (minimum 320px screen width) with clear weekday labels
- **SC-006**: All interactive elements (tabs, arrows, bars) are accessible via keyboard navigation
- **SC-007**: Screen readers can announce chart data meaningfully to visually impaired users
- **SC-008**: Users can bookmark a specific tab URL and return to the correct view when visiting that bookmark

## Assumptions

1. **Chart Library**: The system will use an appropriate charting library capable of rendering vertical bar charts with multiple bars per category
2. **Data Source**: Expense transaction data is already available via existing backend APIs with date, amount, and currency fields
3. **Week Start**: Week starts on Monday (international standard) rather than Sunday (US convention)
4. **Currency Format**: Currency amounts display with appropriate symbols ($, €, etc.) based on the expense's currency
5. **Performance**: Current transaction data volume allows for client-side aggregation without performance issues
6. **Browser Support**: Chart renders correctly in all browsers supported by the existing application
7. **Responsive Design**: Application's existing responsive framework provides grid system for chart layout
8. **Date Handling**: Transaction dates are stored with timezone information allowing accurate weekday calculation
9. **Navigation State**: Tab state is preserved in the URL to allow bookmarking
10. **Empty States**: Existing reports already have defined empty state, loading, and error patterns to follow
