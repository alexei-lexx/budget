## ADDED Requirements

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
