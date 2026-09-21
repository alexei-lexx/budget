## Context

`infra-cdk/lib/backend-cdk-stack.ts` defines 8 DynamoDB tables via `commonTableOptions`. Tables already have PITR, `removalPolicy: RETAIN`, and `deletionProtection: true`. This stack deploys once per environment via `deploy.sh`. Local dev uses DynamoDB Local and never runs this stack. `aws-cdk-lib` (^2.260.0) already includes `aws-backup` constructs — no new dependency needed. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- One AWS Backup vault and one daily backup plan per environment, in `BackendCdkStack`.
- Tables added later are covered automatically.
- 30-day retention with automatic expiry.

**Non-Goals:**

- Cross-region backup copy (excluded per proposal).
- Continuous (PITR-based) backups — this is scheduled snapshot backup.
- Automating or testing restores. CDK provisions the capability; restore is manual.
- Changing existing PITR configuration.

## Decisions

**Use `aws-cdk-lib/aws-backup` L2 constructs, not `Cfn*`.**
Same style as the rest of this file. Simpler than the L1 equivalents, same result.

**Tag tables via `Tags.of(this).add("backup", this.stackName, { includeResourceTypes: ["AWS::DynamoDB::Table"] })`.**
`dynamodb.TableProps` has no `tags` field, so this can't go through `commonTableOptions`. `includeResourceTypes` scopes the tag to DynamoDB tables only, enforced by CDK — not by convention. One line at the stack level covers all current and future tables; no list to maintain.

**Tag value is `this.stackName`, not a constant like `"true"`.**
AWS Backup tag selection matches account/region-wide. A constant value would let one environment's backup plan sweep in another environment's or another app's tables sharing the same account. The stack name (e.g. `production-BudgetBackend`) scopes selection to this stack's tables only.

**`BackupPlan.addSelection` auto-creates the IAM role.**
CDK attaches the AWS-managed `AWSBackupServiceRolePolicyForBackup` policy. Standard usage; no reason to hand-roll a scoped role.

**One custom `BackupPlanRule`, not a preset.**
CDK's bundled presets don't offer 30-day retention. Daily `events.Schedule.cron(...)`, `deleteAfter: Duration.days(30)`, no cold storage.

**Backup window: 03:00 UTC daily.**
Low-traffic hours. Arbitrary but documented so it isn't re-litigated later.

**`BackupVault` removal policy: `RETAIN`.**
Matches the tables' own removal policy. Prevents losing backup history if the stack is destroyed.

**Vault and plan live directly in `BackendCdkStack`, not a separate stack.**
Backups are tied to these tables and already deploy alongside them.

## Risks / Trade-offs

- [Backup storage cost grows as data volume grows] → Billed per GB-month; minimal today; visible in Cost Explorer if it matters later.
- [Daily snapshots mean up to ~24h of data loss on table deletion] → Accepted per proposal; PITR still covers the table-exists case.
- [Backups run per-table, not as one cross-table consistent snapshot] → No cross-table transactional invariant depends on this.
- [Tag reuse could pull in the wrong resources] → `includeResourceTypes` blocks non-table resources; stack-name tag value blocks cross-environment/app leakage.

## Migration Plan

- Add the stack-level `backup` tag and the `BackupVault`/`BackupPlan`/`BackupSelection` constructs to `BackendCdkStack`.
- Deploy via existing `deploy.sh` / `cdk deploy`. No data migration, no app code changes, no cross-stack ordering constraints.
- First backup runs at the next 03:00 UTC window after deploy. No backfill.
- Rollback: remove the construct and redeploy. Vault has `RETAIN`, so existing recovery points survive and need manual deletion via the AWS Backup console if unwanted.

## Constitution Compliance

- **General Requirements (minimal cost)**: Confirmed in proposal.md — billed per GB-month, minimal at current volume, no mandatory subscription.
- **Vendor Independence**: Confirmed in proposal.md — infra-cdk is explicitly allowed to be AWS-specific.
- **Schema-Driven Development, Backend Layer Structure, Repository Pattern, Result Pattern, Domain Entities, Data Migrations, Authentication & Authorization, Test Strategy, Input Validation, UI Guidelines, Frontend Code Discipline**: Not applicable — infra-only change.
- **Code Quality Validation**: `npm run typecheck` and `npm run format` must pass in `infra-cdk` at implementation time. No test suite configured there, so test steps are skipped per its documented exception.
