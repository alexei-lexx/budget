# Data Model: AWS Cognito Migration

**Feature**: 022-cognito-migration
**Date**: 2026-02-06
**Status**: Complete

## Overview

This migration does not modify application data models. The DynamoDB Users table remains unchanged. This document defines the Cognito infrastructure resources and their configuration.

## Cognito Resources

### User Pool

The central identity repository managing user authentication.

```yaml
UserPool:
  name: "{environment}-budget-user-pool"
  properties:
    signInAliases:
      email: true
      username: false
      phone: false
    selfSignUpEnabled: false  # Admin-created users only
    standardAttributes:
      email:
        required: true
        mutable: true
    passwordPolicy:
      minLength: 8
      requireLowercase: true
      requireUppercase: true
      requireNumbers: true
      requireSymbols: true
    accountRecovery: EMAIL_ONLY
    mfa: OFF  # Out of scope for initial migration
    deletionProtection: ACTIVE  # Prevent accidental deletion
    removalPolicy: RETAIN  # Keep user data on stack deletion
```

**Outputs**:
- User Pool ID: `{region}_{poolId}` (e.g., `us-east-1_abc123def`)
- User Pool ARN: `arn:aws:cognito-idp:{region}:{account}:userpool/{poolId}`

### User Pool Client

OAuth 2.0 client configuration for the frontend application.

```yaml
UserPoolClient:
  name: "{environment}-budget-client"
  properties:
    userPool: UserPool  # Reference to parent pool
    authFlows:
      userPassword: false
      userSrp: true
      custom: false
      adminUserPassword: false
    oAuth:
      flows:
        authorizationCodeGrant: true
        implicitCodeGrant: false
        clientCredentials: false
      scopes:
        - OPENID
        - PROFILE
        - EMAIL
      callbackUrls:
        # Development
        - "http://localhost:5173"
        - "http://localhost:5173/callback"
        # Production (populated from stack props)
        - "{productionUrl}"
        - "{productionUrl}/callback"
      logoutUrls:
        # Development
        - "http://localhost:5173"
        # Production (populated from stack props)
        - "{productionUrl}"
    supportedIdentityProviders:
      - COGNITO  # Native Cognito only; social providers out of scope
    generateSecret: false  # Public client (SPA)
    preventUserExistenceErrors: true  # Security: don't reveal user existence
    tokenValidity:
      accessToken: 1 hour
      idToken: 1 hour
      refreshToken: 30 days
    enableTokenRevocation: true
```

**Outputs**:
- Client ID: UUID format (e.g., `1example23456789`)
- No client secret (public client)

### User Pool Domain

Hosted UI configuration for authentication pages.

```yaml
UserPoolDomain:
  cognitoDomain:
    domainPrefix: "{environment}-budget-auth"
    # Results in: {prefix}.auth.{region}.amazoncognito.com
```

**Outputs**:
- Domain URL: `https://{prefix}.auth.{region}.amazoncognito.com`
- Authorization Endpoint: `{domainUrl}/oauth2/authorize`
- Token Endpoint: `{domainUrl}/oauth2/token`
- Logout Endpoint: `{domainUrl}/logout`

## Token Claims

### Access Token (Cognito)

**Important**: Cognito access tokens do NOT contain an `aud` claim. Use `client_id` for validation.

```json
{
  "sub": "uuid-user-identifier",
  "iss": "https://cognito-idp.{region}.amazonaws.com/{poolId}",
  "client_id": "client-id",
  "token_use": "access",
  "scope": "openid profile email",
  "auth_time": 1234567890,
  "exp": 1234571490,
  "iat": 1234567890,
  "jti": "unique-token-id",
  "username": "user-email@example.com"
}
```

**Comparison with Auth0 Access Token**:
| Claim | Auth0 | Cognito |
|-------|-------|---------|
| `aud` | Present (API identifier) | **NOT present** |
| `client_id` | Not used (`azp` instead) | Present |
| `azp` | Present (client ID) | Not used |

### ID Token

```json
{
  "sub": "uuid-user-identifier",
  "iss": "https://cognito-idp.{region}.amazonaws.com/{poolId}",
  "aud": "client-id",
  "token_use": "id",
  "auth_time": 1234567890,
  "exp": 1234571490,
  "iat": 1234567890,
  "email": "user@example.com",
  "email_verified": true,
  "cognito:username": "user-email@example.com"
}
```

