# Feature Specification: Monthly Expense Report by Weekday

**Feature Branch**: `010-weekday-expense-report`
**Created**: 2025-11-12
**Status**: Draft
**Input**: User description: "Monthly expense report by week day with total and average spending bars"

## Clarifications

### Session 2025-11-14

- Q: What happens after a tap on mobile tooltips? → A: Tooltip persists until user taps elsewhere or another bar
- Q: What is the left-to-right ordering of bars within each weekday group? → A: Total (dark blue) bar on left, Average (light blue) bar on right
- Q: How are percentages calculated when "All" currencies selected? → A: Calculate percentage by treating all currency amounts as equal units
- Q: How should amounts be displayed when "All" currencies selected? → A: Show amounts as numbers without currency symbols when "All" selected; use proper currency symbol when single currency selected
- Q: Should tooltips use abbreviated or full weekday names? → A: Use 3-letter abbreviations in tooltips matching X-axis labels

### Session 2025-11-15

- Q: What should the two menu items be named? → A: "Monthly Report by Category" and "Monthly Report by Weekday"
- Q: What should the URL paths be for the two report pages? → A: "/reports/monthly-category" and "/reports/monthly-weekday"
- Q: When a user navigates between the two report pages, should each page remember its own previously selected month, or always reset to current month? → A: Year/month selection is not shared between pages (each page maintains independent state); users can bookmark specific year/month for each page via URL parameters; navigating via menu defaults to current month

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Weekday Spending Patterns (Priority: P1)

Users need to understand their spending habits by identifying which days of the week they tend to spend more money. This helps them recognize behavioral patterns tied to specific days (weekend shopping, weekday dining, etc.) and make informed budgeting decisions.

**Why this priority**: This is the core value proposition of the feature. Without this, the feature has no purpose.

**Independent Test**: Can be fully tested by navigating to the "Monthly Report by Weekday" page at /reports/monthly-weekday and verifying that a vertical bar chart displays with 7 weekdays showing total and average expense amounts for the current month.

**Acceptance Scenarios**:

1. **Given** user navigates to /reports/monthly-weekday, **When** the page loads, **Then** they see a vertical bar chart with 7 weekdays (Mon-Sun) on the X-axis showing data for the current month
2. **Given** the weekday chart is displayed, **When** viewing any weekday, **Then** they see two bars: one for total spending and one for average spending on that day
3. **Given** the chart is displayed, **When** user hovers (desktop) or taps (mobile) on a total bar, **Then** tooltip shows "{Abbr}: {amount} (percentage%)" format (e.g., "Mon: $100 (23%)") where percentage is that day's share of total monthly expenses
4. **Given** the chart is displayed, **When** user hovers (desktop) or taps (mobile) on an average bar, **Then** tooltip shows "{Abbr}: {amount}" format (e.g., "Mon: $35") without percentage; on mobile, tooltip persists until user taps elsewhere or another bar
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

### User Story 3 - Navigate Between Report Pages (Priority: P3)

Users want to view both category-based and weekday-based expense reports, navigating between them as separate pages in the application menu.

**Why this priority**: Enhances usability by allowing users to analyze expenses from multiple perspectives, but requires P1 and P2 to be functional first.

**Independent Test**: Can be tested by navigating between the two menu items and verifying that each page loads independently with current month data.

**Acceptance Scenarios**:

1. **Given** user is on the "Monthly Report by Category" page, **When** they click the "Monthly Report by Weekday" menu item, **Then** the weekday page loads at /reports/monthly-weekday showing the current month
2. **Given** user is on the "Monthly Report by Weekday" page, **When** they click the "Monthly Report by Category" menu item, **Then** the category page loads at /reports/monthly-category showing the current month
3. **Given** user has navigated to a different month on one report page, **When** they navigate to the other report page via the menu, **Then** that page displays the current month (month selection does not carry over between pages)
4. **Given** user has bookmarked a specific report page URL with year/month parameters (e.g., /reports/monthly-weekday?year=2024&month=3), **When** they visit that bookmark, **Then** the page loads showing the bookmarked year and month
5. **Given** user navigates to a specific month on one page, **When** they bookmark it and navigate to the other page, **Then** each page maintains its own independent year/month state in bookmarks
6. **Given** both menu items exist, **When** viewing either report page, **Then** both "Monthly Report by Category" and "Monthly Report by Weekday" appear in the navigation menu

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
  - Tooltip shows "0" (without currency symbol when "All" selected) or with currency symbol (e.g., "$0") when single currency selected

