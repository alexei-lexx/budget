## ADDED Requirements

### Requirement: App Bar Title

The system SHALL show the current page's title in the top app bar. The app bar SHALL be the only place a page's title appears; pages SHALL NOT repeat their own title in the page body.

#### Scenario: Desktop shows app name and page title

- **WHEN** a user views any page on a screen with the sidebar permanently visible
- **THEN** the app bar shows the app name followed by the current page's title

#### Scenario: Mobile and tablet show only the page title

- **WHEN** a user views any page on a screen with the sidebar hidden by default
- **THEN** the app bar shows only the current page's title, without the app name

#### Scenario: Sign-in page has a title like any other page

- **WHEN** an unauthenticated user views the sign-in page
- **THEN** the app bar shows the sign-in page's title, following the same rules as every other page

#### Scenario: Page title is not duplicated in the page body

- **WHEN** a user views any page
- **THEN** the page's title appears only in the app bar, not again in the page content
