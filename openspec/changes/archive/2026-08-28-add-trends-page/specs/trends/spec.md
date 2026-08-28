## Purpose

This domain covers the Trends page. The page plots net expenses for a chosen slice of spending across consecutive periods, and compares the running period against benchmarks drawn from the completed periods.

## ADDED Requirements

### Requirement: Expense Trend Chart

The system SHALL display net expenses as a bar chart, with one bar per period. Bars SHALL be ordered oldest first. The number of bars SHALL equal the chosen lookback plus one. The extra bar SHALL be the period that is currently running.

Each bar's value SHALL be the sum of expenses in that period minus the sum of refunds in that period, for the selected slice.

Each bar SHALL be labelled with the period it covers, and inspecting a bar SHALL disclose that period alongside the bar's amount. For a weekly period the disclosed period SHALL be the week's full date range, whether or not the week has finished. For a monthly period it SHALL identify the month and its year.

#### Scenario: Chart shows one bar per period

- **GIVEN** a user has chosen a lookback of 6 months
- **WHEN** the Trends page loads
- **THEN** the chart shows 7 bars: 6 completed months and the running month

#### Scenario: Refunds reduce a period's bar

- **GIVEN** a month with €1000 of expenses and €200 of refunds in the selected slice
- **WHEN** the user views that month's bar
- **THEN** the bar shows €800

#### Scenario: Refunds exceeding expenses give a negative bar

- **GIVEN** a month with €300 of refunds and no expenses in the selected slice
- **WHEN** the user views that month's bar
- **THEN** the bar shows −€300

#### Scenario: A period with no transactions is drawn as zero

- **GIVEN** a period with no expenses and no refunds in the selected slice
- **WHEN** the user views the chart
- **THEN** that period is still shown, with a value of zero

#### Scenario: Weekly bar discloses its date range

- **GIVEN** a weekly bar for the week beginning Monday 24 August
- **WHEN** the user inspects it
- **THEN** the week's range is shown, running 24 August to 30 August

#### Scenario: Running week discloses its whole range

- **GIVEN** the running week began Monday 24 August and today is Wednesday 26 August
- **WHEN** the user inspects the running bar
- **THEN** the range still runs 24 August to 30 August, even though the bar counts only through today

#### Scenario: Monthly bar discloses its month and year

- **GIVEN** a monthly bar for August 2026
- **WHEN** the user inspects it
- **THEN** the month and its year are shown

### Requirement: Running Period Treatment

The system SHALL mark the running period visually so it is distinguishable from the completed periods. The running period's value SHALL count only transactions dated up to and including today. Transactions dated after today SHALL be ignored.

#### Scenario: Running period bar is visually distinct

- **GIVEN** a user is viewing the Trends chart
- **WHEN** they look at the last bar
- **THEN** it is coloured differently from the completed periods

#### Scenario: Future-dated transactions are ignored

- **GIVEN** the running month contains a transaction dated three days from today
- **WHEN** the user views the running period's bar
- **THEN** that transaction is not counted in the bar

### Requirement: Median Reference Lines

The system SHALL draw two dashed reference lines across the chart.

The first line SHALL be the median of the completed periods' values.

The second line SHALL be the median of the completed periods measured to the same point. For each completed period, only transactions falling in that period's first N days are counted, where N is the number of days elapsed in the running period. Today counts toward N.

Both lines SHALL exclude the running period from their calculation. When the number of completed periods is even, each median SHALL be the mean of the two middle values. A completed period with no transactions SHALL contribute a value of zero to both medians.

The system SHALL label the second line with the number of elapsed days it reflects.

#### Scenario: Full-period median over an odd number of periods

- **GIVEN** completed periods with values 100, 300 and 200
- **WHEN** the user views the chart
- **THEN** the full-period median line sits at 200

#### Scenario: Full-period median over an even number of periods

- **GIVEN** completed periods with values 100, 200, 300 and 500
- **WHEN** the user views the chart
- **THEN** the full-period median line sits at 250

#### Scenario: Same-point median truncates past periods

- **GIVEN** 12 days have elapsed in the running month
- **WHEN** the user views the same-point median line
- **THEN** it reflects, for each completed month, only the transactions dated in that month's first 12 days

#### Scenario: Same-point line is labelled with the elapsed day count

- **GIVEN** 12 days have elapsed in the running period
- **WHEN** the user reads the chart legend
- **THEN** the same-point median line is labelled with day 12

#### Scenario: Empty periods pull the medians down

- **GIVEN** three of six completed periods have no transactions in the selected slice
- **WHEN** the user views the chart
- **THEN** those periods count as zero in both medians

### Requirement: Trend Slice Selection

The system SHALL let the user choose which spending to plot. The user SHALL be able to select:

- any number of categories, and whether to include uncategorized transactions
- the period type: Week or Month
- the lookback: 3, 6 or 12 completed periods, defaulting to 3
- exactly one currency

When no category is selected and uncategorized is not requested, the system SHALL plot all of the user's expenses in the chosen currency.

Amounts SHALL never be converted between currencies. Only the selected currency is plotted.

