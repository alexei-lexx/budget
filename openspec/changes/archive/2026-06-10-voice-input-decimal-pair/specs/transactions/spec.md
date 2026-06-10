## ADDED Requirements

### Requirement: Voice Space-Separated Amount Recognition

The system SHALL interpret two adjacent integers separated by a space in voice-originated input as a single decimal amount, where the second integer is the fractional part, padded with a leading zero only when it is a single digit (e.g. "12 54" → 12.54, "12 5" → 12.05). This handles speech-to-text outputs where a spoken price like "twelve fifty-four" becomes "12 54". When the two integers are the only numbers in the input, the system SHALL treat them as a decimal price and look up similar past transactions to confirm the amount is realistic before creating the transaction. This rule applies only to voice-originated input; keyboard-typed input is unaffected.

#### Scenario: Two-digit fractional part in voice input is treated as decimal amount

- **GIVEN** the user says "apples, bananas twelve fifty-four" and speech-to-text transcribes it as "apples, bananas 12 54"
- **WHEN** the agent processes the input knowing it came from voice
- **THEN** the transaction is created with amount 12.54

#### Scenario: Single-digit fractional part in voice input is padded and treated as decimal amount

- **GIVEN** the user says "coffee twelve five" and speech-to-text transcribes it as "coffee 12 5"
- **WHEN** the agent processes the input knowing it came from voice
- **THEN** the transaction is created with amount 12.05

#### Scenario: Keyboard input with two adjacent integers is rejected as multiple amounts

- **GIVEN** the user types "apples, bananas 12 54" using the keyboard
- **WHEN** the agent processes the input knowing it came from keyboard
- **THEN** the transaction is NOT created and an error is returned indicating multiple amounts were found
