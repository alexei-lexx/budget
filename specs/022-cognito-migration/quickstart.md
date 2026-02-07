# Quickstart: AWS Cognito Migration

**Feature**: 022-cognito-migration
**Date**: 2026-02-06

## Prerequisites

- AWS CLI configured with appropriate credentials
- AWS CDK CLI installed (`npm install -g aws-cdk`)
- Node.js 18+ and npm
- Docker (for DynamoDB Local in development)

## Development Setup

### 1. Deploy Cognito Infrastructure

First, deploy the Cognito User Pool to your AWS account:

```bash
cd infra-cdk

# Bootstrap CDK (if not already done)
npx cdk bootstrap

# Deploy the auth stack to dev environment
npx cdk deploy AuthCdkStack-dev
```

After deployment, note the outputs:
- `UserPoolId`: e.g., `us-east-1_abc123def`
- `UserPoolClientId`: e.g., `1example23456789`
- `CognitoDomain`: e.g., `dev-budget-auth.auth.us-east-1.amazoncognito.com`

### 2. Configure Backend Environment

Create or update `backend/.env`:

```bash
# Cognito configuration
AUTH_ISSUER=https://cognito-idp.{region}.amazonaws.com/{UserPoolId}
AUTH_CLIENT_ID={UserPoolClientId}

# Note: AUTH_AUDIENCE is NOT used for Cognito (no aud claim in access tokens)
# Keep AUTH_AUDIENCE only if you need backward compatibility with Auth0

# DynamoDB Local for development
DYNAMODB_ENDPOINT=http://localhost:8000
AWS_REGION=us-east-1

# Optional: Enable debug logging
LOG_LEVEL=debug
```

Replace `{region}`, `{UserPoolId}`, and `{UserPoolClientId}` with your actual values.

### 3. Configure Frontend Environment

Create or update `frontend/.env`:

```bash
# GraphQL endpoint
VITE_GRAPHQL_ENDPOINT=http://localhost:4000/graphql

# Cognito configuration
VITE_AUTH_ISSUER=https://cognito-idp.{region}.amazonaws.com/{UserPoolId}
VITE_AUTH_CLIENT_ID={UserPoolClientId}
VITE_AUTH_SCOPE=openid profile email offline_access

# Audience (optional - not used by Cognito, keep for Auth0 backward compatibility)
# VITE_AUTH_AUDIENCE={apiIdentifier}
```

### 4. Create a Test User

Cognito is configured for admin-created users only. Create a user via AWS CLI:

```bash
# Create user (replace values)
aws cognito-idp admin-create-user \
  --user-pool-id {UserPoolId} \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com Name=email_verified,Value=true \
  --message-action SUPPRESS

# Set permanent password (replace values)
aws cognito-idp admin-set-user-password \
  --user-pool-id {UserPoolId} \
  --username test@example.com \
  --password 'YourSecurePassword123!' \
  --permanent
```

### 5. Start Development Servers

Terminal 1 - DynamoDB Local:
```bash
docker run -p 8000:8000 amazon/dynamodb-local
```

Terminal 2 - Backend:
```bash
cd backend
npm install
npm run dev
```

Terminal 3 - Frontend:
```bash
cd frontend
npm install
npm run dev
```

### 6. Test Authentication

1. Open http://localhost:5173 in your browser
2. Click "Sign In"
3. You'll be redirected to Cognito Hosted UI
4. Enter the test user credentials created in step 4
5. After successful login, you'll be redirected back to the app
6. Verify you can access protected routes (Accounts, Transactions, etc.)

## Verification Checklist

- [ ] Cognito User Pool created in AWS Console
- [ ] User Pool Client configured with correct callback URLs
- [ ] Hosted UI accessible at `{CognitoDomain}/login`
- [ ] Backend starts without errors and fetches JWKS
- [ ] Frontend redirects to Cognito on login click
- [ ] Token exchange completes successfully after login
- [ ] GraphQL requests include Authorization header
- [ ] Backend validates JWT and returns data

## Common Issues

### "Invalid redirect_uri" Error

Ensure callback URLs in Cognito User Pool Client match exactly:
- Development: `http://localhost:5173` (no trailing slash)
- Production: Your production URL

### "Token validation failed" Error

Check that:
1. `AUTH_ISSUER` matches the User Pool issuer (include region and pool ID)
2. `AUTH_CLIENT_ID` matches the User Pool Client ID (for Cognito)
3. Backend can reach Cognito JWKS endpoint
4. Note: Do NOT set `AUTH_AUDIENCE` for Cognito (Cognito access tokens don't have `aud` claim)

### "User does not exist" Error

Ensure the test user was created correctly:
```bash
aws cognito-idp admin-get-user \
  --user-pool-id {UserPoolId} \
  --username test@example.com
```

### JWKS Fetch Timeout

If backend can't fetch JWKS on startup, check:
1. Network connectivity to AWS
2. VPC/firewall configuration (if running in AWS)
3. Correct region in the issuer URL

## Environment-Specific Notes

### Development
- Uses Cognito Hosted UI for authentication
- DynamoDB Local for data storage
- Callback URL: `http://localhost:5173`

### Production
- Separate Cognito User Pool (isolated from dev)
- Production DynamoDB tables
- Callback URL: Production CloudFront URL
- Deploy with: `npx cdk deploy --all -c environment=prod`

## Useful Commands

```bash
# List Cognito users
aws cognito-idp list-users --user-pool-id {UserPoolId}

# Get User Pool details
aws cognito-idp describe-user-pool --user-pool-id {UserPoolId}

# Get Client details
aws cognito-idp describe-user-pool-client \
  --user-pool-id {UserPoolId} \
  --client-id {UserPoolClientId}

# View hosted UI login page
open "https://{CognitoDomain}/login?client_id={UserPoolClientId}&response_type=code&scope=openid+profile+email&redirect_uri=http://localhost:5173"
```

## Next Steps

After completing local development setup:

1. Run existing tests to ensure JWT verification works with Cognito
2. Test the complete authentication flow end-to-end
3. Deploy to production environment
4. Create production users
5. Update production environment variables
