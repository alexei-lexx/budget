# Feature Specification: Monthly Weekday Report Outlier Filtering

**Feature Branch**: `011-weekday-outlier-filter`
**Created**: 2025-11-19
**Status**: Draft
**Input**: User description: "for the existing monthly expense report by weekday I want to improve it becaise some days of a month a have big expenses like rent amount for apartment that significaly inreate total and average amount on these days use so calledconfidence interval that excluded too high expenses from the report for user it looks like a checkbox []- exclude ... (and dont know the right label for that)"
**Scope**: This feature enhances the existing monthly expense report by weekday with statistical outlier filtering. The GraphQL API accepts the `excludeOutliers` parameter for both EXPENSE and INCOME transaction types, though the initial UI implementation focuses on the EXPENSE report (where outlier filtering is most valuable for identifying atypical spending like rent payments). Future iterations may expose outlier filtering for INCOME reports if user demand exists.

## Clarifications

### Session 2025-11-19

- Q: Should the system show a full list of excluded outlier transactions? → A: No, show only the count and total amount in tooltips alongside the regular total and average per day
- Q: Should the outlier filtering checkbox preference be persisted across sessions? → A: No, the checkbox should default to unchecked on each visit
- Q: How should users access the tooltip to view outlier information? → A: Tooltips already exist in the weekday report - add outlier information to existing tooltips
- Q: What additional visual feedback is needed to indicate filtering is active? → A: None - the checkbox state is sufficient; the weekday report is a vertical bar chart, not a table
- Q: Should tooltip show outlier info when filtering is enabled but no outliers detected? → A: No, only show outlier information when count > 0; otherwise show only regular total/average

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter Outliers from Monthly Weekday Report Averages (Priority: P1)

Users need to see typical spending patterns by day of the week without large one-time expenses (like rent, insurance payments) skewing the averages. When a user enables outlier filtering, the report shows average daily spending that reflects normal day-to-day expenses rather than being inflated by occasional large payments.

**Why this priority**: This is the core value of the feature - providing actionable insights about typical spending patterns. Without this, users cannot distinguish between normal daily spending and exceptional expenses.

**Independent Test**: Can be fully tested by enabling the outlier filter checkbox on the weekday expense report and verifying that large expenses (like rent) no longer inflate the average amounts for those days. Delivers immediate value by showing realistic spending patterns.

**Acceptance Scenarios**:

1. **Given** a user has expenses including both regular daily purchases and large monthly bills (rent, insurance), **When** the user views the weekday expense report without filtering, **Then** days with large bills show significantly higher totals and averages in the bar chart
2. **Given** the user views the weekday expense report, **When** the user enables the "Exclude outliers" checkbox (default unchecked), **Then** the bar chart totals and averages recalculate to exclude statistically unusual high expenses
3. **Given** outlier filtering is enabled, **When** the user hovers over or views the tooltip for a weekday bar with excluded transactions, **Then** the tooltip displays the count of excluded outliers and their total amount alongside the regular total and average
4. **Given** outlier filtering is enabled, **When** the user views the report, **Then** the bar chart filtered averages reflect typical day-to-day spending patterns without the influence of large one-time expenses
5. **Given** the user enables outlier filtering and then navigates away from the report, **When** the user returns to the weekday expense report, **Then** the checkbox is unchecked (default state) and filtering is inactive

---

### Edge Cases

- What happens when there are insufficient transactions on a weekday to calculate statistical outliers (e.g., only 1-2 transactions)? → Covered by FR-007: no filtering applied, all transactions included
- How does the system handle weekdays with no expenses at all? → Covered by FR-007: show zero totals regardless of filter state
- What happens when all expenses for a weekday are similar amounts (no clear outliers)? → Tooltip shows only regular total/average (no outlier info displayed)
- How does the system behave when a user has only outlier-type expenses (e.g., only rent payments, no regular purchases)? → Depends on data distribution; if all similar, no outliers detected
- What happens if filtering would exclude all transactions for a particular weekday? → Covered by FR-007: show original values with a warning

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a checkbox control labeled "Exclude unusual expenses" on the weekday expense report interface, with default state unchecked
- **FR-002**: System MUST recalculate total and average amounts for each weekday when outlier filtering is toggled on or off
- **FR-003**: System MUST use a statistical method to identify outliers using the Interquartile Range (IQR) method: values above Q3 + 1.5×IQR are considered outliers (only upper bound applies for expense outlier detection, as we care about unusually high expenses)
- **FR-004**: System MUST apply outlier filtering only to expense calculations (not to the transaction list display)
- **FR-005**: System MUST display the count of excluded outliers and their total amount in tooltips for each weekday when outlier filtering is active and outliers are detected (count > 0)
- **FR-006**: System MUST show outlier information (count and total amount) in the same tooltip that displays regular total and average amounts per weekday; if no outliers are detected for a weekday, tooltip shows only regular total and average
- **FR-007**: System MUST handle edge cases gracefully:
  - Weekdays with fewer than 4 transactions should not apply outlier filtering (insufficient data for statistical analysis)
  - Weekdays with no transactions show zero totals regardless of filter state
  - If all transactions would be excluded, show original values with a warning
