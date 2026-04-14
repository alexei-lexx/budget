## ADDED Requirements

### Requirement: Custom domain configuration

The system SHALL support an optional custom domain for the frontend application. When no custom domain is configured, the system SHALL behave exactly as it does without custom domain support.

#### Scenario: Custom domain enabled

- **GIVEN** a custom domain has been configured for the environment
- **WHEN** the deployment runs
- **THEN** the frontend SHALL be accessible at the configured custom domain
- **AND** the default auto-generated application URL SHALL remain accessible

#### Scenario: Custom domain not configured

- **GIVEN** no custom domain has been configured for the environment
- **WHEN** the deployment runs
- **THEN** the deployment SHALL proceed normally with the default auto-generated application URL only

### Requirement: HTTPS enforcement on custom domain

The system SHALL serve the frontend over HTTPS when accessed via the custom domain.

#### Scenario: HTTPS access via custom domain

- **GIVEN** a custom domain is configured and the application is deployed
- **WHEN** a user visits the custom domain over HTTP
- **THEN** the system SHALL redirect the user to HTTPS

#### Scenario: Secure connection on custom domain

- **GIVEN** a custom domain is configured and the application is deployed
- **WHEN** a user accesses the app via the custom domain
- **THEN** the connection SHALL be secure and the browser SHALL indicate the connection is trusted

### Requirement: Authentication works via custom domain

The system SHALL allow users to sign in and sign out when accessing the app via the custom domain.

#### Scenario: Sign in via custom domain

- **GIVEN** a custom domain is configured and the application is deployed
- **WHEN** a user initiates sign-in from the custom domain
- **THEN** the authentication flow SHALL complete successfully
- **AND** the user SHALL be redirected back to the custom domain after sign-in

#### Scenario: Sign out via custom domain

- **GIVEN** a user is authenticated and accessing the app via the custom domain
- **WHEN** the user signs out
- **THEN** the user SHALL be redirected back to the custom domain after sign-out

### Requirement: Custom domain URL is discoverable

When a custom domain is configured, the custom domain URL SHALL be available to operators after deployment.

#### Scenario: Custom domain URL available after deployment

- **GIVEN** a custom domain has been configured for the environment
- **WHEN** a deployment completes
- **THEN** the custom domain URL SHALL be available in the deployment information

#### Scenario: Default application URL always available

- **GIVEN** any environment, with or without a custom domain configured
- **WHEN** a deployment completes
- **THEN** the default auto-generated application URL SHALL always be available in the deployment information

### Requirement: Custom domain setup documentation

The system documentation SHALL explain how to set up a custom domain, including prerequisites and configuration steps.

#### Scenario: User follows setup documentation

- **GIVEN** a user wants to configure a custom domain for their environment
- **WHEN** a user follows the custom domain setup instructions in the documentation
- **THEN** the user SHALL be able to configure a working custom domain for their environment
