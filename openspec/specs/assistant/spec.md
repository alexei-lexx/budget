# Assistant Specification

## Purpose

This domain covers AI-powered financial Q&A: users ask free-form questions about their finances, and an AI agent queries their accounts, categories, and transactions to compute a plain-text answer. It includes input persistence, validation, and response display.

## Requirements

### Requirement: Question Submission

The system SHALL accept a free-form question and submit it to the AI agent, which answers it in context of prior exchanges within the current session. Submission SHALL be blocked when the question is empty.

#### Scenario: Empty question is blocked

- **GIVEN** the input field is empty or contains only whitespace
- **WHEN** the user attempts to submit
- **THEN** submission is prevented and no AI request is made

#### Scenario: Valid question triggers AI analysis

- **GIVEN** the user has entered a question
- **WHEN** they submit
- **THEN** the AI agent is invoked and a loading indicator is displayed

#### Scenario: Follow-up question is answered in context

- **GIVEN** the user has previously asked questions in the current session
- **WHEN** they submit a follow-up question
- **THEN** the AI agent answers it in context of the prior exchanges in that session

#### Scenario: Only recent exchanges are used as context

- **GIVEN** the user has had a long conversation in the current session
- **WHEN** they submit a new question
- **THEN** only the most recent exchanges are used as context for the AI agent

#### Scenario: Exchanges older than 24 hours are not used as context

- **GIVEN** some prior exchanges occurred more than 24 hours ago
- **WHEN** the user submits a new question
- **THEN** those older exchanges are not included in the context provided to the AI agent

### Requirement: Input Persistence

The system SHALL persist the question text, the last answer, the last agent trace, and the current session between visits, and restore them when the user returns to the Assistant page.

#### Scenario: Stored question is restored on page revisit

- **GIVEN** the user previously entered a question
- **WHEN** they navigate away and return to the Assistant page
- **THEN** the question field is restored to its previous value

#### Scenario: Stored answer is restored on page revisit

- **GIVEN** the user previously received an answer
- **WHEN** they navigate away and return to the Assistant page
- **THEN** the last answer is displayed without requiring re-submission

#### Scenario: Stored agent trace is restored on page revisit

- **GIVEN** the user previously received an answer with an agent trace
- **WHEN** they navigate away and return to the Assistant page
- **THEN** the agent trace trigger button is enabled and opens the trace from the last response

#### Scenario: Empty state is not shown when a stored answer exists

- **GIVEN** a previous answer is available from a previous visit
- **WHEN** the user returns to the Assistant page before submitting a new question
- **THEN** the empty state prompt SHALL NOT be displayed

#### Scenario: Session is resumed on page revisit

- **GIVEN** the user has had a conversation in the current session
- **WHEN** they navigate away and return to the Assistant page
- **THEN** subsequent questions are answered in context of the prior exchanges from that session

### Requirement: AI-Powered Financial Analysis

The system SHALL use an AI agent with access to the user's accounts, categories, and transactions to answer the question. The agent SHALL infer the relevant date range from the question when querying transactions, defaulting to the current month when no time period is specified. When the agent assumes a time period, it SHALL state it in the answer. The agent MAY perform sum, average, and arithmetic calculations.

#### Scenario: Agent infers the date range from the question

- **GIVEN** the user asks a question with a time reference (e.g. "What did I spend on food last month?")
- **WHEN** the AI agent processes the question
- **THEN** it determines the appropriate date range from the question and queries matching transactions

#### Scenario: Agent defaults to current month when no time period is specified

- **GIVEN** the user asks a question with no time reference (e.g. "What did I spend the most on?")
- **WHEN** the AI agent processes the question
- **THEN** it uses the current month as the date range

#### Scenario: Agent states the assumed date range in the answer

- **GIVEN** the agent assumed a time period because the question did not specify one
- **WHEN** the answer is returned
- **THEN** the answer includes the date range the agent assumed

#### Scenario: Agent retrieves data and answers the question

- **GIVEN** the user asks "What did I spend on food last month?"
- **WHEN** the AI agent processes the question
- **THEN** it queries the relevant transactions and returns a plain-text answer summarising the result

#### Scenario: Transaction queries are capped at 365 days

- **GIVEN** the agent determines a date range for a transaction query
- **WHEN** the range exceeds 365 days
- **THEN** the query is rejected by the transactions tool with an error indicating the limit

#### Scenario: Agent can access both active and archived accounts and categories

