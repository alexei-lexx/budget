# Feature Specification: AWS Cognito Migration

**Feature Branch**: `022-cognito-migration`
**Created**: January 20, 2026
**Status**: Draft
**Input**: Technical migration from Auth0 to AWS Cognito for authentication

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authentication Infrastructure Setup (Priority: P1)

System replaces Auth0 authentication infrastructure with AWS Cognito while maintaining the same OIDC-based authentication flow. Users will authenticate through hosted Cognito login pages instead of Auth0 pages. The authentication mechanism (OIDC protocol, JWT tokens, token verification, refresh flow) remains identical—only the identity provider configuration changes.

**Why this priority**: Core infrastructure requirement. All authentication depends on properly configured Cognito user pools and infrastructure-as-code definitions.

**Independent Test**: Deploy Cognito infrastructure to AWS, verify user pool creation, hosted UI configuration, and OIDC endpoints are accessible and properly configured in development environment.

**Acceptance Scenarios**:

1. **Given** AWS CDK stack is deployed, **When** developer inspects AWS Console, **Then** Cognito User Pool exists with correct domain, client configuration, and OIDC settings
2. **Given** Cognito infrastructure is created, **When** developer accesses hosted UI URL, **Then** login page renders with proper branding and configuration
3. **Given** infrastructure deployment completes, **When** developer retrieves OIDC discovery endpoint, **Then** well-known configuration returns valid JWKS URI, authorization endpoint, and token endpoint
4. **Given** development stack exists, **When** production stack is deployed, **Then** separate production user pool is created with identical configuration but isolated resources

---

### User Story 2 - Application Configuration Update (Priority: P2)

Frontend and backend applications receive updated configuration pointing to Cognito endpoints instead of Auth0. The application code remains unchanged except for identity provider URLs and client credentials.

**Why this priority**: Connects infrastructure (P1) to application runtime. Required before testing authentication flow.

**Independent Test**: Update environment variables, restart applications, verify they connect to Cognito discovery endpoints and retrieve JWKS keys successfully without authentication attempts.

**Acceptance Scenarios**:

1. **Given** Cognito infrastructure exists, **When** backend starts with Cognito issuer URL, **Then** JWT verification middleware fetches JWKS from Cognito successfully
2. **Given** frontend is configured with Cognito domain and client ID, **When** application initializes, **Then** OIDC client library establishes connection to Cognito authorization endpoint
3. **Given** configuration files contain Cognito parameters, **When** developer reviews settings, **Then** all Auth0 references are replaced with Cognito equivalents (domain, client ID, issuer)
4. **Given** both environments use separate Cognito pools, **When** switching between development and production, **Then** correct Cognito domain and user pool are referenced

---

### User Story 3 - End-to-End Authentication Flow (Priority: P3)

Users sign in through Cognito hosted UI, receive access and refresh tokens, access protected resources, and refresh tokens before expiry—all using existing application authentication logic.

**Why this priority**: Validates complete integration between Cognito infrastructure (P1) and application configuration (P2). Represents actual user experience.

**Independent Test**: Navigate to application, trigger login flow, complete authentication at Cognito hosted UI, verify application receives tokens and can access GraphQL API.

**Acceptance Scenarios**:

1. **Given** user clicks "Sign In" button, **When** redirected to Cognito hosted UI, **Then** login page displays and accepts valid credentials
2. **Given** user provides valid credentials at Cognito login, **When** authentication succeeds, **Then** user is redirected back to application with authorization code
3. **Given** application receives authorization code, **When** exchanging for tokens, **Then** access token, ID token, and refresh token are obtained from Cognito token endpoint
4. **Given** application has valid access token, **When** making GraphQL request, **Then** backend validates JWT signature using Cognito JWKS and authorizes request
5. **Given** access token is near expiration, **When** application uses refresh token, **Then** new access token is obtained without requiring user re-authentication
6. **Given** user clicks "Sign Out", **When** logout completes, **Then** tokens are cleared and user is redirected to Cognito logout endpoint

---

### Edge Cases

