# Quickstart: Infra CDK Package

**Feature**: 024-merge-cdk-packages
**Date**: 2025-12-30

## Overview

Quick reference guide for working with the unified `infra-cdk` package that consolidates backend and frontend infrastructure into a single CDK application.

---

## Prerequisites

1. **AWS CLI** configured with valid credentials
2. **Node.js** installed (version compatible with backend/frontend packages)
3. **AWS CDK CLI** installed globally or via npx
4. **.env.production** file in infra-cdk/ directory with required environment variables

---

## Installation

```bash
cd infra-cdk
npm install
```

This installs:
- aws-cdk-lib@2.233.0
- constructs
- @dotenvx/dotenvx
- All dev dependencies (TypeScript, ESLint, Prettier, Jest)

---

## Environment Variables

**Required for Backend Stack** (defined in `.env.production`):

```bash
# AWS Resource Names
USERS_TABLE_NAME=budget-users
ACCOUNTS_TABLE_NAME=budget-accounts
CATEGORIES_TABLE_NAME=budget-categories
TRANSACTIONS_TABLE_NAME=budget-transactions
MIGRATIONS_TABLE_NAME=budget-migrations

# Auth0 Configuration
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=your-api-audience
JWT_CLAIM_NAMESPACE=https://your-namespace/

# Environment
NODE_ENV=production

# Optional Lambda Configuration
LAMBDA_TIMEOUT_SECONDS=30
LAMBDA_MEMORY_SIZE=512
```

**Frontend Stack**: No environment variables required (dotenvx is a no-op if .env.production is missing or incomplete)

See `.env.example` for complete reference.

---

## Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

Output: Compiled JavaScript files in `bin/*.js` and `lib/*.js`

---

## Deployment

### Deploy Both Stacks

```bash
npm run deploy
# or: npm run deploy:all
```

This runs:
```bash
cdk deploy --all --outputs-file cdk-outputs.json
```

**Deployment Order**:
1. BackendStack deploys first (DynamoDB tables, Lambda functions, API Gateway)
2. FrontendStack deploys second (S3 bucket, CloudFront distribution)

**Output**: `cdk-outputs.json` with outputs from both stacks

---

### Deploy Individual Stacks

**Backend only**:
```bash
npm run deploy:backend
# or: npx dotenvx run -f .env.production -- cdk deploy BackendCdkStack
```

**Frontend only**:
```bash
npm run deploy:frontend
# or: npx dotenvx run -f .env.production -- cdk deploy FrontendCdkStack
```

**Note**: FrontendStack deployment requires BackendStack export to exist

---

## CDK Commands

### Synthesize CloudFormation Templates

```bash
npm run synth
```

Output: CloudFormation templates in `cdk.out/` directory

---

### View Changes (Diff)

```bash
npm run diff
```

Shows differences between deployed stacks and local code.

---

### List Stacks

```bash
npx cdk list
```

Output:
```
BackendCdkStack
FrontendCdkStack
```

---

### Destroy Stacks

**⚠️ Warning**: This deletes all infrastructure resources.

```bash
npx dotenvx run -f .env.production -- cdk destroy --all
```

Or destroy individual stacks:
```bash
npx dotenvx run -f .env.production -- cdk destroy BackendCdkStack
npx dotenvx run -f .env.production -- cdk destroy FrontendCdkStack
```

---

## Testing

Run Jest tests:

```bash
npm test
```

Test files located in `test/` directory.

---

## Code Quality

### Linting

```bash
npm run lint        # Check for lint errors
npm run lint:fix    # Auto-fix lint errors
```

### Formatting

```bash
npm run prettier        # Check formatting
npm run prettier:fix    # Auto-fix formatting
```

### Format & Lint (Combined)

```bash
npm run format
```

This runs `prettier:fix` followed by `lint:fix`.

---

## Stack Outputs

After deployment, outputs are available in `cdk-outputs.json`:

