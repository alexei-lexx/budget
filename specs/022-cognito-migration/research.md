# Research: AWS Cognito Migration

**Feature**: 022-cognito-migration
**Date**: 2026-02-06
**Status**: Complete

## Research Areas

### 1. OIDC Compatibility Between Auth0 and Cognito

**Decision**: AWS Cognito is fully OIDC-compatible and can replace Auth0 as identity provider.

**Rationale**:
- Cognito implements standard OIDC 1.0 protocol
- Provides `.well-known/openid-configuration` discovery endpoint
- Issues RS256-signed JWTs with standard claims
- Supports authorization code flow with PKCE
- `oidc-client-ts` library (frontend) works with any OIDC-compliant provider

**Alternatives Considered**:
- Continue with Auth0: Rejected due to cost and AWS consolidation goals
- Build custom auth: Rejected as over-engineering for this use case
- AWS IAM Identity Center: Rejected as primarily for workforce identity, not customer identity

### 2. Cognito JWT Token Structure

**Decision**: Cognito JWT claims require minor backend verification changes for `client_id` validation.

**Rationale**:
- Cognito access tokens include claims: `sub`, `iss`, `client_id`, `exp`, `iat` (but NOT `aud`)
- Auth0 access tokens include `aud` claim; Cognito uses `client_id` instead
- Backend must be updated to validate `client_id` claim for Cognito tokens
- Email claim available in ID token and can be configured in access token via custom scopes
- `sub` claim is UUID format (same as Auth0)
- Current backend extracts email via configurable namespace; Cognito uses `email` claim directly

**Key Differences from Auth0**:
| Claim | Auth0 | Cognito |
|-------|-------|---------|
| Issuer format | `https://tenant.auth0.com/` | `https://cognito-idp.{region}.amazonaws.com/{poolId}` |
| Email location | Custom namespace or standard | Standard `email` claim in ID token |
| Audience (`aud`) | Present in access token (API identifier) | NOT present in access token |
| Client ID | `azp` claim | `client_id` claim |

**Migration Impact**:
- Update `AUTH_ISSUER` environment variable
- Add `AUTH_CLIENT_ID` for Cognito `client_id` claim validation
- Make `AUTH_AUDIENCE` optional (not used by Cognito, kept for Auth0 backward compatibility)
- Simplify email extraction (no namespace needed with Cognito)

### 3. JWKS Caching with Cognito

**Decision**: Existing `jwks-rsa` caching configuration works unchanged with Cognito JWKS endpoint.

**Rationale**:
- Cognito publishes JWKS at `https://cognito-idp.{region}.amazonaws.com/{poolId}/.well-known/jwks.json`
- Current backend already caches JWKS keys for 10 hours
- Cognito key rotation is infrequent (typically months/years)
- Cache-miss fallback handles key rotation automatically

**Alternatives Considered**:
- Pre-fetch JWKS at startup: Current lazy-loading approach is simpler and sufficient
- Increase cache TTL: 10 hours is already conservative; no change needed

### 4. Cognito Hosted UI vs Custom UI

**Decision**: Use Cognito Hosted UI (managed domain prefix).

**Rationale**:
- Zero frontend code changes required
- Cognito handles all authentication UI (login, password reset, MFA)
- Managed domain prefix (`prefix.auth.region.amazoncognito.com`) is free
- Custom domain requires ACM certificate management (out of scope)
- Spec explicitly states custom branding is out of scope

**Alternatives Considered**:
- Custom UI with Cognito API: Rejected as requires significant frontend development
- Custom domain: Rejected as requires ACM certificate management

### 5. Refresh Token Handling

**Decision**: Existing refresh token mechanism is compatible with Cognito.

**Rationale**:
- Cognito supports refresh token rotation via `REFRESH_TOKEN_AUTH` flow
- Current frontend uses `automaticSilentRenew: true` which works with any OIDC provider
- Current frontend mutex protection prevents parallel refresh requests (important for token rotation)
- Cognito refresh tokens configurable up to 10 years (spec requires 30 days)

**Token Configuration (from spec)**:
- Access token: 1 hour
- ID token: 1 hour
- Refresh token: 30 days

### 6. Cognito CDK Configuration Best Practices

**Decision**: Use L2 constructs (`UserPool`, `UserPoolClient`, `UserPoolDomain`) with explicit configuration.

**Rationale**:
- L2 constructs provide sensible defaults with type-safe configuration
- Explicit password policy, MFA settings, and email verification options
- Self-registration disabled via `allowAdminCreateUserOnly: true`
- Separate User Pools for dev and prod environments via stack props

**CDK Resources Required**:
1. `UserPool` - User directory with email sign-in
2. `UserPoolClient` - OAuth client with code flow + PKCE
3. `UserPoolDomain` - Hosted UI with managed prefix