- **GIVEN** the user has archived accounts or categories that have associated transactions
- **WHEN** the AI agent retrieves data to answer a question
- **THEN** it can access archived entities to ensure complete and accurate answers

### Requirement: Plain Text Response Display

The system SHALL display the AI's answer as plain text, preserving whitespace and line breaks. Markdown formatting SHALL NOT be rendered.

#### Scenario: Answer is displayed as plain text

- **GIVEN** the AI has returned an answer
- **WHEN** the response is shown
- **THEN** the text appears as-is with whitespace and line breaks preserved, without any markdown rendering

### Requirement: Empty and Loading States

The system SHALL display an empty state prompt before any question has been asked, and a loading indicator while the AI is processing a question.

#### Scenario: Empty state is shown before the first question

- **GIVEN** the user opens the Assistant page for the first time
- **WHEN** no question has been submitted yet
- **THEN** an empty state is displayed prompting the user to ask a question

#### Scenario: Loading indicator is shown during AI processing

- **GIVEN** the user has submitted a valid question
- **WHEN** the AI is processing
- **THEN** a loading indicator is displayed in place of the answer area

### Requirement: Error Handling

The system SHALL display an error message when the AI fails to return an answer, without clearing the user's question.

#### Scenario: AI failure shows an error message

- **GIVEN** the user submits a valid question
- **WHEN** the AI service fails or returns an error
- **THEN** an error message is displayed and the question input remains unchanged

### Requirement: Agent Trace Access on Assistant Page

The system SHALL expose the agent trace for each assistant response via the assistant GraphQL mutation. A trigger button SHALL always be visible near the question submit button, starting disabled, and becoming enabled after each completed response — success or failure — to give the user access to the agent trace panel for that response.

#### Scenario: Trace is available after asking a question successfully

- **WHEN** the user submits a question and the AI responds successfully
- **THEN** the agent trace for that response is available and the trigger button becomes enabled

#### Scenario: Trace is available after a failed assistant response

- **WHEN** the user submits a question and the AI response fails
- **THEN** the agent trace for that response is available and the trigger button becomes enabled

#### Scenario: Trigger button is positioned near the submit button

- **WHEN** the assistant page is viewed after a response has been received
- **THEN** the trigger button is displayed in the same area as the question submit button

### Requirement: Voice Input for Assistant Query

The system SHALL provide a mic button inside the natural language text input area on the Assistant page that captures speech via the browser's Web Speech API and auto-submits the transcript to the existing assistant query pipeline. The mic button SHALL only appear on devices where the Web Speech API is supported. Speech recognition SHALL use the user's saved voice input language when set, falling back to the browser's default language when not set.

#### Scenario: Mic button is visible when Web Speech API is supported

- **GIVEN** the user is on the Assistant page
- **WHEN** the browser supports the Web Speech API
- **THEN** a mic button is displayed inside the natural language text input area

#### Scenario: Mic button is hidden when Web Speech API is not supported

- **GIVEN** the user is on the Assistant page
- **WHEN** the browser does not support the Web Speech API
- **THEN** no mic button is displayed and the input area remains fully functional for keyboard input

#### Scenario: Tapping the mic starts recording

- **GIVEN** the mic button is visible and idle
- **WHEN** the user taps the mic button
- **THEN** the browser requests microphone permission if not already granted and speech recognition begins

#### Scenario: Mic icon pulses red while recording

- **GIVEN** speech recognition is active
- **WHEN** the user views the mic button
- **THEN** the mic icon is displayed in red with a pulsing animation to indicate active listening

#### Scenario: Recording auto-stops after silence

- **GIVEN** speech recognition is active
- **WHEN** the user stops speaking and a pause is detected
- **THEN** speech recognition stops automatically without requiring a manual tap to stop

#### Scenario: Transcript is auto-submitted

- **GIVEN** speech recognition has produced a non-empty transcript
- **WHEN** recognition ends
- **THEN** the transcript is submitted to the assistant query pipeline identically to a keyboard submission

#### Scenario: Empty transcript returns to idle silently

- **GIVEN** speech recognition ends with no detected speech
- **WHEN** the transcript is empty
- **THEN** the mic button returns to its idle state and no error or notification is shown to the user

#### Scenario: Tapping the mic does not open the virtual keyboard

- **GIVEN** the user is on a mobile device
- **WHEN** the user taps the mic button (regardless of whether the textarea has focus)
- **THEN** the virtual keyboard does not open

#### Scenario: Mic button and text input are disabled during AI inference