#### Scenario: No category restriction by default

- **GIVEN** a user opens the Trends page for the first time
- **WHEN** the page loads
- **THEN** no category is selected, and the chart covers all of the user's expenses in the default currency

#### Scenario: Selecting categories narrows the chart

- **GIVEN** the user selects the "Groceries" and "Transport" categories
- **WHEN** they apply the selection
- **THEN** every bar counts only transactions in those two categories

#### Scenario: Uncategorized transactions can be included

- **GIVEN** the user selects "Groceries" and also chooses to include uncategorized transactions
- **WHEN** they apply the selection
- **THEN** every bar counts "Groceries" transactions and transactions with no category

#### Scenario: Only the selected currency is counted

- **GIVEN** a user with expenses in both EUR and USD
- **WHEN** they select EUR
- **THEN** the chart counts only the EUR expenses, with no conversion applied

#### Scenario: Currency defaults to the user's own currency

- **GIVEN** a user opens the Trends page with no currency in the URL
- **WHEN** the page loads
- **THEN** the currency selector is pre-filled with the user's default currency

#### Scenario: Lookback defaults to three completed periods

- **GIVEN** a user opens the Trends page with no lookback in the URL
- **WHEN** the page loads
- **THEN** the chart shows three completed periods and the running one

### Requirement: Weekly and Monthly Periods

The system SHALL support two period types. Monthly periods SHALL be calendar months. Weekly periods SHALL run Monday to Sunday.

#### Scenario: Monthly periods follow the calendar

- **GIVEN** the user selects the Month period type
- **WHEN** they view the chart
- **THEN** each bar covers one calendar month, from the first day to the last day

#### Scenario: Weekly periods start on Monday

- **GIVEN** the user selects the Week period type
- **WHEN** they view the chart
- **THEN** each bar covers one week, running Monday through Sunday

### Requirement: Excluded Category Filtering in Trends

The system SHALL omit categories marked "Exclude from reports" from the Trends page entirely. Those categories SHALL NOT appear in the category selector. Their transactions SHALL NOT be counted in any bar or in either median.

#### Scenario: Excluded categories are absent from the selector

- **GIVEN** a user with a category marked "Exclude from reports"
- **WHEN** they open the category selector on the Trends page
- **THEN** that category is not offered

#### Scenario: Excluded category transactions are not counted

- **GIVEN** a month whose only transactions belong to categories marked "Exclude from reports"
- **WHEN** the user views that month's bar with no category restriction
- **THEN** the bar shows zero

### Requirement: Apply-Based Selection

The system SHALL update the chart only when the user applies their selection. Changing a selector alone SHALL NOT change the chart.

The system SHALL provide a control that restores all selectors to their defaults.

#### Scenario: Chart does not change until the selection is applied

- **GIVEN** the user changes the lookback from 6 to 12
- **WHEN** they have not yet applied the selection
- **THEN** the chart still shows the previously applied selection

#### Scenario: Applying the selection redraws the chart

- **GIVEN** the user has changed the lookback from 6 to 12
- **WHEN** they apply the selection
- **THEN** the chart redraws with 13 bars

#### Scenario: Clearing restores the defaults

- **GIVEN** the user has applied a narrowed selection
- **WHEN** they clear the selection
- **THEN** the selectors return to their defaults and the chart redraws accordingly

### Requirement: Trend URL State

The system SHALL encode the applied selection in the URL so the view is bookmarkable and shareable. Opening a URL with an applied selection SHALL restore that selection. Any parameter that is missing or invalid SHALL fall back to its default without showing an error.

#### Scenario: Applying the selection writes it to the URL

- **GIVEN** the user selects the Month period type, a lookback of 6, and EUR
- **WHEN** they apply the selection
- **THEN** the URL carries the period type, the lookback, the currency, and any selected categories

#### Scenario: Page loads from a bookmarked URL

- **GIVEN** a user opens a Trends URL specifying weekly periods and a lookback of 12
- **WHEN** the page loads
- **THEN** the selectors show weekly periods and a lookback of 12, and the chart matches

#### Scenario: Invalid URL parameters fall back to defaults

- **GIVEN** a user opens a Trends URL with a lookback of 99
- **WHEN** the page loads
- **THEN** the default lookback is used and no error is shown

#### Scenario: Clearing the selection strips the URL parameters

- **GIVEN** the user has an applied selection reflected in the URL
- **WHEN** they clear the selection
- **THEN** the selection parameters are removed from the URL

### Requirement: Trend Load Failure

The system SHALL show a persistent error message in the page body when the trend data fails to load.

#### Scenario: Failed load shows an in-page error

- **GIVEN** the trend data request fails
- **WHEN** the user views the Trends page
- **THEN** an error message is displayed in the page body and stays visible

### Requirement: Trend Empty State

The system SHALL render a chart of zero bars and zero medians when the selected slice contains no transactions. This SHALL NOT be treated as an error.

#### Scenario: User with no transactions sees zero bars

- **GIVEN** a user with no transactions at all
- **WHEN** they open the Trends page
- **THEN** every bar shows zero and both median lines sit at zero
