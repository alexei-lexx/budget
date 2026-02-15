# Quickstart: Passkey Authentication Support

**Date**: 2026-02-15
**Feature**: Enable passkey authentication through AWS Cognito configuration

## Prerequisites

- AWS CDK installed and configured
- AWS Cognito User Pool deployed (via AuthCdkStack)
- Cognito User Pool must be on **Essentials tier or higher** (not Lite tier)
- Modern browser with WebAuthn support (Chrome 90+, Firefox 92+, Safari 14+, Edge 90+)
- Device with biometric authentication (fingerprint, Face ID, etc.) or platform authenticator

## Quick Setup

### Step 1: Update Auth Stack Configuration

Modify `/home/alex/workspace/budget2/infra-cdk/lib/auth-cdk-stack.ts`:

```typescript
// Add after domainPrefix and claimNamespace declarations
const domainPrefix = requireEnv("AUTH_DOMAIN_PREFIX");
const claimNamespace = requireEnv("AUTH_CLAIM_NAMESPACE");

// NEW: Construct Relying Party ID from Cognito domain
// This will be environment-specific:
// - Dev: dev-budget-auth.auth.<region>.amazoncognito.com
// - Prod: <prod-prefix>.auth.<region>.amazoncognito.com (from SSM)
const passkeyRelyingPartyId = `${domainPrefix}.auth.${this.region}.amazoncognito.com`;

this.userPool = new cognito.UserPool(this, "UserPool", {
  signInAliases: { email: true },
  selfSignUpEnabled: false,

  // NEW: Enable passkey authentication
  signInPolicy: {
    allowedFirstAuthFactors: {
      password: true,  // Keep existing password auth
      passkey: true,   // Add passkey support
    },
  },
  passkeyRelyingPartyId: passkeyRelyingPartyId,
  passkeyUserVerification: cognito.PasskeyUserVerification.PREFERRED,

  // ... rest of existing configuration remains unchanged
});
```

Update UserPoolClient auth flows:

```typescript
this.userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
  userPool: this.userPool,
  generateSecret: false,

  authFlows: {
    user: true,          // NEW: Required for passkeys
    userPassword: true,  // Existing
    userSrp: true,       // Existing
    custom: false,
    adminUserPassword: false,
  },

  // ... rest of existing configuration remains unchanged
});
```

### Step 2: Deploy Updated Auth Stack

```bash
cd infra-cdk
npm run deploy:auth
```

**Expected output**:
```
✅  test-BudgetAuth

Outputs:
test-BudgetAuth.UserPoolId = us-east-1_xxxxxx
test-BudgetAuth.UserPoolClientId = xxxxxxxxxxxxxxxxxxxxxx
test-BudgetAuth.AuthIssuer = https://cognito-idp.us-east-1.amazonaws.com/us-east-1_xxxxxx
```

### Step 3: Verify Configuration

Check the User Pool in AWS Console:
1. Navigate to Amazon Cognito → User Pools
2. Select your pool (e.g., `test-BudgetAuth`)
3. Go to "Sign-in experience" tab
4. Verify "Passkey" appears in authentication factors
5. Check "Authentication factors" shows both "Password" and "Passkey"

### Step 4: Test Passkey Registration

1. **Create Test User** (if not exists):
   ```bash
   aws cognito-idp admin-create-user \
     --user-pool-id <USER_POOL_ID> \
     --username test@example.com \
     --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true \
     --temporary-password "TempPass123!" \
     --message-action SUPPRESS
   ```

2. **Set Permanent Password**:
   ```bash
   aws cognito-idp admin-set-user-password \
     --user-pool-id <USER_POOL_ID> \
     --username test@example.com \
     --password "SecurePass123!" \
     --permanent
   ```

3. **Access Hosted UI**:
   - Navigate to: `https://<DOMAIN_PREFIX>.auth.<REGION>.amazoncognito.com/login?client_id=<CLIENT_ID>&response_type=code&redirect_uri=<CALLBACK_URL>`
   - Example: `https://test-budget-auth.auth.us-east-1.amazoncognito.com/login?client_id=abc123&response_type=code&redirect_uri=http://localhost:5173`

