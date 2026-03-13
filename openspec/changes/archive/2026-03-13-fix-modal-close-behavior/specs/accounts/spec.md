## ADDED Requirements

### Requirement: Dialog Escape Key Dismissal

The system SHALL close any open account form dialog when the user presses Escape,
regardless of which element inside or around the dialog currently holds focus.

#### Scenario: Escape closes the dialog when a form field has focus

- GIVEN an account form dialog is open and an input field has focus
- WHEN the user presses Escape
- THEN the dialog closes and the accounts page is shown

#### Scenario: Escape closes the dialog after an outside-click attempt

- GIVEN an account form dialog is open
- AND the user has previously clicked outside the dialog (triggering the wobble animation)
- WHEN the user presses Escape
- THEN the dialog closes and the accounts page is shown

#### Scenario: Clicking outside the dialog does not close it

- GIVEN an account form dialog is open
- WHEN the user clicks on the page backdrop outside the dialog
- THEN the dialog remains open
- AND a wobble animation plays to indicate the dialog is persistent
