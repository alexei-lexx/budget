# Make Repo Public — Track 2: User Registration Feature

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable self-service Cognito sign-up by default so anyone deploying the app can register without manual admin steps. Add an SSM parameter toggle to disable registration after initial setup.

**Architecture:** `deploy.sh` reads a new SSM parameter `AUTH_ALLOW_USER_REGISTRATION` (default `"true"`) and passes it as an env var to CDK. `AuthCdkStack` reads the env var and sets `selfSignUpEnabled` on the Cognito User Pool accordingly.

**Tech Stack:** AWS CDK (TypeScript), AWS Cognito, Bash (`deploy.sh`), Jest + `aws-cdk-lib/assertions` for CDK tests.

---

## Files

- Modify: `infra-cdk/lib/auth-cdk-stack.ts` — read `AUTH_ALLOW_USER_REGISTRATION` env var, set `selfSignUpEnabled`
- Modify: `infra-cdk/test/auth-cdk.test.ts` — add tests for both `true` and `false` cases
- Modify: `deploy.sh` — read SSM param, pass env var to CDK deploy command
- Modify: `infra-cdk/.env.example` — document the new env var
- Modify: `README.md` — document the new SSM parameter and the setup workflow

---

### Task 1: Write failing tests for `selfSignUpEnabled`

The existing test at `infra-cdk/test/auth-cdk.test.ts` already asserts `AllowAdminCreateUserOnly: true`. That assertion needs to be updated and two new tests added — one for `"true"`, one for `"false"`.

- [ ] **Step 1: Update `beforeEach` in `infra-cdk/test/auth-cdk.test.ts`**

Add `AUTH_ALLOW_USER_REGISTRATION` to the `beforeEach` env setup (set to `"true"` as the normal deployment default):

```typescript
beforeEach(() => {
  process.env.AUTH_ALLOW_USER_REGISTRATION = "true";
  process.env.AUTH_CALLBACK_URLS = "http://localhost:5173";
  process.env.AUTH_CLAIM_NAMESPACE = "https://personal-budget-tracker";
  process.env.AUTH_DOMAIN_PREFIX = "test-budget-auth";
  process.env.AUTH_LOGOUT_URLS = "http://localhost:5173";
  process.env.NODE_ENV = "test";

  app = new cdk.App();
  stack = new AuthCdkStack(app, "TestAuthCdkStack");
  template = Template.fromStack(stack);
});
```

Also update `afterEach` to clean up the new var:

```typescript
afterEach(() => {
  delete process.env.AUTH_ALLOW_USER_REGISTRATION;
  delete process.env.AUTH_CALLBACK_URLS;
  delete process.env.AUTH_CLAIM_NAMESPACE;
  delete process.env.AUTH_DOMAIN_PREFIX;
  delete process.env.AUTH_LOGOUT_URLS;
  delete process.env.NODE_ENV;
});
```

- [ ] **Step 2: Update the existing `AllowAdminCreateUserOnly` assertion**

In `it("should create the stack")`, change the existing assertion from:

```typescript
template.hasResourceProperties("AWS::Cognito::UserPool", {
  AdminCreateUserConfig: {
    AllowAdminCreateUserOnly: true,
  },
});
```

to:

```typescript
template.hasResourceProperties("AWS::Cognito::UserPool", {
  AdminCreateUserConfig: {
    AllowAdminCreateUserOnly: false,
  },
});
```

- [ ] **Step 3: Add two new `it` blocks for the registration toggle**

Add the following after the existing tests:

```typescript
it("should enable self sign-up when AUTH_ALLOW_USER_REGISTRATION is true", () => {
  // AUTH_ALLOW_USER_REGISTRATION="true" is set in beforeEach
  template.hasResourceProperties("AWS::Cognito::UserPool", {
    AdminCreateUserConfig: {
      AllowAdminCreateUserOnly: false,
    },
  });
});

it("should disable self sign-up when AUTH_ALLOW_USER_REGISTRATION is false", () => {
  process.env.AUTH_ALLOW_USER_REGISTRATION = "false";

  const appDisabled = new cdk.App();
  const stackDisabled = new AuthCdkStack(appDisabled, "TestAuthCdkStackDisabled");
  const templateDisabled = Template.fromStack(stackDisabled);

  templateDisabled.hasResourceProperties("AWS::Cognito::UserPool", {
    AdminCreateUserConfig: {
      AllowAdminCreateUserOnly: true,
    },
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd infra-cdk && npm test -- --testPathPattern=auth-cdk
```

