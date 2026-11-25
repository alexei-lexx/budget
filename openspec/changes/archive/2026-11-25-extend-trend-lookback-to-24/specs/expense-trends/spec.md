# Spec Delta

## MODIFIED Requirements

### Requirement: Expense Trend Chart

The system SHALL display net expenses as a bar chart, with one bar per period. Bars SHALL be ordered oldest first. The number of bars SHALL equal the chosen lookback plus one. The extra bar SHALL be the period that is currently running.

Each bar's value SHALL be the sum of expenses in that period minus the sum of refunds in that period, for the selected slice.

Each bar SHALL be labelled with the period it covers. The label of a monthly bar SHALL include its year only when the month is January. Inspecting a bar SHALL disclose that period alongside the bar's amount. For a weekly period the disclosed period SHALL be the week's full date range, whether or not the week has finished. For a monthly period it SHALL identify the month and its year.

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

#### Scenario: January bar labels show the year

- **GIVEN** a user has chosen a lookback of 24 months, and the running month is August 2026
- **WHEN** the Trends page loads
- **THEN** the labels of the bars for January 2025 and January 2026 show their year, and the labels of all other bars show only the month

### Requirement: Trend Slice Selection

The system SHALL let the user choose which spending to plot. The user SHALL be able to select:

- any number of categories, and whether to include uncategorized transactions
- the period type: Week or Month
- the lookback: any whole number of completed periods from 1 to 24, defaulting to 3
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

#### Scenario: Any whole number of periods from 1 to 24 can be chosen

- **GIVEN** a user is choosing a lookback
- **WHEN** they pick any whole number from 1 to 24
- **THEN** that number is accepted as the lookback

#### Scenario: A lookback of 1 compares with just the previous period

- **GIVEN** a user sets the lookback to 1
- **WHEN** they apply the selection
- **THEN** the chart shows 2 bars: the previous period and the running period

#### Scenario: A lookback above 24 is not accepted

- **GIVEN** a user opens a Trends URL with a lookback of 25
- **WHEN** the page loads
- **THEN** the default lookback is used and no error is shown
