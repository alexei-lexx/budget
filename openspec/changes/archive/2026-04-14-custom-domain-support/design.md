## Context

The app is currently accessible only via its auto-generated `*.cloudfront.net` URL. Users who own a custom domain have no mechanism to attach it to the CloudFront distribution. This change adds optional custom domain support driven entirely by a single SSM parameter — if the parameter is absent, nothing changes.

The infrastructure is managed by AWS CDK in `infra-cdk/`. The relevant stacks are:

- **`FrontendCdkStack`** — owns the S3 bucket and CloudFront distribution
- **`AuthCallbackConfigStack`** — owns Cognito callback/logout URL configuration; currently sets only the CloudFront URL

## Goals / Non-Goals

**Goals:**

- Allow an optional custom domain to be attached to CloudFront via SSM
- Automate certificate provisioning and DNS configuration via Route 53
- Keep Cognito auth working when the app is accessed via the custom domain
- Emit a dedicated `CustomDomainURL` CDK output when a custom domain is configured
- Document the setup in `README.md`

**Non-Goals:**

- Domain registration or DNS provider management (user responsibility)
- Support for non-Route 53 DNS providers in the automated path
- Multiple custom domains per environment
- CDK ownership of the Route 53 hosted zone (user pre-creates it)

## Decisions

### Decision 1: SSM lookup in CDK, not in `deploy.sh`

**Chosen**: CDK reads `/manual/budget/<env>/frontend/custom-domain` directly via `ssm.StringParameter.valueFromLookup()` at synth time.

**Alternatives considered**:

- `deploy.sh` fetches the param and passes it as an env var — consistent with all other params in the project, but would require `deploy.sh` changes and mixing infrastructure concerns into the shell script for something that is purely CDK's concern.

**Rationale**: The custom domain drives CDK resource creation (hosted zone lookup, cert, alias, DNS record) — these are synth-time decisions that belong in CDK, not in a shell script. The value is cached in `cdk.context.json` after the first successful lookup.

**Guard**: Use `cdk.Token.isUnresolved()` to detect unresolved/dummy values during `cdk diff` or first synth when the parameter doesn't exist yet. When unresolved, skip all custom domain resources.

### Decision 2: Pre-existing Route 53 hosted zone, looked up by domain name

**Chosen**: User pre-creates the hosted zone manually. CDK looks it up via `HostedZone.fromLookup()` using the domain name from SSM.

**Alternatives considered**:

- CDK creates the hosted zone — risks accidental destruction on `cdk destroy`; also requires a two-phase deploy (create zone → delegate NS → deploy cert), breaking the single-command deploy
- Require hosted zone ID as a second SSM param — unnecessary; `fromLookup()` by domain name is unambiguous for a personal app (one zone per domain)

**Rationale**: Zone pre-creation is a one-time setup step. Keeping the zone outside CDK's lifecycle prevents accidental DNS destruction and keeps `./deploy.sh` as a single-command deploy after prerequisites are met.

### Decision 3: CDK creates and validates the ACM certificate

**Chosen**: `aws-certificatemanager.Certificate` with `CertificateValidation.fromDns(hostedZone)` — CDK adds the DNS validation CNAME to Route 53 automatically, cert validates without manual intervention.

**Alternatives considered**:

- Pre-provisioned cert ARN in SSM — eliminates CDK cert management but requires a second SSM param and a manual ACM step per environment
- Cloudflare-only path (CNAME + pre-existing cert) — too provider-specific; Route 53 delegation is the general solution

**Rationale**: With the Route 53 hosted zone already delegated, CDK can fully automate cert creation and validation in a single deploy. No manual ACM step needed.

**Cross-region note**: CloudFront requires ACM certs in `us-east-1`. The `FrontendCdkStack` must set `crossRegionReferences: true` and the cert must be created with `env: { region: 'us-east-1' }` if the stack is deployed to another region. If the stack is already deployed to `us-east-1`, this is a no-op.

### Decision 4: `CloudFrontFullURL` unchanged; new `CustomDomainURL` output added

**Chosen**: `CloudFrontFullURL` always emits the `*.cloudfront.net` URL. A new `CustomDomainURL` output is emitted only when a custom domain is configured.

**Alternatives considered**:

- Replace `CloudFrontFullURL` with the custom domain when configured — would change existing output semantics and could break anything consuming that output

**Rationale**: Additive change — existing consumers of `CloudFrontFullURL` are unaffected.

### Decision 5: Cognito callbacks include both URLs

**Chosen**: `AuthCallbackConfigStack` is updated to accept an optional `customDomainUrl` prop. When present, both the custom domain URL and the CloudFront URL are included in `CallbackURLs` and `LogoutURLs`.

**Rationale**: Auth silently fails if a user accesses the app via the custom domain and Cognito's allowed redirect list doesn't include it. This is not optional — it must be in scope.

## Risks / Trade-offs

- **`cdk.context.json` drift** — SSM lookups are cached. If the SSM param value changes, run `cdk context --clear` to force re-lookup. → Mitigation: document in README.
- **Cross-region cert complexity** — If the stack is not in `us-east-1`, CDK uses a nested stack for the cross-region cert resource. This is transparent but adds a CloudFormation nested stack. → Mitigation: no action needed; CDK handles it automatically with `crossRegionReferences: true`.
- **First deploy with param set** — CDK will create the cert and wait for DNS validation. With Route 53 delegation already in place, this is automatic. If delegation is not yet propagated, the deploy will wait or time out. → Mitigation: document the propagation prerequisite clearly.
- **`fromLookup()` requires valid AWS credentials at synth time** — Running `cdk synth` or `cdk diff` without credentials will fail to resolve the hosted zone. → Mitigation: consistent with existing CDK usage in this project.

## Migration Plan

1. User completes one-time prerequisites (Route 53 hosted zone creation, NS delegation, SSM param)
2. Run `./deploy.sh` as normal — CDK detects the SSM param, creates cert, configures CloudFront alias, creates DNS A record, updates Cognito callbacks
3. After deploy, `CustomDomainURL` appears in CDK outputs
4. **Rollback**: Delete the SSM param, run `./deploy.sh` — CDK removes the alias, cert, and DNS record; Cognito callbacks revert to CloudFront URL only

## Open Questions

_(none — all decisions resolved during exploration)_

## Constitution Compliance

- **Infra CDK is TypeScript + AWS CDK** — compliant; all changes are within `infra-cdk/`
- **Vendor Independence** — compliant; custom domain is purely optional and additive; frontend and backend remain portable; CDK is already AWS-specific per constitution
- **Deploy with free or minimal cost** — compliant; ACM certs are free; Route 53 hosted zone (~$0.50/month) is user-managed and optional
- **No mandatory paid subscriptions** — compliant; entire feature is opt-in