- **GIVEN** a voice transcript has been submitted and AI inference is in progress
- **WHEN** the user views the input area
- **THEN** the mic button and text input are disabled until inference completes

#### Scenario: Voice input uses the user's saved language

- **GIVEN** the user has saved a voice input language in Settings
- **WHEN** they tap the mic button on the Assistant page
- **THEN** speech recognition uses the saved language

#### Scenario: Voice input falls back to browser language when none is saved

- **GIVEN** the user has not saved a voice input language
- **WHEN** they tap the mic button on the Assistant page
- **THEN** speech recognition uses the browser's default language

### Requirement: Transaction Creation from Natural Language

The system SHALL let the user log a transaction by describing it in natural language through the Assistant, in addition to answering finance questions. When the user describes a specific transaction they performed (for example, "bought coffee 5€" or "paid 50 for rent yesterday"), the Assistant SHALL record the transaction and confirm it in the answer. When the user's intent is genuinely ambiguous between logging a transaction and asking a question, the Assistant SHALL ask a clarifying question instead of guessing. When the user describes multiple transactions in a single message, the Assistant SHALL record each of them.

#### Scenario: User describes a single transaction

- **GIVEN** the user has an account and a matching category
- **WHEN** the user submits "bought coffee 5€ today"
- **THEN** a transaction is recorded against the appropriate account and category, and the Assistant's answer confirms the recorded transaction

#### Scenario: User describes multiple transactions in one message

- **GIVEN** the user has accounts and categories that match each described transaction
- **WHEN** the user submits "coffee 5€ and lunch 12€"
- **THEN** two transactions are recorded and the Assistant's answer confirms each of them

#### Scenario: Finance question is answered without creating a transaction

- **WHEN** the user submits "what did I spend on food last month?"
- **THEN** the Assistant answers the question and no transaction is created

#### Scenario: Ambiguous intent triggers a clarifying question

- **GIVEN** the user's message could plausibly be either a transaction log or a question
- **WHEN** the user submits an ambiguous input such as "spent 50 on rent?"
- **THEN** the Assistant asks a clarifying question instead of recording a transaction or answering a question

#### Scenario: Missing required details are surfaced to the user

- **GIVEN** the user describes a transaction without enough detail to identify an account, category, or amount
- **WHEN** the user submits the description
- **THEN** no transaction is recorded and the Assistant's answer explains what is missing

#### Scenario: Mixed turn logs a transaction and answers a question

- **GIVEN** the user has accounts and categories that match the described transaction
- **WHEN** the user submits "log coffee 5€ and show this week's total"
- **THEN** the transaction is recorded and the Assistant's answer also reports the requested total

### Requirement: Voice-Originated Transaction Disambiguation

The system SHALL disambiguate voice-originated amounts when the user logs a transaction through the Assistant. When a transaction description originates from voice input, the Assistant SHALL consider that the transcript may have lost decimal separators during speech recognition and SHALL use the user's past transactions in the same category or account as a reference to choose the most plausible amount. When the same description is submitted by typing, the amount SHALL be interpreted literally.

#### Scenario: Voice input amount is reconciled against past transactions

- **GIVEN** the user submits a transaction description via voice input on the Assistant page
- **AND** the user has past transactions in the same category or account
- **WHEN** the transcript contains an amount that may have lost its decimal separator during speech recognition
- **THEN** the Assistant records the transaction with an amount chosen in light of the user's past transactions rather than blindly using the literal transcript value

#### Scenario: Keyboard input is interpreted literally

- **GIVEN** the user submits a transaction description by typing
- **WHEN** the amount is parsed
- **THEN** the amount is interpreted literally and voice-input disambiguation is not applied

### Requirement: Account Creation from Natural Language

The system SHALL let the user create a new account by describing it in natural language through the Assistant, in addition to answering finance questions and logging transactions. When the user's message provides enough detail to identify an account name and currency, the Assistant SHALL create the account and confirm it in the answer. When required details are missing, the Assistant SHALL ask for them instead of creating the account. When the requested account name is a semantic near-variant of an existing active (non-archived) account (for example pluralisation, typos, abbreviations, or synonyms), the Assistant SHALL ask the user to confirm before creating. Archived accounts are not considered — reusing an archived account's name is not a duplicate. When the user does not state an initial balance, the Assistant SHALL create the account starting at zero. When the Assistant cannot create the account because it would conflict with an existing account or violate another business rule, the Assistant's answer SHALL explain what went wrong.

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

#### Scenario: Requested name is a semantic near-variant of an existing active account

