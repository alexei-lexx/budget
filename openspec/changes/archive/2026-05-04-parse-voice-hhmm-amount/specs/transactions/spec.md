## ADDED Requirements

### Requirement: Voice Colon-Amount Recognition

The system SHALL interpret colon-separated digit strings (one or two digits, a colon, one or two digits) in voice-originated input as decimal amounts, where the digits before the colon are the whole part and the digits after are the fractional part. This handles speech-to-text outputs such as "11:23" produced when the user dictates a decimal amount like "eleven twenty three". When the surrounding wording explicitly frames the colon string as a clock time (e.g., "at 12:34", "around 7:30", "by 18:00"), the system SHALL treat it as a time and not as an amount. This rule applies only to voice-originated input; keyboard-typed input is unaffected.

#### Scenario: Bare colon string is recorded as a decimal amount

- **GIVEN** the user says "eleven twenty three" and speech-to-text transcribes it as "11:23"
- **WHEN** the agent processes the input knowing it came from voice
- **THEN** the transaction is created with amount 11.23

#### Scenario: Colon amount in mixed text is recorded as a decimal

- **GIVEN** the user says something that speech-to-text transcribes as "groceries 7:50"
- **WHEN** the agent processes the input knowing it came from voice
- **THEN** the transaction is created with amount 7.50 and a description derived from the remaining wording

#### Scenario: Locative "at" near a colon string is recognised as a place reference

- **GIVEN** the user says something that speech-to-text transcribes as "lunch 11:23 at cafe"
- **WHEN** the agent processes the input knowing it came from voice
- **THEN** the transaction is created with amount 11.23 because "at cafe" identifies a place, not a time

#### Scenario: Time-context wording prevents amount inference from a colon string

- **GIVEN** the user says something that speech-to-text transcribes as "I brought coffee at 12:34"
- **WHEN** the agent processes the input knowing it came from voice
- **THEN** the colon string is treated as a time, no amount can be inferred, and no transaction is created

#### Scenario: Amount alongside an explicit time reference

- **GIVEN** the user says something that speech-to-text transcribes as "transferred 100 at 15:30"
- **WHEN** the agent processes the input knowing it came from voice
- **THEN** the transaction is created with amount 100 and the colon string is ignored as a time reference

#### Scenario: Keyboard submission does not trigger colon-amount disambiguation

- **GIVEN** the user types "11:23" directly via keyboard and submits
- **WHEN** the system processes the input
- **THEN** the colon-amount rule is not applied and the agent does not coerce the colon string into 11.23
