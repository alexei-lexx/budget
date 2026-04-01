## Context

Currently, `AuthCdkStack` hardcodes `selfSignUpEnabled: false` on the Cognito User Pool, meaning all user accounts must be created manually via the AWS Console. This blocks anyone who deploys the app from the public repository from registering without admin access.

The fix is a controlled toggle: `selfSignUpEnabled` reads from the `AUTH_ALLOW_USER_REGISTRATION` env var, which `deploy.sh` resolves from an SSM parameter (defaulting to `"true"`). No frontend or backend changes are required — Cognito handles registration natively through its hosted UI.

## Goals / Non-Goals

**Goals:**

- Enable self sign-up by default so new deployers can register immediately after deployment
- Provide an SSM-controlled toggle to lock registration after initial account creation
- Keep CDK unit tests aligned with the new behavior (both branches covered)

**Non-Goals:**

- Frontend changes — Cognito hosted UI handles registration without app changes
- Backend changes — user provisioning already happens on first successful auth
- Multi-tenant or invite-only registration flows
- Email domain restrictions or custom sign-up triggers

## Decisions

### Decision 1: `requireEnv` over optional read

Use `requireEnv("AUTH_ALLOW_USER_REGISTRATION")` in `AuthCdkStack` rather than reading `process.env.AUTH_ALLOW_USER_REGISTRATION` with a fallback.

**Rationale**: All other env-var reads in `AuthCdkStack` use `requireEnv`. Making `AUTH_ALLOW_USER_REGISTRATION` required at CDK synthesis time ensures `deploy.sh` always provides it (via SSM default) and prevents silent misconfiguration. The default value lives in `deploy.sh`, not in the CDK stack.

**Alternative considered**: `process.env.AUTH_ALLOW_USER_REGISTRATION ?? "true"` inline. Rejected because it scatters default logic across two places and diverges from the existing pattern.

### Decision 2: String comparison `=== "true"` instead of a boolean SSM type

SSM `String` parameters hold string values. The env var arrives as `"true"` or `"false"`. An exact equality check (`=== "true"`) maps any non-`"true"` value — including typos — to `selfSignUpEnabled: false`, which is the safe/restrictive default.

**Alternative considered**: Truthy check (`!== "false"`). Rejected because an accidental value like `"yes"` or `""` would silently enable self-signup, which is the more dangerous outcome.

### Decision 3: Alphabetical placement in `deploy.sh` env block

`AUTH_ALLOW_USER_REGISTRATION` is inserted between `AUTH_CLAIM_NAMESPACE` and `AUTH_DOMAIN_PREFIX` in both the defaults block and the `env … npm run deploy` block — following the existing alphabetical-within-auth convention.

## Risks / Trade-offs

- **Open registration window**: Between deployment and SSM-lock, self sign-up is open to anyone with the Cognito hosted UI URL. → Mitigation: README documents the workflow clearly; window is short for a deliberate deployer.
- **Cognito User Pool update in production**: Changing `AllowAdminCreateUserOnly` on an existing User Pool is an in-place update (no replacement). Cognito supports this property change without recreating the pool, so existing users are unaffected.
- **No email domain restriction**: Any email can register. → Out of scope; can be added via a pre sign-up Lambda trigger in a future change.

## Migration Plan

1. Deploy with default SSM value (`"true"`) → self sign-up is active.
2. Register your user account via the Cognito hosted UI.
3. Set SSM parameter to `"false"`:
   ```bash
   aws ssm put-parameter --overwrite --type String \
     --name "/manual/budget/production/auth/allow-user-registration" \
     --value "false"
   ```
4. Redeploy → `AllowAdminCreateUserOnly` flips back to `true` in Cognito.

**Rollback**: Revert SSM parameter to `"true"` and redeploy. No data changes required.

## Constitution Compliance

- **Vendor Independence**: Change is confined to `infra-cdk/`; frontend and backend packages are unmodified and remain runtime-portable.
- **Authentication & Authorization**: All auth still flows through Cognito; JWT verification, user provisioning, and data isolation are unchanged.
- **Code Quality Validation**: CDK tests, full test suite, and `npm run typecheck` must pass before completion.
- **Test Strategy**: New behavior is covered by CDK `aws-cdk-lib/assertions` unit tests for both the `"true"` and `"false"` branches, consistent with existing infra-cdk test strategy.
- **TypeScript Code Standards**: `selfSignUpEnabled` shorthand property usage is idiomatic and type-safe; `requireEnv` follows the existing pattern.
