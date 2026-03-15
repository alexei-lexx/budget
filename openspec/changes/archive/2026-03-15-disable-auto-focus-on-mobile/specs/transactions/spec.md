## MODIFIED Requirements

### Requirement: Focus Restored After Natural Language Transaction Creation

The system SHALL return focus to the natural language text input field immediately after a transaction is successfully created on **desktop (non-mobile) devices only**, so the user can enter the next transaction without a manual click. On mobile/touch devices, focus SHALL NOT be restored automatically, to prevent the virtual keyboard from opening unexpectedly.

#### Scenario: Input receives focus after successful creation on desktop

- GIVEN the user submitted natural language text and a transaction was created
- AND the user is on a desktop (non-mobile) device
- WHEN the input field is cleared
- THEN the text input field automatically receives focus

#### Scenario: Input does not receive focus after successful creation on mobile

- GIVEN the user submitted natural language text and a transaction was created
- AND the user is on a mobile device
- WHEN the input field is cleared
- THEN the text input field does NOT automatically receive focus
- AND the virtual keyboard remains closed