- How are weekdays with only 1 occurrence handled?
  - Average bar shows same amount as total bar (total ÷ 1 = total)
  - Chart displays normally

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST add two separate menu items: "Monthly Report by Category" and "Monthly Report by Weekday" to the application navigation menu
- **FR-002**: System MUST create a new page at /reports/monthly-weekday for the weekday report
- **FR-003**: System MUST rename the existing reports page to /reports/monthly-category for the category report
- **FR-004**: System MUST calculate total expense amounts for each weekday (Monday through Sunday) for the selected month
- **FR-005**: System MUST calculate average expense amounts for each weekday by dividing total by the number of times that weekday appears in the month
- **FR-006**: System MUST display weekday data as a vertical bar chart with 7 weekday groups on the X-axis and currency amounts on the Y-axis
- **FR-007**: System MUST show two bars per weekday: a dark blue bar for total spending (positioned left) and a light blue bar for average spending (positioned right)
- **FR-008**: System MUST label weekdays as 3-letter abbreviations (Mon, Tue, Wed, Thu, Fri, Sat, Sun) starting with Monday
- **FR-009**: System MUST include a legend below the chart identifying "Total" and "Average" bars
- **FR-010**: System MUST provide month navigation controls (previous/next arrows) on each report page independently
- **FR-011**: System MUST default to the current month when users navigate to either report page via menu (without URL parameters)
- **FR-012**: System MUST support year and month as URL query parameters (e.g., ?year=2024&month=3) to allow bookmarking specific time periods
- **FR-013**: Each report page MUST maintain its own independent year/month state (selection does NOT persist or carry over between pages)
- **FR-014**: System MUST update the URL with current year/month parameters when users navigate between months using arrows
- **FR-015**: System MUST display tooltips on hover (desktop) or tap (mobile) showing detailed amounts; on mobile, tooltip MUST persist until user taps elsewhere or another bar
- **FR-016**: Total bar tooltips MUST show format "{Abbr}: {amount} (percentage%)" where {Abbr} is the 3-letter weekday abbreviation (Mon/Tue/Wed/Thu/Fri/Sat/Sun) and percentage is that day's share of total monthly expenses; when "All" currencies selected, percentage MUST be calculated by treating all currency amounts as equal units and amount MUST be displayed without currency symbol; when single currency selected, amount MUST include currency symbol (e.g., "Mon: $100 (23%)")
- **FR-017**: Average bar tooltips MUST show format "{Abbr}: {amount}" where {Abbr} is the 3-letter weekday abbreviation without percentage; when "All" currencies selected, amount MUST be displayed without currency symbol; when single currency selected, amount MUST include currency symbol (e.g., "Mon: $35")
- **FR-018**: System MUST start Y-axis from 0 for all charts; Y-axis labels MUST display without currency symbol when "All" currencies selected, and with currency symbol when single currency selected
- **FR-019**: System MUST include grid lines on the chart for readability
- **FR-020**: System MUST include ARIA labels for chart elements for screen reader accessibility
- **FR-021**: System MUST support standard keyboard navigation for menu items and page navigation
- **FR-022**: System MUST display consistent empty state message when no expenses exist for selected month
- **FR-023**: System MUST display consistent loading indicators when fetching data
- **FR-024**: System MUST display consistent error messages when data fetch fails
- **FR-025**: System MUST only include expense transactions (exclude income and transfers)
- **FR-026**: System MUST show zero-height bars for weekdays with no expenses
- **FR-027**: Chart bars MUST use sufficient color contrast between dark blue (total) and light blue (average) for accessibility, meeting WCAG 2.1 Level AA standards (minimum 3:1 contrast ratio for graphical objects)
- **FR-028**: System MUST display a currency selector dropdown above the chart when user has expenses in multiple currencies
- **FR-029**: Currency selector MUST include an "All" option that sums amounts from all currencies without conversion
- **FR-030**: Currency selector MUST include individual options for each currency the user has expenses in
- **FR-031**: Currency selector MUST default to "All" when user has multiple currencies
- **FR-032**: When a specific currency is selected, system MUST display only expenses in that currency
- **FR-033**: Currency selector MUST be hidden when user has expenses in only one currency

### Key Entities

- **Expense Transaction**: Existing transaction records with type=EXPENSE, containing date, amount, and currency information
- **Weekday Aggregation**: Computed data grouping expenses by day of week (Monday-Sunday) with total and average amounts
- **Monthly Report Period**: Time boundary defining which transactions to include in the aggregation

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view their weekday spending chart within 3 seconds of navigating to the "Monthly Report by Weekday" page
- **SC-002**: Users can identify which weekday has the highest spending at a glance (no more than 5 seconds to determine)
- **SC-003**: Users can navigate between months without full page reload (chart updates in under 2 seconds)
- **SC-004**: Tooltips appear within 300 milliseconds of hover (desktop) or tap (mobile)
- **SC-005**: Chart is readable on mobile devices (minimum 320px screen width) with clear weekday labels
- **SC-006**: All interactive elements (menu items, arrows, bars) are accessible via keyboard navigation
- **SC-007**: Screen readers can announce chart data meaningfully to visually impaired users
- **SC-008**: Users can bookmark either report page URL with specific year/month and return to the exact same view (page, year, month) when visiting that bookmark
- **SC-009**: Navigating between report pages via menu defaults to current month within 2 seconds
- **SC-010**: Month navigation updates the URL parameters, allowing users to share or bookmark specific time periods

## Assumptions

1. **Chart Library**: The system will use an appropriate charting library capable of rendering vertical bar charts with multiple bars per category
2. **Data Source**: Expense transaction data is already available via existing backend APIs with date, amount, and currency fields
3. **Week Start**: Week starts on Monday (international standard) rather than Sunday (US convention)
4. **Currency Format**: Currency amounts display with appropriate symbols ($, €, etc.) based on the expense's currency
5. **Performance**: Current transaction data volume allows for client-side aggregation without performance issues
6. **Browser Support**: Chart renders correctly in all browsers supported by the existing application
7. **Responsive Design**: Application's existing responsive framework provides grid system for chart layout
8. **Date Handling**: Transaction dates are stored with timezone information allowing accurate weekday calculation
9. **Navigation State**: Each report page has its own distinct URL (/reports/monthly-category and /reports/monthly-weekday) with year/month query parameters for bookmarking specific time periods; navigating via menu defaults to current month; year/month state is independent between pages (not shared)
10. **Empty States**: Existing reports already have defined empty state, loading, and error patterns to follow
11. **Menu Structure**: The application uses a navigation menu system that can accommodate multiple report page links