- **FR-008**: System MUST recalculate filtering when the report date range changes or new transactions are added

### Key Entities

- **Weekday Expense Summary**: Aggregated expense data for a specific day of the week, including total amount, average amount, transaction count, and currency. When outlier filtering is enabled, also includes count of excluded outliers and their total amount.
- **Outlier Transaction**: An expense transaction identified as statistically unusual based on the IQR method, excluded from average calculations when filtering is enabled

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can enable outlier filtering and see recalculated weekday averages within 1 second of toggling the checkbox
- **SC-002**: Filtered averages accurately reflect typical daily spending by excluding expenses that are more than 1.5× IQR above the third quartile
- **SC-003**: Users can view outlier information (count and total amount) in the same tooltip that displays regular totals and averages for each weekday
- **SC-004**: 90% of users viewing the weekday report with large recurring expenses (like rent) find the filtered view more useful for understanding typical spending patterns
- **SC-005**: Checkbox defaults to unchecked state on every visit to the report (no persistence across sessions)
- **SC-006**: Edge cases (insufficient data, all outliers, no transactions) are handled without errors or confusing displays in 100% of scenarios

## Assumptions

- **Statistical Method**: Using the Interquartile Range (IQR) method for outlier detection as it's robust and widely understood. Values above Q3 + 1.5×IQR are considered outliers.
- **Transaction Type Scope**: The GraphQL API supports outlier filtering for both EXPENSE and INCOME transaction types. The UI implementation targets EXPENSE reports where outlier filtering addresses the primary use case (excluding large recurring expenses like rent from typical spending patterns). While the backend supports INCOME filtering, UI controls are scoped to EXPENSE reports in this phase.
- **Minimum Data Threshold**: Outlier filtering requires at least 4 transactions per weekday to calculate meaningful quartiles. Below this threshold, all transactions are included.
- **Filtering Scope**: Outlier filtering applies only to expense calculations (totals and averages), not to the display of transaction lists. Users can still see all transactions.
- **No Persistence**: The checkbox state is not persisted. It defaults to unchecked on every visit to the report, requiring users to manually enable filtering each time if desired.
- **UI Representation**: The weekday expense report is displayed as a vertical bar chart. The checkbox state itself is sufficient visual feedback for whether filtering is active.
- **UI Feedback**: The checkbox will use the label "Exclude unusual expenses" as this clearly communicates that statistically unusual transactions (like rent payments) are filtered from the calculation set, affecting both totals and averages displayed in the bar chart.
- **Transparency**: Outlier information (count and total amount) is displayed in existing tooltips alongside regular total and average amounts only when outliers are detected. Tooltips show only regular metrics when no outliers exist for a weekday, keeping the interface clean.
- **Performance**: Outlier calculation is performed client-side after fetching transaction data to avoid additional backend queries, given typical transaction volumes are manageable.

## Out of Scope

- **Custom Outlier Thresholds**: Users cannot adjust the statistical threshold (1.5× IQR). The system uses a fixed, industry-standard threshold.
- **Category-Specific Filtering**: Outlier filtering applies to all expense categories uniformly. Users cannot enable filtering for some categories and disable for others.
- **Income Report UI**: Initial implementation provides outlier filtering UI only for EXPENSE reports. The GraphQL API supports INCOME filtering, but UI controls are not exposed for income reports in this phase.
- **Historical Comparison**: The feature does not compare current period outliers to historical patterns or provide trends over time.
- **Manual Outlier Marking**: Users cannot manually mark specific transactions as outliers or override the statistical calculation.
