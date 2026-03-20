## MODIFIED Requirements

### Requirement: Section Navigation

The system SHALL provide a navigation menu allowing users to move between the major sections of the application: Accounts, Categories, Transactions, Reports, Insight, and Settings. The Settings item SHALL appear below Insight.

#### Scenario: User navigates to a section via menu

- GIVEN an authenticated user on any page
- WHEN they click a section in the navigation menu
- THEN they are taken to that section's page without a full page reload

#### Scenario: Settings item appears below Insight in the nav

- GIVEN an authenticated user viewing the navigation menu
- WHEN they look at the menu items
- THEN Settings is listed immediately below Insight