Note: ID tokens DO have an `aud` claim, but the backend validates access tokens, not ID tokens.

## OIDC Discovery Endpoints

Base URL: `https://cognito-idp.{region}.amazonaws.com/{poolId}`

| Endpoint | Path |
|----------|------|
| Discovery | `/.well-known/openid-configuration` |
| JWKS | `/.well-known/jwks.json` |
| Authorization | `{domainUrl}/oauth2/authorize` |
| Token | `{domainUrl}/oauth2/token` |
| UserInfo | `{domainUrl}/oauth2/userInfo` |
| Logout | `{domainUrl}/logout` |

## Environment Configuration

### Frontend (.env)

```bash
# Cognito User Pool issuer URL
VITE_AUTH_ISSUER=https://cognito-idp.{region}.amazonaws.com/{poolId}

# Cognito User Pool Client ID
VITE_AUTH_CLIENT_ID={clientId}

# OAuth scopes to request
VITE_AUTH_SCOPE=openid profile email offline_access

# Audience (optional - not used by Cognito, keep for Auth0 backward compatibility)
# VITE_AUTH_AUDIENCE={apiIdentifier}
```

### Backend (.env)

```bash
# Cognito User Pool issuer URL
AUTH_ISSUER=https://cognito-idp.{region}.amazonaws.com/{poolId}

# Client ID for token validation (validates client_id claim in Cognito tokens)
AUTH_CLIENT_ID={clientId}

# Audience validation (optional for Cognito, required for Auth0)
# Leave empty or remove for Cognito - Cognito access tokens don't have aud claim
# AUTH_AUDIENCE=

# Remove AUTH_CLAIM_NAMESPACE - Cognito uses standard email claim
```

### Backward Compatibility Notes

The backend JWT validation supports both Auth0 and Cognito:

| Provider | Required Variables | Validation |
|----------|-------------------|------------|
| Auth0 | `AUTH_ISSUER`, `AUTH_AUDIENCE` | Validates `aud` claim against `AUTH_AUDIENCE` |
| Cognito | `AUTH_ISSUER`, `AUTH_CLIENT_ID` | Validates `client_id` claim against `AUTH_CLIENT_ID` |
| Transition | All three | Validates both claims (either must match) |

This allows switching back to Auth0 by restoring `AUTH_AUDIENCE` and removing `AUTH_CLIENT_ID`.

## Existing Data Model (Unchanged)

### Users Table (DynamoDB)

No changes to existing user data model:

```yaml
Table: Users
  PrimaryKey:
    id: string (UUID)
  GlobalSecondaryIndex:
    EmailIndex:
      email: string
  Attributes:
    id: string
    email: string
    createdAt: string (ISO 8601)
```

**Note**: The `auth0UserId` field was already removed in a prior migration. Users are identified by email, which is extracted from the Cognito JWT `email` claim.

## State Diagram: Authentication Flow

```
┌─────────────┐     Click Login     ┌──────────────────┐
│  Frontend   │ ──────────────────► │  Cognito         │
│  (Vue App)  │                     │  Hosted UI       │
└─────────────┘                     └────────┬─────────┘
       ▲                                     │
       │                                     │ User authenticates
       │                                     │ with email/password
       │                                     ▼
       │                            ┌──────────────────┐
       │ Authorization code         │  Cognito         │
       │◄───────────────────────────│  Authorization   │
       │                            │  Server          │
       │                            └──────────────────┘
       │
       ▼
┌─────────────┐     Exchange code   ┌──────────────────┐
│  oidc-      │ ──────────────────► │  Cognito Token   │
│  client-ts  │                     │  Endpoint        │
└─────────────┘                     └────────┬─────────┘
       ▲                                     │
       │ Access + ID + Refresh tokens        │
       │◄────────────────────────────────────┘
       │
       ▼
┌─────────────┐     GraphQL + JWT   ┌──────────────────┐
│  Apollo     │ ──────────────────► │  Backend         │
│  Client     │                     │  (Lambda)        │
└─────────────┘                     └────────┬─────────┘
                                             │
                                             │ Verify JWT via
                                             │ cached JWKS
                                             ▼
                                    ┌──────────────────┐
                                    │  Cognito JWKS    │
                                    │  (cached)        │
                                    └──────────────────┘
```