- **GIVEN** the user already has an active (non-archived) account whose name is a semantic near-variant of the requested name (pluralisation, typo, abbreviation, or synonym)
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

The system SHALL let the user rename an existing account or change its currency through the Assistant, in addition to answering finance questions, logging transactions, and creating accounts. The Assistant SHALL identify which account the user means before applying any change; when the user's message is ambiguous about which account to update, the Assistant SHALL ask a clarifying question instead of guessing. When the requested new name is a semantic near-variant of another existing active (non-archived) account (pluralisation, typos, abbreviations, or synonyms), the Assistant SHALL ask the user to confirm before applying the rename. Archived accounts are not considered — reusing an archived account's name is not a duplicate. The Assistant SHALL NOT change an account's initial balance through this flow. When the Assistant cannot apply the update because it would conflict with an existing account or violate another business rule (for example changing the currency of an account that already has transactions), the Assistant's answer SHALL explain what went wrong.

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

#### Scenario: New name is a semantic near-variant of another existing active account

- **GIVEN** the user has another active (non-archived) account whose name is a semantic near-variant of the requested new name
- **WHEN** the user submits a rename request with that near-variant name
- **THEN** no account is renamed and the Assistant asks the user to confirm whether they want to proceed or meant the other account

#### Scenario: User asks to change the initial balance

- **WHEN** the user submits a request to change an account's initial balance through the Assistant
- **THEN** no account is updated and the Assistant's answer explains that the initial balance cannot be changed through chat

#### Scenario: Service rejects the update

- **WHEN** the user submits an update that violates a business rule (for example changing the currency of an account that already has transactions, or renaming to an exact duplicate)
- **THEN** no account is updated and the Assistant's answer explains why the update could not be applied

### Requirement: Category Creation from Natural Language

The system SHALL let the user create a new category by describing it in natural language through the Assistant. When the user's message provides enough detail to identify a category name and type (INCOME or EXPENSE), the Assistant SHALL create the category and confirm it in the answer. When required details are missing, the Assistant SHALL ask for them instead of creating the category. When the requested category name is a semantic near-variant of an existing active (non-archived) category (for example pluralisation, typos, abbreviations, or synonyms), the Assistant SHALL ask the user to confirm before creating. Archived categories are not considered — reusing an archived category's name is not a duplicate. When the Assistant cannot create the category because it would conflict with an existing category or violate another business rule, the Assistant's answer SHALL explain what went wrong. The Assistant MAY set the report-exclusion flag if the user requests it during creation.

#### Scenario: User describes a new category with a name and type

- **GIVEN** the user does not already have a category with the same name
- **WHEN** the user submits "create an expense category called Groceries"
- **THEN** a new category is created with the requested name and type, report-exclusion disabled by default, and the Assistant's answer confirms the category was created

#### Scenario: Required details are missing

- **WHEN** the user submits a request to create a category without enough detail to identify a name or type
- **THEN** no category is created and the Assistant's answer explains what is missing

#### Scenario: Requested name is a semantic near-variant of an existing active category

- **GIVEN** the user already has an active (non-archived) category whose name is a semantic near-variant of the requested name (pluralisation, typo, abbreviation, or synonym)
- **WHEN** the user submits a request to create a new category with that near-variant name
- **THEN** no category is created and the Assistant asks the user to confirm whether they want a new category or meant the existing one

#### Scenario: Requested name is legitimately distinct from similar-sounding categories

- **GIVEN** the user already has categories with similar names that are legitimately distinct (for example "Food" and the user is creating "Food Delivery")
- **WHEN** the user submits a request to create the new category with sufficient detail to distinguish it
- **THEN** the category is created and the Assistant's answer confirms it

#### Scenario: Service rejects the creation

- **WHEN** the user submits a request to create a category that violates a business rule (for example an exact duplicate name)
- **THEN** no category is created and the Assistant's answer explains why the category could not be created

### Requirement: Category Update from Natural Language

The system SHALL let the user rename an existing category, change its type, or toggle its report-exclusion flag through the Assistant. The Assistant SHALL identify which category the user means before applying any change; when the user's message is ambiguous about which category to update, the Assistant SHALL ask a clarifying question instead of guessing. When the requested new name is a semantic near-variant of another existing active (non-archived) category (pluralisation, typos, abbreviations, or synonyms), the Assistant SHALL ask the user to confirm before applying the rename. Archived categories are not considered — reusing an archived category's name is not a duplicate. When the Assistant cannot apply the update because it would conflict with an existing category or violate another business rule, the Assistant's answer SHALL explain what went wrong.

