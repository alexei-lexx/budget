# Navigation Specification

## Purpose

This domain covers application-level navigation and the global UI shell: authentication-aware routing, the sidebar navigation menu, sign-out placement, and form interaction patterns including autofocus and keyboard dismissal.

## Requirements

### Requirement: Authentication-Aware Routing

The system SHALL redirect authenticated users to the transactions page when they access the application root, and redirect unauthenticated users to the sign-in page.

#### Scenario: Authenticated user at root is redirected to transactions

- **GIVEN** an authenticated user
- **WHEN** they open the application root URL
- **THEN** they are automatically redirected to the transactions page

#### Scenario: Unauthenticated user sees the sign-in page

- **GIVEN** an unauthenticated user
- **WHEN** they open the application
- **THEN** they see the sign-in page

#### Scenario: Session-expired user is returned to sign-in

- **GIVEN** a user whose authentication session has expired
- **WHEN** they attempt to access a protected page
- **THEN** they are redirected to the sign-in page

### Requirement: Section Navigation

The system SHALL provide a navigation menu with items in this order: Transactions, Accounts, Categories, Reports, Insight, Settings.

#### Scenario: User navigates to a section via menu

- **GIVEN** an authenticated user on any page
- **WHEN** they click a section in the navigation menu
- **THEN** they are taken to that section's page without a full page reload

#### Scenario: Navigation menu items appear in the specified order

- **GIVEN** an authenticated user viewing the navigation menu
- **WHEN** they look at the menu items
- **THEN** the items appear in order: Transactions, Accounts, Categories, Reports, Insight, Settings

### Requirement: Sign-Out in Sidebar

The system SHALL display the sign-out button in the main sidebar menu in a consistently discoverable location, accessible on all screen sizes.

#### Scenario: User signs out from the sidebar

- **GIVEN** an authenticated user with the sidebar accessible
- **WHEN** they click the sign-out button in the sidebar
- **THEN** their session is cleared, all authentication tokens are removed, and they are redirected to the sign-in page

#### Scenario: Sign-out is accessible on all screen sizes

- **GIVEN** an authenticated user on mobile, tablet, or desktop
- **WHEN** they access the sidebar
- **THEN** the sign-out button is visible and functional

### Requirement: Form Autofocus

The system SHALL automatically focus the first input field when any form (Account, Category, Transaction, or Transfer) is opened.

#### Scenario: First input field is focused on form open

- **GIVEN** a form is opened
- **WHEN** the form appears
- **THEN** the first input field is automatically focused and ready for keyboard input

### Requirement: Escape Key Dismissal

The system SHALL close any open form and return to the previous view when the user presses the Escape key.

#### Scenario: Escape key closes the form without saving

- **GIVEN** a form is open with focus
- **WHEN** the user presses Escape
- **THEN** the form closes and the previous view is restored without saving changes

### Requirement: Empty State Display

The system SHALL display appropriate empty state messages when a list or report contains no data.

#### Scenario: Empty accounts list shows a message

- **GIVEN** a user with no accounts
- **WHEN** they view the Accounts page
- **THEN** an appropriate empty state message is displayed

#### Scenario: Empty transaction list shows a message

- **GIVEN** a user with no transactions, or no transactions matching the active filters
- **WHEN** they view the Transactions page
- **THEN** an appropriate empty state or "No transactions found" message is displayed