4. **Sign In with Password**:
   - Enter email: `test@example.com`
   - Enter password: `SecurePass123!`
   - Click "Sign in"

5. **Register Passkey**:
   - After sign-in, Hosted UI prompts: "Do you want to register a passkey?"
   - Click "Yes" or "Register passkey"
   - Browser prompts for biometric authentication (fingerprint, Face ID, etc.)
   - Authenticate with your device
   - Passkey registered successfully

### Step 5: Test Passkey Authentication

1. **Sign Out** from Hosted UI

2. **Navigate to Login** page again

3. **Select Passkey Option**:
   - Hosted UI shows: "Sign in with password" or "Sign in with passkey"
   - Click "Sign in with passkey"

4. **Authenticate**:
   - Browser prompts for biometric authentication
   - Authenticate with your device
   - You are signed in without entering password

5. **Verify JWT Token**:
   - Backend receives same JWT token format
   - Token contains email claim
   - Backend extracts email and authenticates user normally

## Development Environment

### Local Development Setup

**Current Setup**:
- Frontend: Vite dev server (`npm run dev` in `frontend/`)
- Backend: Local Apollo Server (`npm run dev` in `backend/`)
- Auth: AWS Cognito (development User Pool deployed to AWS)

**Environment Configuration** (from `infra-cdk/.env`):
```bash
NODE_ENV=development
AUTH_DOMAIN_PREFIX=dev-budget-auth  # Creates dev-budget-auth.auth.<region>.amazoncognito.com
AUTH_CALLBACK_URLS=http://localhost:5173
AUTH_LOGOUT_URLS=http://localhost:5173
```

**Passkey Support**:
- Works out-of-box with localhost callback URLs
- Passkeys registered on Cognito domain: `dev-budget-auth.auth.<region>.amazoncognito.com`
- App runs on localhost, but authentication happens on Cognito's HTTPS domain
- No special configuration needed

**Why It Works**:
- Cognito Hosted UI runs on AWS (HTTPS)
- Passkey registration/auth happens on Cognito's domain (not localhost)
- WebAuthn passkeys tied to Cognito's domain
- OAuth redirects to `http://localhost:5173` work seamlessly

### Testing Locally

1. **Start Local Backend**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Local Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access Application**:
   - Navigate to: `http://localhost:5173`
   - Click "Sign In"
   - Redirected to Cognito Hosted UI
   - Sign in with password or passkey
   - Redirected back to localhost
   - Make GraphQL requests with JWT token

## Production Environment

### Deployment

Production uses the `deploy.sh` script which:
1. Fetches configuration from AWS SSM Parameter Store
2. Deploys all stacks
3. Automatically configures Cognito callback URLs with CloudFront URL

```bash
# From repository root
./deploy.sh
```

**Environment Configuration** (from AWS SSM Parameter Store):
- `NODE_ENV=production` (set by deploy.sh)
- `AUTH_DOMAIN_PREFIX`: From `/manual/budget/production/auth/domain-prefix` in SSM
- Creates production Cognito User Pool: `<prod-prefix>.auth.<region>.amazoncognito.com`

**Stack Order**:
1. AuthCdkStack (with passkey support)
2. BackendCdkStack
3. FrontendCdkStack

**Note**: Production has a **separate Cognito User Pool** from development:
- Different RP ID = separate user accounts
- Passkeys registered in dev won't work in prod
- Users must register passkeys separately in production

### Production Testing

1. Navigate to CloudFront URL (from CDK outputs)
2. Click "Sign In" → Redirected to Cognito Hosted UI
3. Register passkey with your device
4. Sign in with passkey
5. Verify application functionality

## Verification Checklist

- [ ] Auth stack deploys successfully
- [ ] Cognito User Pool shows "Passkey" in authentication factors
- [ ] Hosted UI shows passkey registration prompt after sign-in
- [ ] Passkey registration succeeds with device biometric auth
- [ ] Passkey authentication succeeds without password
- [ ] JWT token received by backend is valid
- [ ] Backend extracts email from token correctly
- [ ] Existing password authentication still works
- [ ] Multiple passkeys can be registered (test from different devices/browsers)
- [ ] Passkeys work in development (localhost)
- [ ] Passkeys work in production (CloudFront URL)

