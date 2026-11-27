# Spec Delta

## ADDED Requirements

### Requirement: Mean Reference Line

The system SHALL draw a dashed reference line across the chart at the mean of the completed periods' values, in a color apart from the median lines. The mean SHALL exclude the running period. A completed period with no transactions SHALL contribute a value of zero. When the selected slice has no transactions, the mean SHALL be zero.

#### Scenario: Mean of the completed periods

- **GIVEN** completed periods with values 100, 200 and 600
- **WHEN** the user shows the mean line
- **THEN** the mean line sits at 300

#### Scenario: Running period is excluded from the mean

- **GIVEN** completed periods with values 100, 200 and 600, and a running period with a value of 1000
- **WHEN** the user shows the mean line
- **THEN** the mean line sits at 300

#### Scenario: Empty periods count as zero in the mean

- **GIVEN** completed periods with values 300, 0 and 600, where the period with 0 has no transactions
- **WHEN** the user shows the mean line
- **THEN** the mean line sits at 300

### Requirement: Mean Line Visibility

The system SHALL hide the mean line when the chart loads. The user SHALL be able to show and hide the mean line through its legend entry. The system SHALL NOT remember whether the mean line is shown.

#### Scenario: Mean line is hidden by default and can be shown from the legend

- **GIVEN** a user opens the Trends page
- **WHEN** the chart loads
- **THEN** the legend has an entry for the mean line, but the line is not drawn
- **AND** when the user clicks that legend entry, the mean line is drawn