- What happens when Cognito service experiences temporary outage during token validation? → Backend continues validating tokens using cached JWKS keys; no Cognito round-trip needed for signature verification.
- How does system handle JWKS key rotation when Cognito rotates signing keys?
- What occurs if user attempts to use Auth0-issued token after migration?
- How does backend respond when Cognito JWKS endpoint is unreachable during startup? → Backend starts with cached/stale JWKS keys and retries fetching in background; requests are validated against cached keys until fresh keys are obtained.
- What happens when refresh token expires and user must re-authenticate?
- How are existing Auth0 user sessions invalidated after Cognito migration?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create separate Cognito User Pools for development and production environments with email as the sole sign-in identifier and self-registration disabled (`allowAdminCreateUserOnly: true`)
- **FR-002**: System MUST configure Cognito User Pool with Cognito-managed hosted UI domain prefix (not a custom domain) for user authentication
- **FR-003**: System MUST define Cognito infrastructure using AWS CDK for reproducible deployments
- **FR-004**: System MUST configure OIDC client in Cognito User Pool with appropriate callback URLs, logout URLs, and allowed OAuth flows
- **FR-005**: Frontend MUST update OIDC client configuration to use Cognito domain, client ID, and authorization endpoints
- **FR-006**: Backend MUST update JWT verification configuration to use Cognito issuer URL and JWKS endpoint
- **FR-007**: Backend MUST validate JWT access tokens issued by Cognito using public keys from Cognito JWKS endpoint
- **FR-007a**: Backend MUST validate `client_id` claim in Cognito tokens (Cognito does not use `aud` claim in access tokens)
- **FR-007b**: Backend MUST support optional `aud` claim validation for backward compatibility with Auth0
- **FR-008**: Frontend MUST request `openid`, `profile`, and `email` scopes during authorization
- **FR-009**: Frontend MUST request `offline_access` scope to obtain refresh tokens
- **FR-010**: System MUST support refresh token rotation to obtain new access tokens without user interaction
- **FR-011**: System MUST remove all Auth0 client libraries, configuration files, and environment variables
- **FR-012**: System MUST remove Auth0 infrastructure definitions from CDK stacks
- **FR-013**: Documentation MUST be updated to reflect Cognito configuration, endpoints, and deployment procedures
- **FR-014**: Development environment MUST use local development Cognito domain for testing authentication flows
- **FR-015**: Production environment MUST use production Cognito User Pool with separate user base

### Non-Functional Requirements

- **NFR-001**: Migration MUST NOT modify authentication flow logic beyond configuration changes
- **NFR-002**: JWT token structure and claims MUST remain compatible with existing authorization logic
- **NFR-003**: Backend JWT verification code MUST support both Auth0 (`aud` claim) and Cognito (`client_id` claim) validation for backward compatibility
- **NFR-004**: Frontend authentication flow MUST NOT require changes beyond OIDC provider configuration updates
- **NFR-005**: Cognito infrastructure MUST be defined in CDK to eliminate manual AWS Console configuration
- **NFR-006**: Backend MUST cache JWKS keys and continue serving requests using cached keys if Cognito JWKS endpoint becomes temporarily unreachable

### Key Entities *(include if feature involves data)*

- **Cognito User Pool**: AWS resource providing user directory, authentication, and token issuance. Contains user accounts, configured OAuth scopes, hosted UI settings, and OIDC endpoints. Sign-in alias is email only (`signInAliases: { email: true }`).
- **Cognito User Pool Client**: OAuth 2.0 client configuration within User Pool. Defines allowed callback URLs, logout URLs, OAuth flows (authorization code with PKCE), and token expiration settings (access: 1h, ID: 1h, refresh: 30d).
- **Cognito Domain**: Cognito-managed hosted UI domain prefix (e.g., `<prefix>.auth.<region>.amazoncognito.com`) for authentication pages. Provides login and forgot password interfaces (signup disabled; admin-created accounts only).
- **JWKS (JSON Web Key Set)**: Public keys published by Cognito for JWT signature verification. Backend retrieves from Cognito well-known endpoint.
- **Access Token**: JWT issued by Cognito after successful authentication with 1-hour expiration. Used by frontend to authorize GraphQL API requests. Contains user identity claims and expiration.
- **Refresh Token**: Token issued by Cognito with `offline_access` scope with 30-day expiration. Enables obtaining new access tokens without user re-authentication.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All Cognito infrastructure is defined in CDK and can be deployed to AWS in under 5 minutes
- **SC-002**: Frontend successfully redirects users to Cognito hosted UI when authentication is required
- **SC-003**: Backend validates JWT access tokens issued by Cognito without errors
- **SC-004**: Users can authenticate through Cognito hosted UI and access protected GraphQL resources
- **SC-005**: Access tokens are automatically refreshed before expiration without user interaction
- **SC-006**: Zero Auth0 client libraries or configuration remain in codebase after migration
- **SC-007**: Development and production environments operate with isolated Cognito User Pools
- **SC-008**: Migration completes within 2-3 hours of focused development time
- **SC-009**: Backend successfully fetches and caches JWKS from Cognito endpoint at startup
- **SC-010**: Authentication flow completes end-to-end (login redirect → code exchange → token validation → GraphQL access) without errors