Expected: the new tests and the updated existing assertion fail — `AllowAdminCreateUserOnly` is still `true` in all cases because the implementation hasn't changed yet.

---

### Task 2: Implement `selfSignUpEnabled` in `AuthCdkStack`

- [ ] **Step 1: Edit `infra-cdk/lib/auth-cdk-stack.ts`**

After the existing `const callbackUrls` / `const logoutUrls` lines (around line 61), add:

```typescript
// Self sign-up: controlled by AUTH_ALLOW_USER_REGISTRATION env var.
// deploy.sh sets this from SSM (default: "true").
// Set to "false" via SSM after initial setup to prevent new registrations.
const selfSignUpEnabled = requireEnv("AUTH_ALLOW_USER_REGISTRATION") === "true";
```

Then change the `selfSignUpEnabled` property in the `cognito.UserPool` constructor (currently line 69) from:

```typescript
// Admin-only user creation: users cannot self-register
// All accounts must be created by an administrator via AWS Console or API
selfSignUpEnabled: false,
```

to:

```typescript
// Self sign-up controlled by AUTH_ALLOW_USER_REGISTRATION env var.
selfSignUpEnabled,
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
cd infra-cdk && npm test -- --testPathPattern=auth-cdk
```

Expected: all tests pass.

- [ ] **Step 4: Run full infra-cdk test suite**

```bash
cd infra-cdk && npm test
```

Expected: all tests pass.

- [ ] **Step 5: Run typecheck**

```bash
cd infra-cdk && npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add infra-cdk/lib/auth-cdk-stack.ts infra-cdk/test/auth-cdk.test.ts
git commit -m "enable self sign-up in Cognito, controlled by AUTH_ALLOW_USER_REGISTRATION"
```

---

### Task 3: Update `deploy.sh`

- [ ] **Step 1: Add default and SSM read to `deploy.sh`**

After the existing defaults block (after `DEFAULT_AWS_LAMBDA_TIMEOUT_SECONDS` line ~127), add:

```bash
DEFAULT_AUTH_ALLOW_USER_REGISTRATION="true"
```

After the existing SSM reads block (after `AWS_LAMBDA_TIMEOUT_SECONDS=$(ssm_get_or_default ...)` line ~157), add:

```bash
AUTH_ALLOW_USER_REGISTRATION=$(ssm_get_or_default "/manual/budget/$ENV/auth/allow-user-registration" "$DEFAULT_AUTH_ALLOW_USER_REGISTRATION") || exit $?
echo "AUTH_ALLOW_USER_REGISTRATION=$AUTH_ALLOW_USER_REGISTRATION"
```

- [ ] **Step 2: Pass the env var to the CDK deploy command**

Find the `env ... npm run deploy` block (~lines 175–185). It currently looks like:

```bash
env AUTH_CLAIM_NAMESPACE="$AUTH_CLAIM_NAMESPACE" \
    AUTH_DOMAIN_PREFIX="$AUTH_DOMAIN_PREFIX" \
    AWS_BEDROCK_CONNECTION_TIMEOUT="$AWS_BEDROCK_CONNECTION_TIMEOUT" \
    AWS_BEDROCK_MAX_TOKENS="$AWS_BEDROCK_MAX_TOKENS" \
    AWS_BEDROCK_MODEL_ID="$AWS_BEDROCK_MODEL_ID" \
    AWS_BEDROCK_REQUEST_TIMEOUT="$AWS_BEDROCK_REQUEST_TIMEOUT" \
    AWS_BEDROCK_TEMPERATURE="$AWS_BEDROCK_TEMPERATURE" \
    AWS_LAMBDA_MEMORY_SIZE="$AWS_LAMBDA_MEMORY_SIZE" \
    AWS_LAMBDA_TIMEOUT_SECONDS="$AWS_LAMBDA_TIMEOUT_SECONDS" \
    NODE_ENV="$NODE_ENV" \
  npm run deploy -- --outputs-file "$CDK_OUTPUT_FILE"
```

Add `AUTH_ALLOW_USER_REGISTRATION` after `AUTH_DOMAIN_PREFIX`:

