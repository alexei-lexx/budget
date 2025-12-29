# Feature Specification: Migrate User Lookup from Auth0 ID to Email

**Feature Branch**: `023-email-user-lookup`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "migrate user lookup from Auth0 ID to email"

## Clarifications

### Session 2025-12-29

- Q: Do existing users need to take any action (re-login, verify email, update profile) for this migration to work? → A: No, migration is transparent to users
- Q: How should the migration be rolled out to users in production? → A: Immediate full cutover at deployment
- Q: What should happen if an existing user in the database has a null or missing email address? → A: Block authentication - users without email cannot be created or sign in
- Q: If the email-based lookup fails in production, what is the rollback strategy? → A: No rollback support - fix forward only
- Q: Should there be a pre-deployment validation step to check that all existing users have valid email addresses? → A: No, rely on existing data quality assumption

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Backend User Authentication by Email (Priority: P1)

As a backend system, I need to authenticate users by extracting their email from Auth0 JWT tokens and looking them up in the database by email instead of Auth0 user ID, so that user identification is decoupled from the Auth0 provider.

**Why this priority**: This is the core functionality that enables the migration. Without this, the system cannot function with email-based lookups. It must work first before any other improvements.

**Independent Test**: Can be fully tested by sending Auth0 tokens with email claims to any authenticated endpoint and verifying that the correct user is identified and authorized. Delivers immediate value by enabling provider-agnostic user identification.

**Acceptance Scenarios**:

1. **Given** a valid Auth0 JWT token with an email claim, **When** the backend receives an API request, **Then** the user is identified by email and the request is processed successfully
2. **Given** a user exists in the database with a specific email, **When** they authenticate with Auth0 using that email, **Then** the backend successfully looks up and authorizes the user
3. **Given** an Auth0 token without an email claim, **When** the backend processes the token, **Then** the request is rejected with an appropriate error message

---

### User Story 2 - Case-Insensitive Email Matching (Priority: P2)

As a backend system, I need to handle email lookups in a case-insensitive manner so that users with emails like `user@EXAMPLE.com` and `user@example.com` are treated as the same user, preventing duplicate accounts and authentication failures.

**Why this priority**: This prevents data integrity issues and user confusion. While P1 enables basic functionality, this ensures correctness and prevents edge case bugs that could impact user experience.

**Independent Test**: Can be tested by creating test accounts with various email case combinations and verifying that lookups work correctly regardless of case. Delivers value by preventing authentication failures due to case mismatches.

**Acceptance Scenarios**:

1. **Given** a user registered with email `user@example.com`, **When** they authenticate with email `USER@EXAMPLE.COM`, **Then** the backend identifies them as the same user
2. **Given** a user registered with email `User@Example.Com`, **When** they authenticate with email `user@example.com`, **Then** the backend identifies them as the same user
3. **Given** a user attempts to register with an email that differs only in case from an existing user, **When** the system validates the email, **Then** it detects the duplicate and prevents account creation

---

### User Story 3 - Optimized Email Lookups (Priority: P3)

As a backend system, I need the email column to have a unique index so that user lookups by email are performant and database operations complete quickly even as the user base grows.

**Why this priority**: This ensures scalability and performance. While not critical for initial functionality, it prevents performance degradation as the user base grows and is a best practice for database design.

**Independent Test**: Can be tested by measuring query execution times for email lookups and verifying that they use the index. Can be validated independently by checking database schema and running EXPLAIN queries.

**Acceptance Scenarios**:

1. **Given** the email column has a unique index, **When** the database performs a user lookup by email, **Then** the query execution plan shows index usage
2. **Given** thousands of users in the database, **When** an email lookup is performed, **Then** the response time is under 50ms
3. **Given** an attempt to insert duplicate emails, **When** the database enforces the unique constraint, **Then** the operation fails with a constraint violation error

---

### Edge Cases

- What happens when a token contains an email claim with whitespace (e.g., `" user@example.com "`)? System should trim whitespace before lookup.
- How does the system handle tokens missing the email claim entirely? System should reject the request with a clear error message.
- What happens when a user's email in Auth0 doesn't match any email in the database? System should reject authentication and log the incident for investigation.
- What happens if an existing user in the database has a null or missing email address? Authentication is blocked. Users without email cannot be created or sign in.
- How does the system handle very long email addresses (e.g., 254+ characters)? System should validate maximum length according to RFC standards.
- What happens when concurrent requests try to create users with the same email (case-insensitive)? Database unique constraint should prevent duplicates, and application should handle the constraint violation gracefully.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Backend MUST extract the `email` claim from Auth0 JWT tokens instead of the `sub` claim
- **FR-002**: Backend MUST perform all user lookups using email instead of Auth0 user ID
- **FR-003**: Email lookups MUST be case-insensitive, treating emails like `user@EXAMPLE.com` and `user@example.com` as identical
- **FR-004**: Database schema MUST enforce a unique constraint on the email column to prevent duplicate accounts
- **FR-005**: Database schema MUST include an index on the email column for performant lookups
- **FR-006**: Backend MUST validate that the email claim exists in the JWT token before attempting user lookup
- **FR-007**: Backend MUST normalize email addresses (trim whitespace, convert to lowercase) before database operations
- **FR-008**: All existing API endpoints MUST function correctly with email-based user lookup without changes to their external interfaces
- **FR-009**: Error handling MUST provide clear messages when email claim is missing or user is not found
- **FR-010**: System MUST maintain backward compatibility - existing data and functionality must work without requiring user re-registration or any user action

### Key Entities

- **User**: Represents an application user identified by email address. Key attributes include email (unique, indexed, case-insensitive), and relationships to all user-specific data (accounts, transactions, categories, etc.)
- **JWT Token**: Auth0-issued token containing user identity claims. Must include `email` claim for user identification

## Dependencies and Assumptions

### Dependencies

- **Auth0 Authentication**: System currently uses Auth0 for JWT token generation and authentication. This migration assumes Auth0 remains the authentication provider during this phase.
- **Existing User Data**: All users in the database must have valid email addresses populated. Migration assumes email data integrity in existing user records.
- **Database Access**: Backend must have read/write access to user database tables for schema modifications and data operations.

### Assumptions

- **Email Uniqueness**: Each user has exactly one unique email address. No multiple users share the same email.
- **Auth0 Email Claim**: Auth0 JWT tokens include a valid `email` claim for all authenticated users.
- **No Multi-Provider**: Users authenticate through Auth0 only. No other authentication providers are in use during this migration phase.
- **Email as Primary Identifier**: Email address is stable and suitable as a permanent user identifier (users don't frequently change emails).
- **Existing Data Quality**: Current user database records have valid, non-null email addresses for all active users.
- **Future Cognito Migration**: This change is a preliminary step before migrating to AWS Cognito. The email-based lookup will remain valid after the Cognito migration.
- **Deployment Strategy**: Migration will be deployed as an immediate full cutover - all users switch to email-based lookup at deployment time with no gradual rollout phase.
- **Rollback Strategy**: No rollback support planned - any production issues will be resolved by fixing forward with patches or hotfixes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All API endpoints successfully authenticate and authorize users using email-based lookup without errors
- **SC-002**: Case-insensitive email matching works correctly for 100% of authentication attempts, with no duplicate account creation
- **SC-003**: Email-based user lookups complete in under 50ms for 95% of requests
- **SC-004**: Zero production incidents related to user authentication failures after deployment
- **SC-005**: System successfully validates in production environment while still using Auth0, with no rollback required
- **SC-006**: 100% of existing user functionality (transactions, accounts, categories, reports) works without modification after migration
