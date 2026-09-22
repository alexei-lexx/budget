## MODIFIED Requirements

### Requirement: Trend Filter Panel Layout

The system SHALL offer "Uncategorized" as the first item inside the Categories filter dropdown, separated from the category items by a divider, instead of as a separate control. The system SHALL place the Categories filter and the Currency filter in the same row on the Trends filter panel. Whenever the viewport is at least 600 pixels wide, the system SHALL place the Categories filter and the Currency filter side by side in that row. Below 600 pixels, the system SHALL stack the Categories filter above the Currency filter, each spanning the full row width.

#### Scenario: Filters stack on a narrow mobile screen

- **GIVEN** a user views the Trends page at a viewport width of 400 pixels
- **WHEN** the filter panel renders
- **THEN** the Categories filter spans the full row width in its own row, and the Currency filter appears in its own row below it

#### Scenario: Uncategorized appears first in the Categories dropdown, divided from categories

- **GIVEN** a user opens the Categories filter dropdown on the Trends page
- **WHEN** the dropdown list renders
- **THEN** "Uncategorized" appears as the first item, followed by a divider, followed by the category items

#### Scenario: Categories filter and Currency filter sit side by side on a tablet-width screen

- **GIVEN** a user views the Trends page at a viewport width of 700 pixels
- **WHEN** the filter panel renders
- **THEN** the Categories filter and the Currency filter appear side by side in the same row

#### Scenario: Categories filter and Currency filter sit side by side on a desktop-width screen

- **GIVEN** a user views the Trends page at a viewport width of 1200 pixels
- **WHEN** the filter panel renders
- **THEN** the Categories filter and the Currency filter appear side by side in the same row
