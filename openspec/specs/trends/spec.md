# Trends Specification

## Purpose

This domain covers the Trends page. The page plots net expenses for a chosen slice of spending across consecutive periods, and compares the running period against benchmarks drawn from the completed periods.

## Requirements

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
- the lookback: any whole number of completed periods from 1 to 12, defaulting to 3
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

#### Scenario: Any whole number of periods from 1 to 12 can be chosen

- **GIVEN** a user is choosing a lookback
- **WHEN** they pick any whole number from 1 to 12
- **THEN** that number is accepted as the lookback

#### Scenario: A lookback of 1 compares with just the previous period

- **GIVEN** a user sets the lookback to 1
- **WHEN** they apply the selection
- **THEN** the chart shows 2 bars: the previous period and the running period

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

### Requirement: Star a Trend Configuration

The system SHALL provide a star control in the Trend Filters panel. The control SHALL reflect whether the applied trend configuration (period type, lookback, currency, categories, and include-uncategorized) is currently starred.

When the applied configuration is not starred, activating the control SHALL save the applied configuration as a new starred trend configuration on the user's account.

#### Scenario: Star control shows unstarred for a new configuration

- **GIVEN** a user applies a trend configuration that does not match any of their starred configurations
- **WHEN** they view the Trend Filters panel
- **THEN** the star control shows an unstarred state

#### Scenario: Activating the star saves the applied configuration

- **GIVEN** the star control shows unstarred for the applied configuration
- **WHEN** the user activates the star control
- **THEN** the applied configuration is saved to the user's account and the star control shows starred

### Requirement: Unstar a Trend Configuration

When the applied configuration is starred, activating the star control SHALL remove the matching starred configuration from the user's account.

#### Scenario: Activating the star on a starred configuration removes it

- **GIVEN** the applied configuration matches a starred configuration
- **WHEN** the user activates the star control
- **THEN** that starred configuration is removed from the user's account and the star control shows unstarred

### Requirement: Star Reflects a Matching Saved Configuration

The system SHALL treat two trend configurations as equal when they have the same period type, lookback, currency, and include-uncategorized setting, and the same set of categories regardless of order.

The star control SHALL show starred whenever the applied configuration equals any of the user's saved configurations, independent of which action originally saved it.

#### Scenario: Reapplying a starred configuration shows it as starred

- **GIVEN** a user previously starred a configuration for "Groceries", Month, lookback 6, EUR
- **WHEN** they later apply a selection with the same categories, period type, lookback, and currency
- **THEN** the star control shows starred

#### Scenario: Changing one selector clears the starred state

- **GIVEN** the applied configuration matches a starred configuration
- **WHEN** the user changes the lookback and applies the new selection
- **THEN** the star control shows unstarred, since the new configuration no longer matches

#### Scenario: Category order does not affect the match

- **GIVEN** a starred configuration saved with categories "Groceries" and "Transport"
- **WHEN** the user applies a selection with the same two categories chosen in the opposite order
- **THEN** the star control shows starred

### Requirement: Starred Trends List

The system SHALL show a list of the user's starred trend configurations at the top of the Trends page. Each entry SHALL be labelled as "{categories} in last {lookback} {week|weeks|month|months} in {currency}". {categories} is the entry's category names joined with ", ", with "uncategorized" appended when include-uncategorized is set; when the entry has no categories and include-uncategorized is not set, {categories} is "all". The period word is singular ("week"/"month") when lookback is 1 and plural ("weeks"/"months") otherwise, matching the configuration's period type. For example: "food, rent in last 3 months in EUR", "all in last 6 months in USD", "food, uncategorized in last 5 weeks in EUR", "all in last 1 month in USD". The list SHALL be ordered by {categories} ascending (configurations labelled "all" first, then alphabetically), then by period type (month before week), then by lookback descending, then by currency ascending.

The list SHALL NOT be shown when the user has no starred configurations.

#### Scenario: List is shown when starred configurations exist

- **GIVEN** a user has starred two trend configurations
- **WHEN** they open the Trends page
- **THEN** both configurations appear in a list at the top of the page, each labelled per the format above (e.g. "food, rent in last 3 months in EUR")

#### Scenario: List is hidden when there are no starred configurations

- **GIVEN** a user has no starred trend configurations
- **WHEN** they open the Trends page
- **THEN** no starred trends list is shown

#### Scenario: List order follows categories, then period, then lookback

- **GIVEN** a user has starred: no categories in Week, lookback 4, USD; "Groceries" in Month, lookback 3, EUR; "Groceries" in Month, lookback 6, EUR; "Groceries" in Week, lookback 6, EUR; "Transport" in Month, lookback 3, EUR
- **WHEN** they view the starred trends list
- **THEN** the entries appear in this order: "all", "Groceries" Month lookback 6, "Groceries" Month lookback 3, "Groceries" Week lookback 6, "Transport" Month lookback 3

#### Scenario: Same categories, period, and lookback are ordered by currency

- **GIVEN** two starred configurations both for "Groceries", Month, lookback 3 — one in USD and one in EUR
- **WHEN** they view the starred trends list
- **THEN** the EUR entry appears before the USD entry

### Requirement: Applying a Starred Trend Configuration

Clicking an entry in the starred trends list SHALL apply that entry's configuration. The chart, the filter selectors, and the URL SHALL update the same way they do when the user applies a selection directly from the Trend Filters panel.

#### Scenario: Clicking a starred entry applies its configuration

- **GIVEN** a starred entry for Week, lookback 12, USD, with no categories selected
- **WHEN** the user clicks that entry
- **THEN** the chart redraws for that configuration, the filter selectors show Week, lookback 12, and USD, and the URL reflects that configuration

### Requirement: Starred Trends Persist Across Sessions

Starred trend configurations SHALL be saved to the user's account and SHALL be available whenever that user signs in, on any device or browser.

#### Scenario: Starred configurations follow the user across sessions

- **GIVEN** a user starred a trend configuration in one browser session
- **WHEN** they sign in from a different device
- **THEN** the starred trends list on the Trends page includes that configuration
