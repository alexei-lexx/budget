# Spec Delta

## ADDED Requirements

### Requirement: Starred Trends List Marks the Applied Configuration

The system SHALL visually mark each entry in the starred trends list that equals the applied trend configuration as selected. Equality SHALL follow the same rule as the star control. Entries that do not equal the applied configuration SHALL NOT be marked. Changes to the filter selectors that the user has not applied SHALL NOT change the marking.

#### Scenario: Entry equal to the applied configuration is marked

- **GIVEN** a user has starred a configuration for "Groceries", Month, lookback 6, EUR
- **WHEN** they apply a selection with the same categories, period type, lookback, and currency
- **THEN** that entry in the starred trends list is marked as selected, and no other entry is marked

#### Scenario: Clicking a starred entry marks it

- **GIVEN** a user has two starred configurations and neither equals the applied configuration
- **WHEN** they click one of the entries
- **THEN** that entry is marked as selected, and the other entry is not marked

#### Scenario: No entry is marked when nothing matches

- **GIVEN** a user has starred configurations
- **WHEN** they apply a selection that does not equal any of them
- **THEN** no entry in the starred trends list is marked as selected

#### Scenario: Changing the applied selection moves the marking

- **GIVEN** the applied configuration equals a starred entry, and that entry is marked
- **WHEN** the user changes the lookback and applies the new selection
- **THEN** that entry is no longer marked

#### Scenario: Unapplied changes do not change the marking

- **GIVEN** the applied configuration equals a starred entry, and that entry is marked
- **WHEN** the user changes the lookback but does not apply the selection
- **THEN** that entry stays marked

#### Scenario: Category order does not affect the marking

- **GIVEN** a starred configuration saved with categories "Groceries" and "Transport"
- **WHEN** the user applies a selection with the same two categories chosen in the opposite order
- **THEN** that entry is marked as selected

#### Scenario: All equal entries are marked

- **GIVEN** two starred entries have the same configuration
- **WHEN** the user applies that configuration
- **THEN** both entries are marked as selected

#### Scenario: Marking follows the page load selection

- **GIVEN** a user has a starred configuration for Week, lookback 12, USD, with no categories
- **WHEN** they open a Trends URL that specifies Week, lookback 12, and USD
- **THEN** that entry is marked as selected

#### Scenario: Starring the applied configuration marks the new entry

- **GIVEN** the applied configuration does not equal any starred configuration
- **WHEN** the user activates the star control
- **THEN** the new entry appears in the starred trends list marked as selected
