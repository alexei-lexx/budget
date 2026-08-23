## MODIFIED Requirements

### Requirement: Sign-Out in Sidebar

The system SHALL display the sign-out button in the main sidebar menu in a consistently discoverable location, accessible on all screen sizes. The system SHALL display the signed-in user's email directly above the sign-out button in the sidebar.

#### Scenario: User signs out from the sidebar

- **GIVEN** an authenticated user with the sidebar accessible
- **WHEN** they click the sign-out button in the sidebar
- **THEN** their session is cleared, all authentication tokens are removed, and they are redirected to the sign-in page

#### Scenario: Sign-out is accessible on all screen sizes

- **GIVEN** an authenticated user on mobile, tablet, or desktop
- **WHEN** they access the sidebar
- **THEN** the sign-out button is visible and functional

#### Scenario: Signed-in user's email is shown above sign-out

- **GIVEN** an authenticated user with the sidebar accessible
- **WHEN** they view the sidebar
- **THEN** their email is displayed directly above the sign-out button

#### Scenario: User's email is no longer shown in the app bar

- **GIVEN** an authenticated user
- **WHEN** they view the top app bar
- **THEN** their email is not displayed there