## Assumptions *(mandatory)*

- AWS account is already configured and accessible for CDK deployments
- Existing OIDC-based authentication logic in frontend and backend is working correctly with Auth0
- Current users will be manually migrated or recreated in Cognito User Pool (user migration strategy is out of scope)
- Application already uses standard OIDC libraries that support configurable identity providers
- Backend uses standard JWT verification libraries that accept configurable issuer URLs and JWKS endpoints
- Existing callback URLs and logout URLs are known and can be configured in Cognito User Pool Client
- No custom Auth0 features (rules, actions, hooks) are currently in use
- Cognito hosted UI branding defaults are acceptable (custom branding is out of scope)
- User self-service password reset and account management will use Cognito's built-in features
- Multi-factor authentication (MFA) configuration is out of scope for initial migration
- Social identity provider integration (Google, GitHub) is out of scope for initial migration

## Out of Scope

- User data migration from Auth0 to Cognito
- Custom branding or styling of Cognito hosted UI
- Multi-factor authentication configuration
- Social identity provider setup (Google, GitHub, etc.)
- Custom user attributes or profile fields
- Lambda triggers for Cognito lifecycle events
- Advanced security features (risk-based authentication, adaptive authentication)
- User management UI or admin dashboard
- Email template customization for verification or password reset
- Phone number verification or SMS-based authentication
- Account recovery workflows beyond Cognito defaults
- Integration with external SAML or LDAP identity providers

## Clarifications

### Session 2026-02-04

- Q: What primary attribute should users use to sign in to Cognito? → A: Email only
- Q: What token expiration durations should Cognito use? → A: Access token 1 hour, ID token 1 hour, refresh token 30 days
- Q: Should users be able to self-register or admin-created only? → A: Admin-created only
- Q: How should backend behave if JWKS endpoint is unreachable at startup? → A: Start with cached keys, retry in background
- Q: Should Cognito use a managed domain prefix or custom domain? → A: Cognito-managed prefix

### Session 2026-02-06

- Q: How does Cognito token validation differ from Auth0? → A: Cognito access tokens do NOT have an `aud` claim; use `client_id` claim instead. Auth0 uses `aud` claim for validation.
- Q: Should frontend use VITE_AUTH_AUDIENCE for Cognito? → A: Optional. Not used by Cognito, but keep for Auth0 backward compatibility.
- Q: How to maintain backward compatibility with Auth0? → A: Backend supports both validation modes based on environment variables: `AUTH_AUDIENCE` for Auth0 (`aud` claim), `AUTH_CLIENT_ID` for Cognito (`client_id` claim)

## Dependencies

- AWS CDK library and CLI for infrastructure deployment
- Active AWS account with permissions to create Cognito resources
- Existing OIDC client library in frontend (must support configurable providers)
- Existing JWT verification library in backend (must support configurable JWKS endpoints)
- Knowledge of current Auth0 configuration (callback URLs, scopes, token lifetimes)

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| Existing Auth0 users cannot sign in after migration | High | High | Document user migration strategy; consider Cognito user import if needed |
| Token format differences break authorization logic | High | Low | Validate JWT claims structure matches expectations during testing |
| JWKS endpoint becomes unreachable during production | Medium | Low | Implement caching and retry logic for JWKS fetching |
| Cognito hosted UI UX is significantly worse than Auth0 | Medium | High | Accept UX tradeoff as documented in GitHub issue; custom UI is out of scope |
| Configuration errors prevent successful authentication | Medium | Medium | Test thoroughly in development environment before production deployment |
| CDK deployment fails due to AWS resource limits | Low | Low | Verify AWS account limits before deployment |
| Callback URL mismatch prevents redirect after authentication | Medium | Medium | Document all callback URLs and validate in Cognito client configuration |
