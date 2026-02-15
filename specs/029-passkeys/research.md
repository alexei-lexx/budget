# Research: Passkey Authentication Support

**Date**: 2026-02-15
**Status**: Complete

## Overview

AWS Cognito User Pools natively supports WebAuthn/FIDO2 passkeys (launched November 2024). This enables passwordless authentication through infrastructure configuration only, with no backend or frontend code changes required.

## Key Findings

### 1. AWS Cognito Passkey Support

**Feature Name**: "Passkey Authentication" or "Passwordless Authentication"

**Requirements**:
- AWS Cognito User Pools Essentials tier or higher (not available in Lite tier)
- Choice-based authentication flow (not custom auth flow)
- Based on WebAuthn and CTAP2 standards (W3C and FIDO Alliance)

**Compatibility**:
- Coexists with password authentication
- Users can choose authentication method
- Backward compatible - existing password users unaffected

### 2. Configuration Requirements

#### User Pool Configuration

**Required Properties**:
```typescript
signInPolicy: {
  allowedFirstAuthFactors: {
    password: true,  // Keep existing password auth
    passkey: true,   // Add passkey support
  },
}
passkeyRelyingPartyId: string  // FQDN of your domain
passkeyUserVerification: cognito.PasskeyUserVerification.PREFERRED
```

**Relying Party ID**:
- **What It Is**: The Cognito Hosted UI domain where passkeys are registered
- **How It's Set**: Constructed as `${AUTH_DOMAIN_PREFIX}.auth.${region}.amazoncognito.com`
- **Development**: Uses AUTH_DOMAIN_PREFIX from .env (e.g., "dev-budget-auth") → RP ID: "dev-budget-auth.auth.us-east-1.amazoncognito.com"
- **Production**: Uses AUTH_DOMAIN_PREFIX from SSM (e.g., "prod-budget-auth") → RP ID: "prod-budget-auth.auth.us-east-1.amazoncognito.com"
- **Not the App Domain**: RP ID is the Cognito domain, NOT your app domain (localhost or CloudFront)
- **Important**: Changing RP ID later requires users to re-register passkeys

#### User Pool Client Configuration

**Required Auth Flow**:
```typescript
authFlows: {
  user: true,          // Required for passkeys (ALLOW_USER_AUTH)
  userPassword: true,  // Keep existing flows
  userSrp: true,
}
```

### 3. Development vs Production Setup

#### Development Environment
- **Frontend**: Vite dev server (localhost:5173)
- **Backend**: Local Apollo Server
- **Auth**: AWS Cognito (deployed to AWS with dev-specific User Pool)
- **Domain Prefix**: `dev-budget-auth` (from .env)
- **Cognito Domain** (created by AWS): `dev-budget-auth.auth.<region>.amazoncognito.com`
- **RP ID** (set in CDK): `dev-budget-auth.auth.<region>.amazoncognito.com` (matches Cognito domain)

**Works seamlessly because**:
- Cognito Hosted UI runs on AWS domain (HTTPS)
- Passkey registration/authentication happens on Cognito's domain (not localhost)
- RP ID matches the Cognito domain where authentication happens
- OAuth redirects to localhost work (HTTP allowed for localhost in callback URLs)

**No special configuration needed** - passkeys registered on Cognito's domain work with localhost callbacks.

#### Production Environment
- **Full AWS deployment**: CloudFront + backend Lambda
- **Auth**: AWS Cognito (separate production User Pool)
- **Domain Prefix**: From `/manual/budget/production/auth/domain-prefix` in SSM Parameter Store
- **Cognito Domain** (created by AWS): `<prefix-from-SSM>.auth.<region>.amazoncognito.com`
- **RP ID** (set in CDK): `<prefix-from-SSM>.auth.<region>.amazoncognito.com` (matches Cognito domain)

**Important**: Dev and prod have **separate Cognito User Pools** with **different RP IDs**. This means:
- User accounts are separate between environments
- Passkeys registered in dev don't work in prod (and vice versa)
- Users must register passkeys separately in each environment
- This is normal and correct for proper environment isolation

