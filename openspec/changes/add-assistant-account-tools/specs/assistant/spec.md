## ADDED Requirements

### Requirement: Account Creation from Natural Language

The system SHALL let the user create a new account by describing it in natural language through the Assistant, in addition to answering finance questions and logging transactions. When the user's message provides enough detail to identify an account name and currency, the Assistant SHALL create the account and confirm it in the answer. When required details are missing, the Assistant SHALL ask for them instead of creating the account. When the requested account name is a semantic near-variant of an existing account (for example pluralisation, typos, abbreviations, or synonyms), the Assistant SHALL ask the user to confirm before creating. When the user does not state an initial balance, the Assistant SHALL create the account starting at zero. When the Assistant cannot create the account because it would conflict with an existing account or violate another business rule, the Assistant's answer SHALL explain what went wrong.

#### Scenario: User describes a new account with a name and currency

- **GIVEN** the user does not already have an account with the same name
- **WHEN** the user submits "create a savings account in EUR"
- **THEN** a new account is created with the requested name and currency starting at zero, and the Assistant's answer confirms the account was created

#### Scenario: User states an initial balance

- **GIVEN** the user does not already have an account with the same name
- **WHEN** the user submits "open a checking account in USD with 500 already in it"
- **THEN** a new account is created with the requested name, currency, and initial balance, and the Assistant's answer confirms the account

#### Scenario: Required details are missing

- **WHEN** the user submits a request to create an account without enough detail to identify a name or currency
- **THEN** no account is created and the Assistant's answer explains what is missing

#### Scenario: Requested name is a semantic near-variant of an existing account

- **GIVEN** the user already has an account whose name is a semantic near-variant of the requested name (pluralisation, typo, abbreviation, or synonym)
- **WHEN** the user submits a request to create a new account with that near-variant name
- **THEN** no account is created and the Assistant asks the user to confirm whether they want a new account or meant the existing one

#### Scenario: Requested name is legitimately distinct from similar-sounding accounts

- **GIVEN** the user already has accounts with similar names that are legitimately distinct (for example "Savings USD" and the user is creating "Savings EUR")
- **WHEN** the user submits a request to create the new account with sufficient detail to distinguish it
- **THEN** the account is created and the Assistant's answer confirms it

#### Scenario: Service rejects the creation

- **WHEN** the user submits a request to create an account that violates a business rule (for example an exact duplicate name)
- **THEN** no account is created and the Assistant's answer explains why the account could not be created

### Requirement: Account Update from Natural Language

The system SHALL let the user rename an existing account or change its currency through the Assistant, in addition to answering finance questions, logging transactions, and creating accounts. The Assistant SHALL identify which account the user means before applying any change; when the user's message is ambiguous about which account to update, the Assistant SHALL ask a clarifying question instead of guessing. When the requested new name is a semantic near-variant of another existing account (pluralisation, typos, abbreviations, or synonyms), the Assistant SHALL ask the user to confirm before applying the rename. The Assistant SHALL NOT change an account's initial balance through this flow. When the Assistant cannot apply the update because it would conflict with an existing account or violate another business rule (for example changing the currency of an account that already has transactions), the Assistant's answer SHALL explain what went wrong.

#### Scenario: User renames an existing account

- **GIVEN** the user has an existing account the Assistant can unambiguously identify
- **WHEN** the user submits a request to rename that account to a new name that does not conflict with another account
- **THEN** the account is renamed and the Assistant's answer confirms the rename

#### Scenario: User changes the currency of an account with no transactions

- **GIVEN** the user has an existing account with no transactions
- **WHEN** the user submits a request to change that account's currency
- **THEN** the account's currency is updated and the Assistant's answer confirms the change

#### Scenario: Target account is ambiguous

- **GIVEN** the user has multiple accounts that could plausibly match the user's description
- **WHEN** the user submits a rename or currency-change request without enough detail to single out one account
- **THEN** no account is updated and the Assistant asks a clarifying question

#### Scenario: New name is a semantic near-variant of another existing account

- **GIVEN** the user has another account whose name is a semantic near-variant of the requested new name
- **WHEN** the user submits a rename request with that near-variant name
- **THEN** no account is renamed and the Assistant asks the user to confirm whether they want to proceed or meant the other account

#### Scenario: User asks to change the initial balance

- **WHEN** the user submits a request to change an account's initial balance through the Assistant
- **THEN** no account is updated and the Assistant's answer explains that the initial balance cannot be changed through chat

#### Scenario: Service rejects the update

- **WHEN** the user submits an update that violates a business rule (for example changing the currency of an account that already has transactions, or renaming to an exact duplicate)
- **THEN** no account is updated and the Assistant's answer explains why the update could not be applied