## Troubleshooting

### Issue: "Passkey not supported" error

**Cause**: Browser or device doesn't support WebAuthn.

**Solution**:
- Use modern browser: Chrome 90+, Firefox 92+, Safari 14+, Edge 90+
- Ensure device has biometric authentication or platform authenticator
- Try different browser or device

### Issue: "Registration failed" error

**Cause**: Relying Party ID mismatch or device restrictions.

**Solution**:
- Verify `passkeyRelyingPartyId` matches Cognito domain
- Check browser console for WebAuthn errors
- Ensure HTTPS (production) or localhost (development)
- Try incognito/private browsing mode

### Issue: "User verification required" error

**Cause**: Device doesn't support user verification or it's disabled.

**Solution**:
- Ensure biometric authentication is set up on device
- Try `PasskeyUserVerification.PREFERRED` instead of `REQUIRED`
- Use different device with biometric support

### Issue: Existing passwords stop working

**Cause**: Configuration error in `signInPolicy` or auth flows.

**Solution**:
- Verify `password: true` in `allowedFirstAuthFactors`
- Ensure `userPassword: true` and `userSrp: true` in auth flows
- Check CDK diff before deploying: `npm run diff:auth`

### Issue: JWT token verification fails

**Cause**: Token issuer or audience mismatch.

**Solution**:
- Verify backend `AUTH_ISSUER` environment variable matches Cognito issuer
- Check `AUTH_CLIENT_ID` matches User Pool Client ID
- Passkeys don't change JWT format - same verification logic applies

### Issue: Can't see passkey option in Hosted UI

**Cause**: User Pool tier is Lite (passkeys require Essentials+).

**Solution**:
- Upgrade User Pool to Essentials tier or higher
- Check AWS Console → Cognito → User Pool → "User pool settings" → Tier
- Contact AWS support if upgrade needed

## Browser Compatibility

| Browser | Minimum Version | Platform Authenticator | Security Key |
|---------|----------------|------------------------|--------------|
| Chrome  | 90+            | ✅                     | ✅           |
| Edge    | 90+            | ✅                     | ✅           |
| Firefox | 92+            | ✅                     | ✅           |
| Safari  | 14+            | ✅                     | ✅           |

**Platform Authenticators**:
- Windows: Windows Hello
- macOS: Touch ID
- iOS: Face ID / Touch ID
- Android: Fingerprint / Face Unlock

## Security Best Practices

1. **Relying Party ID**:
   - Use consistent RP ID across environments
   - Don't change RP ID after users register passkeys
   - Use Cognito domain for simplicity

2. **User Verification**:
   - Use `PREFERRED` for better device compatibility
   - Use `REQUIRED` only if high security needs justify limited device support

3. **MFA Compatibility**:
   - Keep MFA disabled or optional to support passkeys
   - Document that passkeys cannot be used with required MFA

4. **Backup Authentication**:
   - Keep password authentication enabled as fallback
   - Users can recover access if passkey device is lost

5. **Testing**:
   - Test on multiple browsers and devices
   - Verify both password and passkey flows
   - Test passkey registration, authentication, and deletion

## Next Steps

After successful deployment:

1. **User Communication**:
   - Inform users about passkey availability
   - Provide instructions for registering passkeys
   - Highlight security and convenience benefits

2. **Monitoring**:
   - Monitor authentication logs in CloudWatch
   - Track passkey adoption rate
   - Watch for authentication errors

3. **Documentation**:
   - Update user-facing documentation
   - Add passkey help/FAQ section
   - Document supported devices/browsers

4. **Future Enhancements** (if needed):
   - Custom domain for Cognito Hosted UI
   - Custom UI branding
   - Analytics for authentication methods

## Related Documentation

- [spec.md](spec.md): Feature specification and requirements
- [research.md](research.md): Technical research findings
- [data-model.md](data-model.md): Data model documentation
- [plan.md](plan.md): Implementation plan
