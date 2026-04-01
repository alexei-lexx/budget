## Issue

[#306 — get repository ready to be made public](https://github.com/alexei-lexx/budget/issues/306)

## Why

After deployment, users must be manually created in AWS Cognito, which breaks the setup experience for anyone deploying the app from the public repository. Enabling self-service sign-up by default lets new deployers register immediately, while an SSM toggle lets them lock registration after their initial account is created.

## What Changes

- Cognito User Pool enables `selfSignUpEnabled: true` by default
- New SSM parameter `/manual/budget/{env}/auth/allow-user-registration` (default: `"true"`) controls whether self sign-up is active
- `deploy.sh` reads the new SSM parameter and passes it as `AUTH_ALLOW_USER_REGISTRATION` env var to CDK
- `AuthCdkStack` maps `AUTH_ALLOW_USER_REGISTRATION="true"` → `selfSignUpEnabled: true`, anything else → `false`
- `infra-cdk/.env.example` documents the new env var
- `README.md` documents the SSM parameter and the recommended first-time setup workflow

## Capabilities

### New Capabilities

_None — this change extends an existing authentication capability._

### Modified Capabilities

- `auth`: Adds self-service user registration via the Cognito hosted UI. Previously all accounts required manual admin creation. The requirement is now that users can sign up themselves by default, with registration lockable via SSM after initial setup.

## Impact

- **infra-cdk/lib/auth-cdk-stack.ts**: reads `AUTH_ALLOW_USER_REGISTRATION` env var, changes `selfSignUpEnabled` from hardcoded `false`
- **infra-cdk/test/auth-cdk.test.ts**: existing `AllowAdminCreateUserOnly: true` assertion changes; two new test cases added
- **deploy.sh**: new SSM read + new env var passed to CDK deploy command
- **infra-cdk/.env.example**: new env var documented
- **README.md**: new SSM parameter and first-time setup workflow documented
- No backend, frontend, or GraphQL schema changes required — Cognito handles registration natively

## Constitution Compliance

- **Vendor Independence**: Change is confined to CDK infrastructure code; frontend and backend remain unchanged and portable.
- **Authentication & Authorization**: All authentication still flows through AWS Cognito. The change only toggles whether Cognito allows new user sign-ups; JWT-based auth and user data isolation are unaffected.
- **Code Quality Validation**: CDK tests must pass (`npm test`) and typecheck must pass (`npm run typecheck`) before completion.
- **Test Strategy**: CDK unit tests cover both `true` and `false` branches using `aws-cdk-lib/assertions`, consistent with the existing infra-cdk test strategy.
