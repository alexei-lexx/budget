## 1. Tests — Write Failing Tests for `selfSignUpEnabled`

- [ ] 1.1 Add `AUTH_ALLOW_USER_REGISTRATION = "true"` to `beforeEach` in `infra-cdk/test/auth-cdk.test.ts` (before `AUTH_CALLBACK_URLS`); add `delete process.env.AUTH_ALLOW_USER_REGISTRATION` to `afterEach`
- [ ] 1.2 In the existing `it("should create the stack")` test, change the `AllowAdminCreateUserOnly` assertion from `true` to `false`
- [ ] 1.3 Add a new `it` block: `"should enable self sign-up when AUTH_ALLOW_USER_REGISTRATION is true"` — asserts `AllowAdminCreateUserOnly: false` using the template from `beforeEach`
- [ ] 1.4 Add a new `it` block: `"should disable self sign-up when AUTH_ALLOW_USER_REGISTRATION is false"` — sets env var to `"false"`, constructs a new `AuthCdkStack`, asserts `AllowAdminCreateUserOnly: true`
- [ ] 1.5 Run `cd infra-cdk && npm test -- --testPathPattern=auth-cdk` — confirm new tests fail and existing assertion fails (implementation not yet changed)

## 2. Implementation — `AuthCdkStack`

- [ ] 2.1 In `infra-cdk/lib/auth-cdk-stack.ts`, after the `callbackUrls`/`logoutUrls` lines, add: `const selfSignUpEnabled = requireEnv("AUTH_ALLOW_USER_REGISTRATION") === "true";`
- [ ] 2.2 Replace the hardcoded `selfSignUpEnabled: false` property (and its comment) in the `cognito.UserPool` constructor with `selfSignUpEnabled,` and a new comment: `// Self sign-up controlled by AUTH_ALLOW_USER_REGISTRATION env var.`
- [ ] 2.3 Run `cd infra-cdk && npm test -- --testPathPattern=auth-cdk` — confirm all auth-cdk tests pass
- [ ] 2.4 Run `cd infra-cdk && npm test` — confirm full suite passes with no regressions
- [ ] 2.5 Run `cd infra-cdk && npm run typecheck` — confirm no TypeScript errors

## 3. Infrastructure — `deploy.sh`

- [ ] 3.1 Add `DEFAULT_AUTH_ALLOW_USER_REGISTRATION="true"` to the defaults block in `deploy.sh`, after `DEFAULT_AUTH_DOMAIN_PREFIX` (alphabetical within auth defaults)
- [ ] 3.2 Add the SSM read after the `AUTH_DOMAIN_PREFIX` SSM read: `AUTH_ALLOW_USER_REGISTRATION=$(ssm_get_or_default "/manual/budget/$ENV/auth/allow-user-registration" "$DEFAULT_AUTH_ALLOW_USER_REGISTRATION") || exit $?` followed by `echo "AUTH_ALLOW_USER_REGISTRATION=$AUTH_ALLOW_USER_REGISTRATION"`
- [ ] 3.3 In the `env … npm run deploy` block, add `AUTH_ALLOW_USER_REGISTRATION="$AUTH_ALLOW_USER_REGISTRATION" \` between `AUTH_CLAIM_NAMESPACE` and `AUTH_DOMAIN_PREFIX`

## 4. Documentation

- [ ] 4.1 In `infra-cdk/.env.example`, add `AUTH_ALLOW_USER_REGISTRATION=true` as the first line of the `# Auth Stack` section (before `AUTH_CALLBACK_URLS`)
- [ ] 4.2 In `README.md`, add a first-time setup tip paragraph after "create parameters in AWS Systems Manager Parameter Store:" in the "Override Configuration" section
- [ ] 4.3 In `README.md`, add the `auth/allow-user-registration` SSM parameter example after the `auth/scope` block in the Override Configuration code block

## Constitution Compliance

- **Code Quality Validation**: Tasks 1.5, 2.3, 2.4, and 2.5 enforce the mandatory test → full suite → typecheck pipeline from the constitution.
- **Test Strategy**: Tasks 1.1–1.5 follow TDD (failing tests first) and co-locate tests with source. Both branches of the toggle are covered.
- **Backend Layer Structure**: No backend code changes — Cognito handles registration natively.
- **Vendor Independence**: Change confined to `infra-cdk/`; frontend and backend remain unmodified.
- **TypeScript Code Standards**: `selfSignUpEnabled` shorthand property is idiomatic TypeScript; `requireEnv` follows the existing pattern.