### 4. Hosted UI (Managed Login) Support

**Native Support**: Cognito's Managed Login (Hosted UI) was updated in October 2025 with native passkey support.

**Automatic Features**:
1. Sign-in flow shows passkey option alongside password
2. After email verification, users prompted to register passkey
3. Curated user flows adapt to preferred authentication method
4. UI automatically updates when passkeys enabled

**User Flow**:
1. Admin creates account (selfSignUpEnabled: false in current config)
2. User verifies email
3. Hosted UI prompts for passkey registration (optional)
4. User can sign in with either password or passkey

**No custom UI development required** - Hosted UI handles everything.

### 5. MFA Compatibility Limitation

**Critical Constraint**: Passkey authentication is NOT eligible for MFA.

**Impact**:
- If MFA is required (`mfa: cognito.Mfa.REQUIRED`), passwordless authentication cannot be used
- When both MFA and choice-based sign-in active, MFA takes priority
- User must enter password + MFA code (passkey option disappears)

**Current Project Status**: ✅ Compatible
- Current config has `mfa: cognito.Mfa.OFF`
- Passkeys will work without conflicts
- Keep MFA disabled or set to `OPTIONAL` to support passkeys

### 6. Backward Compatibility

**Confirmed**: Enabling passkeys does NOT break existing password authentication.

**How Both Coexist**:
- Hosted UI shows both sign-in options
- Existing users continue using passwords
- Users can register passkeys alongside existing password
- `ALLOW_USER_AUTH` flow allows user to choose method
- No breaking changes to JWT tokens
- Backend continues verifying JWT tokens (unaware of authentication method)

## Implementation Decisions

Based on research, the following decisions are made:

### Decision 1: Use Cognito Prefix Domain for Relying Party ID

**Decision**: Use Cognito prefix domain (`{domainPrefix}.auth.{region}.amazoncognito.com`) for Relying Party ID instead of custom domain.

**Rationale**:
- Avoids complexity of custom domain setup
- No DNS/certificate management required
- Can migrate to custom domain later if needed
- Each environment (dev, prod) has its own Cognito User Pool with its own RP ID

**Note on Environment Separation**:
- Development: AUTH_DOMAIN_PREFIX="dev-budget-auth" (.env) → RP ID: `dev-budget-auth.auth.<region>.amazoncognito.com`
- Production: AUTH_DOMAIN_PREFIX from SSM → RP ID: `<SSM-value>.auth.<region>.amazoncognito.com`
- RP ID is constructed from the same prefix used to create the Cognito domain
- Different RP IDs = separate passkey registration per environment
- This is normal and correct for environment isolation

**Alternative Considered**: Custom domain with environment-specific RP ID
- Rejected: Adds unnecessary complexity for initial implementation

### Decision 2: User Verification Set to PREFERRED

**Decision**: Use `PasskeyUserVerification.PREFERRED` instead of `REQUIRED`.

**Rationale**:
- PREFERRED: User verification performed if device supports it, otherwise skipped
- REQUIRED: Forces user verification, may limit device compatibility
- Better user experience with broader device support
- Still secure - device authentication required

**Alternative Considered**: REQUIRED for maximum security
- Rejected: May prevent some users from using passkeys on older devices

### Decision 3: Keep MFA Disabled

**Decision**: Maintain `mfa: cognito.Mfa.OFF` setting.

**Rationale**:
- Required for passkey authentication to work
- Passkeys provide phishing-resistant authentication (equivalent to MFA benefit)
- Aligns with current project configuration
- Can be revisited if MFA becomes a requirement (would disable passkeys)

### Decision 4: No Custom UI Development

**Decision**: Rely entirely on Cognito Hosted UI for passkey management.

**Rationale**:
- Aligns with implementation constraint IC-003: "Passkey management interface MUST be provided by the identity provider's hosted UI"
- No backend/frontend code changes (IC-002)
- Hosted UI provides complete passkey flow out-of-box
- Reduces development and maintenance burden

