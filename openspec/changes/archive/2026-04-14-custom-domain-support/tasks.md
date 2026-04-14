## 1. FrontendCdkStack — Custom Domain

- [x] 1.1 Add SSM lookup for `/manual/budget/<env>/frontend/custom-domain` via `ssm.StringParameter.valueFromLookup()` with empty string default
- [x] 1.2 Add `Token.isUnresolved()` guard — skip all custom domain resources when value is unresolved or empty
- [x] 1.3 Look up the pre-existing Route 53 hosted zone using `HostedZone.fromLookup()` with the custom domain value
- [x] 1.4 Create an ACM certificate with `CertificateValidation.fromDns(hostedZone)` for automatic Route 53 DNS validation
- [x] 1.5 Add the custom domain as a CloudFront alias with the ACM certificate
- [x] 1.6 Create a Route 53 A record (alias) pointing the custom domain to the CloudFront distribution
- [x] 1.7 Add `CustomDomainURL` CDK output emitted only when custom domain is configured
- [x] 1.8 Confirm `CloudFrontFullURL` output is unchanged (always `*.cloudfront.net`)

## 2. AuthCallbackConfigStack — Cognito Callback URLs

- [x] 2.1 Add optional `customDomainUrl?: string` prop to `AuthCallbackConfigStackProps`
- [x] 2.2 Update `CallbackURLs` and `LogoutURLs` to include `customDomainUrl` alongside `distributionUrl` when present
- [x] 2.3 Confirm existing behavior unchanged when `customDomainUrl` is not provided

## 3. App Entry Point — Wire Custom Domain

- [x] 3.1 In `bin/app.ts`, expose `customDomainUrl` from `FrontendCdkStack` as a public property (when custom domain is configured)
- [x] 3.2 Pass `customDomainUrl` from `FrontendCdkStack` into `AuthCallbackConfigStack` props

## 4. README Updates

- [x] 4.1 Add "Custom Domain Support" to the Core Features list in `README.md`
- [x] 4.2 Add `/manual/budget/<env>/frontend/custom-domain` SSM parameter to the Override Configuration section with description and example `aws ssm put-parameter` command
- [x] 4.3 Add a new "Custom Domain Setup" section to `README.md` with:
  - Prerequisites (Route 53 hosted zone creation, NS delegation to your DNS provider, propagation wait)
  - SSM parameter configuration step
  - Note that `./deploy.sh` handles cert provisioning and DNS automatically after prerequisites are met
  - Note about `cdk.context.json` caching and how to clear it if the domain changes

## 5. Verification

- [x] 5.1 Deploy to staging with the SSM param set — confirm `CustomDomainURL` output appears and app is accessible at the custom domain
- [x] 5.2 Confirm sign-in and sign-out work via the custom domain
- [x] 5.3 Deploy without the SSM param — confirm no custom domain resources are created and `CloudFrontFullURL` is correct
- [x] 5.4 Run `npm run typecheck` in `infra-cdk/` — no TypeScript errors

## Constitution Compliance

- **Infra CDK is TypeScript + AWS CDK** — all changes are within `infra-cdk/`; compliant
- **Vendor Independence** — custom domain is purely optional and additive; frontend and backend remain portable; CDK is already AWS-specific per constitution; compliant
- **Deploy with free or minimal cost** — ACM certs are free; Route 53 hosted zone is user-managed and optional; compliant
- **No mandatory paid subscriptions** — entire feature is opt-in; compliant
