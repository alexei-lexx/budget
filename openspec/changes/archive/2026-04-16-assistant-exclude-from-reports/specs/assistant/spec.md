## ADDED Requirements

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

## MODIFIED Requirements

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