```bash
env AUTH_CLAIM_NAMESPACE="$AUTH_CLAIM_NAMESPACE" \
    AUTH_ALLOW_USER_REGISTRATION="$AUTH_ALLOW_USER_REGISTRATION" \
    AUTH_DOMAIN_PREFIX="$AUTH_DOMAIN_PREFIX" \
    AWS_BEDROCK_CONNECTION_TIMEOUT="$AWS_BEDROCK_CONNECTION_TIMEOUT" \
    AWS_BEDROCK_MAX_TOKENS="$AWS_BEDROCK_MAX_TOKENS" \
    AWS_BEDROCK_MODEL_ID="$AWS_BEDROCK_MODEL_ID" \
    AWS_BEDROCK_REQUEST_TIMEOUT="$AWS_BEDROCK_REQUEST_TIMEOUT" \
    AWS_BEDROCK_TEMPERATURE="$AWS_BEDROCK_TEMPERATURE" \
    AWS_LAMBDA_MEMORY_SIZE="$AWS_LAMBDA_MEMORY_SIZE" \
    AWS_LAMBDA_TIMEOUT_SECONDS="$AWS_LAMBDA_TIMEOUT_SECONDS" \
    NODE_ENV="$NODE_ENV" \
  npm run deploy -- --outputs-file "$CDK_OUTPUT_FILE"
```

- [ ] **Step 3: Commit**

```bash
git add deploy.sh
git commit -m "pass AUTH_ALLOW_USER_REGISTRATION from SSM to CDK"
```

---

### Task 4: Update `infra-cdk/.env.example`

- [ ] **Step 1: Edit `infra-cdk/.env.example`**

Add the new variable to the `# Auth Stack` section:

```
# Auth Stack
AUTH_ALLOW_USER_REGISTRATION=true
AUTH_CALLBACK_URLS=http://localhost:5173
AUTH_CLAIM_NAMESPACE=https://personal-budget-tracker
AUTH_DOMAIN_PREFIX=dev-budget-auth
AUTH_LOGOUT_URLS=http://localhost:5173
AWS_LAMBDA_MEMORY_SIZE=512
AWS_LAMBDA_TIMEOUT_SECONDS=30
```

- [ ] **Step 2: Commit**

```bash
git add infra-cdk/.env.example
git commit -m "document AUTH_ALLOW_USER_REGISTRATION in .env.example"
```

---

### Task 5: Document the SSM parameter in `README.md`

- [ ] **Step 1: Edit `README.md`**

In the "Override Configuration (Optional)" section, add a new entry. Place it with the other `auth/` parameters (after `auth/scope`):

```markdown
# Allow/disable user registration (disable after your initial sign-up)
aws ssm put-parameter --overwrite --type String \
    --name "/manual/budget/production/auth/allow-user-registration" \
    --value "false"
```

Also add a note above the parameter block in that section. Currently the section starts with:

```markdown
### Override Configuration (Optional)

All parameters have sensible defaults. To override any default, create parameters in AWS Systems Manager Parameter Store:
```

Add this paragraph after "create parameters in AWS Systems Manager Parameter Store:":

```markdown

> **First-time setup tip:** By default, user registration is open so you can sign up immediately after deployment. Once you've created your account, disable registration by setting `auth/allow-user-registration` to `false` and redeploying.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "document user registration SSM parameter in README"
```

---

### Task 6: Open PR

- [ ] **Step 1: Push branch and open PR**

```bash
git push origin <branch-name>
gh pr create --title "Track 2: user self-registration via Cognito" --body "$(cat <<'EOF'
## Summary

- Cognito User Pool now enables self sign-up by default
- New SSM parameter `/manual/budget/{env}/auth/allow-user-registration` controls it (default: `true`)
- `deploy.sh` reads the parameter and passes it to CDK as `AUTH_ALLOW_USER_REGISTRATION`
- `AuthCdkStack` sets `selfSignUpEnabled` based on the env var
- README documents the first-time setup workflow and how to lock registration after signup

## Test plan

- [ ] CDK tests pass (`npm test` in `infra-cdk/`)
- [ ] Deploy to staging with default settings → self sign-up appears on Cognito hosted UI
- [ ] Set SSM param to `false`, redeploy → sign-up option no longer available

Closes part of #306.
EOF
)"
```
