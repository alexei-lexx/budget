## ADDED Requirements

### Requirement: Trend Filter Panel Layout

The system SHALL place the Categories filter in its own full-width row on the Trends filter panel, above the "Include uncategorized" checkbox and the Currency filter. The system SHALL place the checkbox and the Currency filter in the row below Categories. Whenever the viewport is at least 600 pixels wide, the system SHALL place the checkbox and the Currency filter side by side in that row. Below 600 pixels, the system SHALL stack the checkbox above the Currency filter, each spanning the full row width.

#### Scenario: Filters stack on a narrow mobile screen

- **GIVEN** a user views the Trends page at a viewport width of 400 pixels
- **WHEN** the filter panel renders
- **THEN** the Categories filter spans the full row width in its own row, the "Include uncategorized" checkbox appears in its own row below it, and the Currency filter appears in its own row below the checkbox

#### Scenario: Checkbox and Currency filter sit side by side on a tablet-width screen

- **GIVEN** a user views the Trends page at a viewport width of 700 pixels
- **WHEN** the filter panel renders
- **THEN** the Categories filter spans the full row width in its own row, and the "Include uncategorized" checkbox and the Currency filter appear side by side in the row below it

#### Scenario: Checkbox and Currency filter sit side by side on a desktop-width screen

- **GIVEN** a user views the Trends page at a viewport width of 1200 pixels
- **WHEN** the filter panel renders
- **THEN** the Categories filter spans the full row width in its own row, and the "Include uncategorized" checkbox and the Currency filter appear side by side in the row below it
