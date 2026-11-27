# Spec Delta

## MODIFIED Requirements

### Requirement: Mean Reference Line

The system SHALL draw two dashed mean lines, in colors apart from the median lines and from each other.

The first line SHALL be the mean of the completed periods' values. The second SHALL be their mean measured to the same point as the same-point median.

Both means SHALL exclude the running period. A completed period with no transactions SHALL count as zero. With no transactions, both means SHALL be zero.

The system SHALL label the second line with the number of elapsed days.

#### Scenario: Mean of the completed periods

- **GIVEN** completed periods with values 100, 200 and 600
- **WHEN** the user shows the full-period mean line
- **THEN** the full-period mean line sits at 300

#### Scenario: Running period is excluded from the mean

- **GIVEN** completed periods with values 100, 200 and 600, and a running period with a value of 1000
- **WHEN** the user shows the full-period mean line
- **THEN** the full-period mean line sits at 300

#### Scenario: Empty periods count as zero in the mean

- **GIVEN** completed periods with values 300, 0 and 600, where the period with 0 has no transactions
- **WHEN** the user shows the full-period mean line
- **THEN** the full-period mean line sits at 300

#### Scenario: Same-point mean truncates past periods

- **GIVEN** 12 days have elapsed in the running month
- **AND** three completed months have values 1000, 200 and 600, but only 100, 200 and 300 in their first 12 days
- **WHEN** the user shows the same-point mean line
- **THEN** the same-point mean line sits at 200, while the full-period mean line sits at 600

#### Scenario: Empty periods count as zero in the same-point mean

- **GIVEN** 12 days have elapsed in the running month
- **AND** three completed months have 300, 0 and 600 in their first 12 days
- **WHEN** the user shows the same-point mean line
- **THEN** the same-point mean line sits at 300

#### Scenario: Same-point mean line is labelled with the elapsed day count

- **GIVEN** 12 days have elapsed in the running period
- **WHEN** the user reads the chart legend
- **THEN** the same-point mean line is labelled with day 12

### Requirement: Mean Line Visibility

The system SHALL hide both mean lines when the chart loads. The user SHALL be able to show and hide each mean line on its own through its legend entry. The system SHALL NOT remember whether a mean line is shown.

#### Scenario: Mean line is hidden by default and can be shown from the legend

- **GIVEN** a user opens the Trends page
- **WHEN** the chart loads
- **THEN** the legend has an entry for each mean line, but neither line is drawn
- **AND** when the user clicks the entry of one mean line, that line is drawn and the other mean line stays hidden

#### Scenario: Mean line visibility is not remembered

- **GIVEN** a user has shown both mean lines
- **WHEN** the user reloads the Trends page
- **THEN** neither mean line is drawn