#### Scenario: User renames an existing category

- **GIVEN** the user has an existing category the Assistant can unambiguously identify
- **WHEN** the user submits a request to rename that category to a new name that does not conflict with another category
- **THEN** the category is renamed and the Assistant's answer confirms the rename

#### Scenario: User changes the type of a category

- **GIVEN** the user has an existing category the Assistant can unambiguously identify
- **WHEN** the user submits a request to change that category's type (for example from EXPENSE to INCOME)
- **THEN** the category's type is updated and the Assistant's answer confirms the change

#### Scenario: Target category is ambiguous

- **GIVEN** the user has multiple categories that could plausibly match the user's description
- **WHEN** the user submits a rename or type-change request without enough detail to single out one category
- **THEN** no category is updated and the Assistant asks a clarifying question

#### Scenario: New name is a semantic near-variant of another existing active category

- **GIVEN** the user has another active (non-archived) category whose name is a semantic near-variant of the requested new name
- **WHEN** the user submits a rename request with that near-variant name
- **THEN** no category is renamed and the Assistant asks the user to confirm whether they want to proceed or meant the other category

#### Scenario: Service rejects the update

- **WHEN** the user submits an update that violates a business rule (for example renaming to an exact duplicate)
- **THEN** no category is updated and the Assistant's answer explains why the update could not be applied

### Requirement: Report-Excluded Category Awareness

The Assistant SHALL be aware that categories can be marked to exclude their transactions from financial reports. When listing categories, the Assistant SHALL see which categories are report-excluded. The Assistant SHALL use this information when reasoning about categories and explaining their properties to the user.

#### Scenario: Assistant sees report-exclusion status when listing categories

- **WHEN** the Assistant retrieves categories
- **THEN** each category includes its report-exclusion status

#### Scenario: Assistant explains report-exclusion when asked about a category

- **GIVEN** a category that is marked as report-excluded
- **WHEN** the user asks about that category's properties
- **THEN** the Assistant mentions that the category is excluded from reports

### Requirement: Report-Excluded Category Filtering in Calculations

The Assistant SHALL exclude report-excluded categories from spending and income calculations. When a calculation is report-related (totals, summaries, breakdowns) and the Assistant omits transactions from report-excluded categories, it SHALL mention the omission. For non-report queries (listing transactions, describing a specific category), the Assistant SHALL include all categories regardless of their report-exclusion status.

#### Scenario: Spending calculation excludes report-excluded categories

- **GIVEN** the user has an expense category marked as report-excluded with transactions
- **WHEN** the user asks "how much did I spend last month?"
- **THEN** the Assistant excludes transactions from the report-excluded category and mentions the omission

#### Scenario: Income calculation excludes report-excluded categories

- **GIVEN** the user has an income category marked as report-excluded with transactions
- **WHEN** the user asks "how much did I earn this month?"
- **THEN** the Assistant excludes transactions from the report-excluded category and mentions the omission

#### Scenario: Non-report queries include all categories

- **GIVEN** the user has a category marked as report-excluded
- **WHEN** the user asks "show me my transactions for this week"
- **THEN** transactions from the report-excluded category are included without any omission note

### Requirement: Category Creation with Report-Exclusion Flag

The Assistant SHALL allow setting the report-exclusion flag when creating a category. When the user does not specify the flag, it SHALL default to not excluded.

#### Scenario: User creates a category with report-exclusion enabled

- **WHEN** the user asks the Assistant to create a category and specifies it should be excluded from reports
- **THEN** the category is created with the report-exclusion flag enabled

#### Scenario: User creates a category without specifying report-exclusion

- **WHEN** the user asks the Assistant to create a category without mentioning report exclusion
- **THEN** the category is created with the report-exclusion flag disabled

### Requirement: Category Update with Report-Exclusion Flag

The Assistant SHALL allow toggling the report-exclusion flag when updating a category.

#### Scenario: User enables report-exclusion on an existing category

- **GIVEN** a category that is not excluded from reports
- **WHEN** the user asks the Assistant to exclude it from reports
- **THEN** the category's report-exclusion flag is enabled and the Assistant confirms the change

#### Scenario: User disables report-exclusion on an existing category

- **GIVEN** a category that is excluded from reports
- **WHEN** the user asks the Assistant to include it in reports again
- **THEN** the category's report-exclusion flag is disabled and the Assistant confirms the change
