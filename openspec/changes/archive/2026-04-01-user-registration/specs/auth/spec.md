## ADDED Requirements

### Requirement: Self-Service User Registration

The system SHALL allow new users to create their own account by signing up through the authentication provider's hosted sign-up page, without requiring administrator involvement.

#### Scenario: New user registers via sign-up page

- **WHEN** a new user accesses the sign-up page on the hosted authentication UI
- **THEN** they can create an account by providing their email address and password
- AND they are redirected to the application upon successful registration

#### Scenario: Registered user can sign in after sign-up

- **GIVEN** a user who has just self-registered
- **WHEN** they complete the registration flow
- **THEN** they can sign in with their new credentials and access the application

### Requirement: Registration Toggle

The system SHALL support disabling self-service registration so that no new accounts can be created after the initial setup is complete.

#### Scenario: Registration is disabled by the operator

- **GIVEN** the operator has disabled user registration
- **WHEN** a new user attempts to access the sign-up page
- **THEN** the sign-up option is not available and no new account can be created

#### Scenario: Existing users are unaffected when registration is disabled

- **GIVEN** the operator has disabled user registration
- **WHEN** an existing user signs in
- **THEN** they can authenticate normally and access the application
