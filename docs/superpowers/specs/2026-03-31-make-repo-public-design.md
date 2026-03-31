# Design: Make Repository Public

**Date**: 2026-03-31
**Issue**: [#306 — get repository ready to be made public](https://github.com/alexei-lexx/budget/issues/306)

## Goal

Prepare the repository to be made public as a portfolio piece. The primary audience is employers and technical reviewers evaluating skills and code quality.

## Scope

Three independent tracks, each delivered as a separate PR. The repository is made public only after all three tracks land on main.

## Track 1 — Security & License

### Git History Scan

Scan the full git history for committed secrets, credentials, API keys, or PII using `trufflehog` (filesystem mode against the local repo). If any are found, rewrite history with `git filter-repo` before going public.

### License

Add a `LICENSE` file at the repo root using **PolyForm Noncommercial License 1.0.0**:

- Personal, research, hobby, and non-profit use is permitted free of charge.
- Commercial use is not permitted without contacting the licensor.
- No expiry — the non-commercial restriction applies permanently.

Rationale: permissive for personal/portfolio use, prevents commercial exploitation without permission.

### Root `.gitignore` Hardening

The root `.gitignore` currently only excludes `.playwright` and `.playwright-cli`. Add common safety entries as a defense-in-depth measure (subdirectory `.gitignore`s already handle these for their respective packages):

```
.env*
!**/.env.example
!**/.env.test.example
*.pem
*.key
cdk-outputs*.json
```

### CI Badge

Add a GitHub Actions CI status badge to the README title line, pointing to the `ci.yml` workflow on the `main` branch.

## Track 2 — User Registration Feature

### Problem

After deployment, users must be manually created in AWS Cognito. This breaks the setup experience for anyone deploying the app from the public repo.

### Solution

Enable Cognito self-service sign-up by default, with an SSM parameter toggle to disable it after initial setup.

### deploy.sh Changes

Add a new SSM parameter read following the existing `ssm_get_or_default` pattern:

```bash
DEFAULT_AUTH_ALLOW_USER_REGISTRATION="true"
AUTH_ALLOW_USER_REGISTRATION=$(ssm_get_or_default \
  "/manual/budget/$ENV/auth/allow-user-registration" \
  "$DEFAULT_AUTH_ALLOW_USER_REGISTRATION") || exit $?
echo "AUTH_ALLOW_USER_REGISTRATION=$AUTH_ALLOW_USER_REGISTRATION"
```

Pass it as an env var to CDK alongside the other auth parameters.

### CDK Changes

In the Cognito User Pool construct, read `process.env.AUTH_ALLOW_USER_REGISTRATION` and map `"true"` → `selfSignUpEnabled: true`, anything else → `false`.

No frontend or backend code changes are needed — Cognito handles registration natively.

### Documentation

Add a new entry to the "Override Configuration" section in `README.md`:

```bash
# Disable user registration (after initial setup)
aws ssm put-parameter --overwrite --type String \
    --name "/manual/budget/production/auth/allow-user-registration" \
    --value "false"
```

Include a brief workflow note: deploy → sign up with your account → set to `false` → redeploy to lock registration.

## Track 3 — README & Screenshots

### Screenshots

Capture key screens from a staging environment:

- Accounts list
- Categories list
- Transaction entry (manual)
- Quick transaction entry (AI — type "coffee 4.50")
- Monthly report / category breakdown
- Insights (AI answer to a spending question)
- Telegram integration (chat example)

Store images under `docs/screenshots/` and reference them from the README.

### README Structure

Final section order:

1. Title + CI badge
2. Core Features (existing)
3. Technologies (existing)
4. Screenshots — inline link from the features section (e.g. "→ See screenshots") jumping to a `## Screenshots` section at the bottom of the file
5. Repository Structure (existing)
6. Deployment (existing)
7. **Screenshots** section (at the bottom)

The screenshots section at the bottom contains the actual images. The inline link after the feature list lets readers jump there without disrupting the top-to-bottom reading flow.

### docs/requirements.md

Add a one-line note at the top clarifying this is the living business requirements document, so public visitors understand its purpose.

## Out of Scope

- CONTRIBUTING.md — not needed for a portfolio-first repo
- CODE_OF_CONDUCT.md — not needed
- GitHub issue/PR templates — not needed
- Live demo — screenshots are sufficient; a live instance would incur ongoing AWS Bedrock costs
