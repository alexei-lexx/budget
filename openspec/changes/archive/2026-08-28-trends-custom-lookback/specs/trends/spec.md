## MODIFIED Requirements

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