## Best Practices for CDK Implementation

### 1. Property Placement
- Add passkey configuration adjacent to existing authentication settings
- Group `signInPolicy`, `passkeyRelyingPartyId`, `passkeyUserVerification` together
- Add inline comments explaining each passkey property

### 2. Environment Handling
- Compute `passkeyRelyingPartyId` from existing `AUTH_DOMAIN_PREFIX` environment variable
- Use template literals to construct Cognito domain
- No new environment variables needed

### 3. Testing Coverage
- Verify `SignInPolicy` includes both password and passkey
- Assert `passkeyRelyingPartyId` is correctly set
- Confirm `passkeyUserVerification` is PREFERRED
- Verify `ALLOW_USER_AUTH` flow enabled in client
- Ensure existing auth flows remain intact

### 4. Documentation
- Add inline comments explaining passkey settings
- Document RP ID construction logic
- Note MFA compatibility limitation
- Update stack comments to mention passkey support

## Testing Strategy

### Infrastructure Tests (CDK)
- Test that User Pool has passkey configuration
- Verify User Pool Client has USER_AUTH flow
- Assert backward compatibility with existing auth flows
- Validate RP ID format

### Integration Testing (Manual)
1. Deploy auth stack to test environment
2. Test password login (verify existing flow works)
3. Test passkey registration via Hosted UI
4. Test passkey authentication
5. Verify JWT tokens work with backend
6. Test on multiple devices/browsers

### Regression Testing
- Verify existing users can still log in with password
- Confirm JWT token format unchanged
- Ensure backend receives same token claims
- Test token refresh flow

## Migration Strategy

**Zero-Migration Approach**:
- No data migration needed
- No user account changes required
- Existing users continue using passwords
- Passkey adoption is user-initiated and gradual

**Deployment Steps**:
1. Deploy updated auth stack to test environment
2. Test password and passkey flows
3. Deploy to production
4. Existing users unaffected
5. Users can opt-in to passkey registration via account settings in Hosted UI

## Alternatives Considered

### Alternative 1: Custom WebAuthn Implementation
**Approach**: Build custom passkey registration/authentication in frontend/backend.

**Rejected Because**:
- Violates IC-002: "Implementation MUST NOT require changes to backend or frontend application code"
- Violates IC-003: "Passkey management interface MUST be provided by the identity provider's hosted UI"
- Significantly more complex
- Requires custom UI development
- More security risk (implementing WebAuthn correctly is non-trivial)
- Cognito provides this out-of-box

### Alternative 2: Third-Party Passkey Provider
**Approach**: Use service like Auth0, Clerk, or dedicated passkey providers.

**Rejected Because**:
- Violates IC-004: "System MUST use AWS Cognito as the identity provider"
- Introduces new vendor dependency
- Violates Vendor Independence principle (new vendor instead of extending existing)
- Migration complexity from Cognito
- Additional cost

### Alternative 3: Wait for Cognito Advanced Security Features
**Approach**: Delay implementation until Cognito adds more passkey customization.

**Rejected Because**:
- Current Cognito passkey support meets all requirements
- Hosted UI provides sufficient functionality
- No identified gaps in current implementation
- User value delivered sooner

## Open Questions

None - all clarifications resolved during research.

## References

- [AWS Cognito UserPool API - WebAuthnConfigurationType](https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_WebAuthnConfigurationType.html)
- [AWS CDK Cognito Module Documentation](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito-readme.html)
- [AWS CDK UserPool Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.UserPool.html)
- [AWS Cognito Authentication Flows](https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html)
- [AWS Security Blog - Passwordless Authentication with Cognito and WebAuthn](https://aws.amazon.com/blogs/security/how-to-implement-password-less-authentication-with-amazon-cognito-and-webauthn/)
- [AWS Security Blog - Managed Login vs Custom UI](https://aws.amazon.com/blogs/security/use-the-hosted-ui-or-create-a-custom-ui-in-amazon-cognito/)