```json
{
  "BackendCdkStack": {
    "MigrationFunctionName": "BackendCdkStack-MigrationRunner..."
  },
  "FrontendCdkStack": {
    "S3BucketName": "frontendcdkstack-assets...",
    "CloudFrontDistributionId": "E1234ABCD"
  }
}
```

**Common Use Cases**:
- **Migration**: Invoke migration Lambda using `BackendCdkStack.MigrationFunctionName`
- **Frontend Upload**: Upload assets to `FrontendCdkStack.S3BucketName`
- **Cache Invalidation**: Invalidate CloudFront using `FrontendCdkStack.CloudFrontDistributionId`

---

## Development Workflow

### Making Infrastructure Changes

1. **Edit stack files**:
   - Backend: `lib/backend-stack.ts`
   - Frontend: `lib/frontend-stack.ts`

2. **Build TypeScript**:
   ```bash
   npm run build
   ```

3. **View changes**:
   ```bash
   npm run diff
   ```

4. **Deploy changes**:
   ```bash
   npm run deploy
   ```

5. **Verify outputs**:
   ```bash
   cat cdk-outputs.json
   ```

---

### Watch Mode

Auto-compile TypeScript on file changes:

```bash
npm run watch
```

---

## Troubleshooting

### Issue: "Export 'BackendCdkStack-GraphqlApiDomain' not found"

**Cause**: FrontendStack deployed before BackendStack
**Solution**: Deploy BackendStack first, then FrontendStack:
```bash
npm run deploy:backend
npm run deploy:frontend
```

Or use `npm run deploy` which handles order automatically.

---

### Issue: "Stack name mismatch"

**Cause**: Stack name in code doesn't match deployed stack name
**Solution**: Verify stack instantiation in `bin/app.ts`:
```typescript
new BackendStack(app, 'BackendCdkStack', {});  // Must be "BackendCdkStack"
new FrontendStack(app, 'FrontendCdkStack', {}); // Must be "FrontendCdkStack"
```

---

### Issue: "Environment variables not loaded"

**Cause**: `.env.production` missing or dotenvx not running
**Solution**:
1. Verify `.env.production` exists in `infra-cdk/` directory
2. Check npm scripts use `dotenvx run -f .env.production --`
3. Check `.env.example` for required variables

---

### Issue: "CDK version mismatch"

**Cause**: Global CDK CLI version doesn't match aws-cdk-lib version
**Solution**: Use npx to match local version:
```bash
npx cdk deploy --all
```

Or update global CDK:
```bash
npm install -g aws-cdk@2.233.0
```

---

## Migration from Old Structure

If migrating from separate `backend-cdk/` and `frontend-cdk/` packages:

1. **Delete old outputs**:
   ```bash
   rm backend-cdk/cdk-outputs.json
   rm frontend-cdk/cdk-outputs.json
   ```

2. **Deploy unified package**:
   ```bash
   cd infra-cdk
   npm install
   npm run build
   npm run deploy
   ```

3. **Verify new outputs**:
   ```bash
   cat infra-cdk/cdk-outputs.json
   ```

4. **Update deploy.sh**:
   - Change directory from `backend-cdk/` and `frontend-cdk/` to `infra-cdk/`
   - Update output file path to `infra-cdk/cdk-outputs.json`
   - Update deployment command to `cdk deploy --all`

5. **Delete old directories** (after successful deployment):
   ```bash
   git rm -rf backend-cdk/
   git rm -rf frontend-cdk/
   git commit -m "chore: remove old CDK packages after migration to infra-cdk"
   ```

---

## Resources

- **AWS CDK Documentation**: https://docs.aws.amazon.com/cdk/
- **Multi-Stack Apps**: https://docs.aws.amazon.com/cdk/latest/guide/stack_how_to_create_multiple_stacks.html
- **CDK Outputs**: https://docs.aws.amazon.com/cdk/latest/guide/outputs.html
- **CloudFormation Exports**: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-exports.html
