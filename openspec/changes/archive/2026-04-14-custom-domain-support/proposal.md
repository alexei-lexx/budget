## Issue

[#382 — add optional custom domain support for CloudFront via SSM Parameter Store](https://github.com/alexei-lexx/budget/issues/382)

> The app is currently only accessible via the auto-generated `*.cloudfront.net` URL. Users who own a custom domain have no way to attach it to the frontend distribution.

## Why

Users who own a custom domain cannot serve the app from it — only the auto-generated `*.cloudfront.net` URL is available. Adding optional custom domain support lets users access the app through their own domain without affecting deployments where no domain is configured.

## What Changes

- CDK reads an optional custom domain from SSM Parameter Store at synth time (`/manual/budget/<env>/frontend/custom-domain`)
- When the parameter exists, CDK:
  - Looks up the pre-existing Route 53 hosted zone for the domain
  - Creates an ACM certificate in `us-east-1` with automatic DNS validation via Route 53
  - Configures the CloudFront distribution with the custom domain alias and certificate
  - Creates a Route 53 A record (alias) pointing the domain to CloudFront
  - Adds the custom domain URL to Cognito allowed callback and logout URLs (alongside the existing CloudFront URL)
  - Emits a new `CustomDomainURL` CDK output
- When the parameter is absent, the stack deploys exactly as today — no behavior change
- `CloudFrontFullURL` output remains unchanged (always the `*.cloudfront.net` URL)
- `README.md` updated:
  - Custom domain support added to the feature list
  - New SSM parameter documented in the parameters table
  - New section: custom domain setup (prerequisites and configuration steps)

## Capabilities

### New Capabilities

- `custom-domain`: Optional custom domain configuration for the CloudFront distribution, including certificate provisioning, DNS alias setup, and Cognito callback URL registration

### Modified Capabilities

_(none — no existing spec-level behavior changes)_

## Impact

- **`infra-cdk/lib/frontend-cdk-stack.ts`** — SSM lookup, hosted zone lookup, ACM cert, CloudFront alias, Route 53 A record, new CDK output
- **`infra-cdk/lib/auth-callback-config-stack.ts`** — accept optional custom domain URL prop; include it in `CallbackURLs` and `LogoutURLs` when present
- **`infra-cdk/bin/app.ts`** — pass custom domain URL from `FrontendCdkStack` to `AuthCallbackConfigStack`
- **`README.md`** — feature list, SSM parameters table, new setup section
- **Dependencies** — `aws-cdk-lib/aws-route53`, `aws-cdk-lib/aws-route53-targets`, `aws-cdk-lib/aws-certificatemanager` (all already part of `aws-cdk-lib`)

## Constitution Compliance

- **Infra CDK is TypeScript + AWS CDK** — compliant; all changes are within `infra-cdk/`
- **Deploy with free or minimal cost** — compliant; ACM certificates are free, Route 53 hosted zone is ~$0.50/month (user-managed prerequisite, not created by CDK)
- **No mandatory paid subscriptions** — compliant; custom domain is fully optional
- **Minimize vendor lock-in** — compliant; feature is additive and optional; default behavior uses no new vendors
