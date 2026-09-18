## MODIFIED Requirements

### Requirement: Trend URL State

The system SHALL encode the applied selection in the URL so the view is bookmarkable and shareable. Opening a URL with an applied selection SHALL restore that selection. Any parameter that is missing or invalid SHALL fall back to its default without showing an error.

When the URL carries no applied-selection parameters at all, the system SHALL restore the user's most recently applied selection instead of the hardcoded defaults, if one was previously stored and is still valid.

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

#### Scenario: Page loads from the last applied selection when the URL carries none

- **GIVEN** a user previously applied Week, lookback 12, USD, and later navigated to the Trends page with a plain URL carrying no selection parameters
- **WHEN** the page loads
- **THEN** the selectors show Week, lookback 12, and USD, and the URL is updated to reflect that selection

## ADDED Requirements

### Requirement: Trend Selection Persistence Across Navigation

The system SHALL remember the user's most recently applied trend selection outside the URL, so it survives navigating away from the Trends page and back. The system SHALL update the remembered selection whenever the applied selection changes, including when the user clears the selection.

The remembered selection SHALL persist only on the device and browser it was set on.

A remembered selection that is missing or invalid SHALL be ignored, with the system falling back to the hardcoded defaults, without showing an error.

#### Scenario: Applying a selection updates the remembered selection

- **GIVEN** a user applies a trend selection
- **WHEN** they later return to the Trends page with no selection in the URL
- **THEN** the page loads with that same selection

#### Scenario: Clearing the selection updates the remembered selection

- **GIVEN** a user had a narrowed selection remembered from a previous visit
- **WHEN** they open the Trends page, clear the selection, then navigate away and back with no selection in the URL
- **THEN** the page loads with the hardcoded defaults, not the previously remembered narrowed selection

#### Scenario: A corrupted remembered selection is ignored

- **GIVEN** the remembered selection stored on the device is not valid, structured data (for example, it is missing or unparsable)
- **WHEN** the user opens the Trends page with no selection in the URL
- **THEN** the page loads with the hardcoded defaults and no error is shown

#### Scenario: A remembered selection with an out-of-range field falls back to that field's default

- **GIVEN** the remembered selection on the device has a lookback outside the 1-to-12 range
- **WHEN** the user opens the Trends page with no selection in the URL
- **THEN** the page loads with the default lookback and no error is shown

#### Scenario: An explicit URL selection is not overridden by the remembered selection

- **GIVEN** a user has a remembered selection for Month, lookback 6, EUR
- **WHEN** they open a Trends URL that explicitly specifies Week, lookback 12, USD
- **THEN** the page loads with Week, lookback 12, USD, and the remembered selection is unaffected until the user applies again
