## REMOVED Requirements

### Requirement: Sign-Out in Sidebar

**Reason**: Sign-out moves from a standalone, always-visible sidebar row to an item inside a menu opened from the account row. This avoids the row being clipped on short screens.
**Migration**: None required. Users now sign out by opening the account row in the sidebar and selecting "Sign Out" from the menu that appears.

## ADDED Requirements

### Requirement: Account Menu in Sidebar

The system SHALL display an account row in the sidebar. The account row SHALL show the signed-in user's email. The account row SHALL be in a consistently discoverable location, accessible on all screen sizes. Activating the account row SHALL open a menu containing a "Sign Out" item. The account row SHALL display a dropdown indicator icon showing that activating it opens a menu.

#### Scenario: User signs out from the account menu

- **GIVEN** an authenticated user with the sidebar accessible
- **WHEN** they open the account row's menu and select "Sign Out"
- **THEN** their session is cleared, all authentication tokens are removed, and they are redirected to the sign-in page

#### Scenario: Account menu is accessible on all screen sizes

- **GIVEN** an authenticated user on mobile, tablet, or desktop
- **WHEN** they access the sidebar
- **THEN** the account row is visible, and opening it shows a working "Sign Out" option

#### Scenario: Account row shows the signed-in user's email

- **GIVEN** an authenticated user with the sidebar accessible
- **WHEN** they view the sidebar
- **THEN** their email is displayed in the account row

#### Scenario: User's email is no longer shown in the app bar

- **GIVEN** an authenticated user
- **WHEN** they view the top app bar
- **THEN** their email is not displayed there

#### Scenario: Account row indicates it opens a menu

- **GIVEN** an authenticated user with the sidebar accessible
- **WHEN** they view the account row
- **THEN** the row displays a dropdown indicator icon showing that activating it opens a menu
