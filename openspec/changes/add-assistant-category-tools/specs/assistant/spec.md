## ADDED Requirements

### Requirement: Category Creation from Natural Language

The system SHALL let the user create a new category by describing it in natural language through the Assistant. When the user's message provides enough detail to identify a category name and type (INCOME or EXPENSE), the Assistant SHALL create the category and confirm it in the answer. When required details are missing, the Assistant SHALL ask for them instead of creating the category. When the requested category name is a semantic near-variant of an existing category (for example pluralisation, typos, abbreviations, or synonyms), the Assistant SHALL ask the user to confirm before creating. When the Assistant cannot create the category because it would conflict with an existing category or violate another business rule, the Assistant's answer SHALL explain what went wrong.

#### Scenario: User describes a new category with a name and type

- **GIVEN** the user does not already have a category with the same name
- **WHEN** the user submits "create an expense category called Groceries"
- **THEN** a new category is created with the requested name and type, and the Assistant's answer confirms the category was created

#### Scenario: Required details are missing

- **WHEN** the user submits a request to create a category without enough detail to identify a name or type
- **THEN** no category is created and the Assistant's answer explains what is missing

#### Scenario: Requested name is a semantic near-variant of an existing category

- **GIVEN** the user already has a category whose name is a semantic near-variant of the requested name (pluralisation, typo, abbreviation, or synonym)
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

The system SHALL let the user rename an existing category or change its type through the Assistant. The Assistant SHALL identify which category the user means before applying any change; when the user's message is ambiguous about which category to update, the Assistant SHALL ask a clarifying question instead of guessing. When the requested new name is a semantic near-variant of another existing category (pluralisation, typos, abbreviations, or synonyms), the Assistant SHALL ask the user to confirm before applying the rename. When the Assistant cannot apply the update because it would conflict with an existing category or violate another business rule, the Assistant's answer SHALL explain what went wrong.

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

#### Scenario: New name is a semantic near-variant of another existing category

- **GIVEN** the user has another category whose name is a semantic near-variant of the requested new name
- **WHEN** the user submits a rename request with that near-variant name
- **THEN** no category is renamed and the Assistant asks the user to confirm whether they want to proceed or meant the other category

#### Scenario: Service rejects the update

- **WHEN** the user submits an update that violates a business rule (for example renaming to an exact duplicate)
- **THEN** no category is updated and the Assistant's answer explains why the update could not be applied
