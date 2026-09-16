## MODIFIED Requirements

### Requirement: Starred Trends List

The system SHALL show a list of the user's starred trend configurations at the top of the Trends page. Each entry SHALL be labelled as "{categories} in last {lookback} {week|weeks|month|months} in {currency}". {categories} is the entry's category names joined with ", ", with "uncategorized" appended when include-uncategorized is set; when the entry has no categories and include-uncategorized is not set, {categories} is "all". The period word is singular ("week"/"month") when lookback is 1 and plural ("weeks"/"months") otherwise, matching the configuration's period type. For example: "food, rent in last 3 months in EUR", "all in last 6 months in USD", "food, uncategorized in last 5 weeks in EUR", "all in last 1 month in USD". The list SHALL be ordered by {categories} ascending (configurations labelled "all" first, then alphabetically), then by period type (month before week), then by lookback descending, then by currency ascending.

The list SHALL NOT be shown when the user has no starred configurations.

Each entry SHALL be visually marked with its period type, so that Week entries are distinguishable from Month entries at a glance without reading the label text.

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

#### Scenario: Week and Month entries are visually distinguishable

- **GIVEN** a user has starred a Week configuration and a Month configuration
- **WHEN** they view the starred trends list
- **THEN** the two entries carry a different visual marking for their period type, distinct from any marking used elsewhere on the entry