**Key Configuration**:
```typescript
// User Pool
signInAliases: { email: true }
selfSignUpEnabled: false  // Admin-created users only
standardAttributes: { email: { required: true } }

// User Pool Client
authFlows: { standard: true }
oAuth: {
  flows: { authorizationCodeGrant: true },
  scopes: [OAuthScope.OPENID, OAuthScope.PROFILE, OAuthScope.EMAIL],
  callbackUrls: [/* app URLs */],
  logoutUrls: [/* app URLs */]
}
accessTokenValidity: Duration.hours(1)
idTokenValidity: Duration.hours(1)
refreshTokenValidity: Duration.days(30)
```

### 7. Environment Variable Migration

**Decision**: Update environment variables with backward-compatible validation strategy.

**Rationale**:
- Auth0 uses `aud` claim for audience validation (API identifier)
- Cognito does NOT use audience in access tokens; uses `client_id` claim instead
- Backend must support both providers for backward compatibility
- Frontend only needs client ID (audience not used by OIDC client for Cognito)

**Validation Strategy** (backward compatible):
- If `AUTH_AUDIENCE` is set → validate `aud` claim (Auth0 mode)
- If `AUTH_CLIENT_ID` is set → validate `client_id` claim (Cognito mode)
- Both can be set during migration transition period
- At least one must be set for token validation

**Frontend Variables**:
| Variable | Auth0 Value | Cognito Value |
|----------|-------------|---------------|
| `VITE_AUTH_ISSUER` | `https://tenant.auth0.com` | `https://cognito-idp.{region}.amazonaws.com/{poolId}` |
| `VITE_AUTH_CLIENT_ID` | Auth0 client ID | Cognito User Pool Client ID |
| `VITE_AUTH_AUDIENCE` | API identifier | Optional (not used by Cognito, keep for Auth0 compatibility) |

**Backend Variables**:
| Variable | Auth0 Value | Cognito Value |
|----------|-------------|---------------|
| `AUTH_ISSUER` | `https://tenant.auth0.com` | `https://cognito-idp.{region}.amazonaws.com/{poolId}` |
| `AUTH_AUDIENCE` | API identifier (required) | Remove or leave empty (optional) |
| `AUTH_CLIENT_ID` | Not used | Cognito User Pool Client ID (required) |
| `AUTH_CLAIM_NAMESPACE` | Custom namespace | Remove (standard email claim) |

**Key Difference: Auth0 vs Cognito Token Validation**:
| Aspect | Auth0 | Cognito |
|--------|-------|---------|
| Audience claim (`aud`) | Present in access token | NOT present in access token |
| Client ID claim | `azp` claim | `client_id` claim |
| Backend validation | Validate `aud` against API identifier | Validate `client_id` against client ID |

### 8. Edge Cases Resolution

**JWKS Key Rotation**:
- Backend's `jwks-rsa` client automatically handles key rotation
- On cache miss (new key ID in JWT), client fetches fresh JWKS
- No code changes required

**Auth0 Token Usage Post-Migration**:
- JWT issuer validation will reject Auth0 tokens (different issuer URL)
- No explicit blocking needed; standard validation handles this

**Cognito Outage During Token Validation**:
- JWKS caching (10-hour TTL) provides resilience
- Tokens validated against cached keys without Cognito round-trip
- Only initial JWKS fetch and key rotations require Cognito connectivity

**JWKS Unreachable at Backend Startup**:
- Current implementation lazy-loads JWKS on first request
- If unreachable, request fails but backend stays up
- Subsequent requests retry JWKS fetch
- Spec requirement (FR-006) is satisfied by current behavior

## Open Questions (Resolved)

1. **Q**: Email claim location in Cognito tokens?
   **A**: Standard `email` claim in ID token; configure `email` scope for access token

2. **Q**: Cognito audience format?
   **A**: Cognito access tokens do NOT have an `aud` claim. Validate `client_id` claim instead (contains User Pool Client ID)

3. **Q**: Callback URL configuration for local dev?
   **A**: `http://localhost:5173` for frontend dev server

4. **Q**: How to maintain backward compatibility with Auth0?
   **A**: Backend supports both: validate `aud` claim if `AUTH_AUDIENCE` is set (Auth0), validate `client_id` claim if `AUTH_CLIENT_ID` is set (Cognito)

## Dependencies Confirmed

- `oidc-client-ts` 3.4.1: OIDC 1.0 compliant, works with Cognito
- `jsonwebtoken` 9.0.2: RS256 verification, issuer/audience validation
- `jwks-rsa` 3.2.2: Standard JWKS endpoint fetching with caching
- AWS CDK: `@aws-cdk/aws-cognito` L2 constructs available
