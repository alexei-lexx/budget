# Auth Specification

## Purpose

This domain covers user authentication, session management, and authentication methods. Users sign in through an external identity provider (OIDC/JWT), are provisioned automatically on first login, and can authenticate using passkeys (WebAuthn/FIDO2) as an alternative to passwords.

## Requirements

### Requirement: Sign-In via External Identity Provider

The system SHALL redirect unauthenticated users to the identity provider's login page when they initiate sign-in.

#### Scenario: Unauthenticated user initiates sign-in

- **GIVEN** an unauthenticated user opens the application
- **WHEN** they click the sign-in button
- **THEN** they are redirected to the identity provider's login page

#### Scenario: Successful authentication redirects to transactions page

- **GIVEN** a user authenticates successfully at the identity provider
- **WHEN** they complete the login flow
- **THEN** they are redirected to the transactions page

### Requirement: Automatic User Account Provisioning

The system SHALL automatically create a user account upon the first successful authentication by a new user, without creating duplicates for returning users.

#### Scenario: First-time user account is created

- **GIVEN** a user authenticates for the first time
- **WHEN** the authentication flow completes
- **THEN** a user account is created in the system
- AND the user is redirected to the transactions page

#### Scenario: Returning user is not duplicated

- **GIVEN** an already-registered user
- **WHEN** they sign in again
- **THEN** the existing account is used and no duplicate is created

### Requirement: Sign-Out

The system SHALL clear the user's session and return them to the sign-in page when they sign out.

#### Scenario: User signs out

- **GIVEN** an authenticated user
- **WHEN** they click the sign-out button in the sidebar
- **THEN** their session is cleared and all client-side authentication tokens are removed
- AND they are redirected to the sign-in page

#### Scenario: Signed-out user cannot access protected pages

- **GIVEN** a user who has signed out
- **WHEN** they navigate to a protected page
- **THEN** they are redirected to the sign-in page

### Requirement: Passkey Registration

The system SHALL allow authenticated users to register passkeys using their device's biometric or PIN authentication, and to register multiple passkeys across different devices.

#### Scenario: User adds a passkey

- **GIVEN** a logged-in user
- **WHEN** they access the account management interface and choose to add a passkey
- **THEN** they are prompted to authenticate using their device's biometric or PIN method
- AND the passkey is registered to their account

#### Scenario: User registers a second passkey on a different device

- **GIVEN** a user who already has a passkey registered on one device
- **WHEN** they access the account management interface from a different device and add a passkey
- **THEN** the new passkey is registered without removing the existing one

### Requirement: Passkey Authentication

The system SHALL allow users with registered passkeys to authenticate without entering a password, while keeping password-based authentication available as a fallback.

#### Scenario: User authenticates with passkey

- **GIVEN** a user with a registered passkey
- **WHEN** they initiate login and choose passkey authentication
- **THEN** they can authenticate using their device's biometric or PIN method
- AND they are granted access to the application

#### Scenario: Password remains available as a fallback

- **GIVEN** a user with both a password and registered passkeys
- **WHEN** they log in
- **THEN** they can choose to authenticate with either their password or a passkey

### Requirement: Passkey Management

The system SHALL allow authenticated users to view all registered passkeys and remove individual ones.

#### Scenario: User views registered passkeys

- **GIVEN** a user with one or more registered passkeys
- **WHEN** they access the account management interface
- **THEN** they see a list of all their registered passkeys

#### Scenario: User removes a passkey

- **GIVEN** a user with multiple passkeys registered
- **WHEN** they delete a specific passkey through the account management interface
- **THEN** that passkey is removed and can no longer be used for authentication
- AND the user can still access the application using any remaining authentication method

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
