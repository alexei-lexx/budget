## Code Style

Apply `docs/code-style.md` while implementing these tasks.

## 1. Tests

- [x] 1.1 (use `testing` skill) In `infra-cdk/test/backend-cdk.test.ts`, add a test asserting each of the 8 DynamoDB tables carries a `backup` tag whose value is the stack name.
- [x] 1.2 (use `testing` skill) Add a test asserting exactly one each of `AWS::Backup::BackupVault`, `AWS::Backup::BackupPlan`, and `AWS::Backup::BackupSelection` are synthesized.
- [x] 1.3 (use `testing` skill) Add a test asserting the backup plan rule has a daily schedule and 30-day retention (`Lifecycle.DeleteAfterDays: 30`).
- [x] 1.4 (use `testing` skill) Add a test asserting the backup selection's `ListOfTags` matches key `backup` / value equal to the stack name.
- [x] 1.5 Run the new tests and confirm they fail (no implementation yet).

## 2. Implementation

- [x] 2.1 In `infra-cdk/lib/backend-cdk-stack.ts`, tag the 8 DynamoDB tables via `cdk.Tags.of(this).add("backup", this.stackName, { includeResourceTypes: ["AWS::DynamoDB::Table"] })`.
- [x] 2.2 Add a `backup.BackupVault` construct with `removalPolicy: cdk.RemovalPolicy.RETAIN`.
- [x] 2.3 Add a `backup.BackupPlan` on that vault with one `BackupPlanRule`: daily `events.Schedule.cron` at 03:00 UTC, `deleteAfter: cdk.Duration.days(30)`.
- [x] 2.4 Add a tag-based selection via `plan.addSelection(...)` with `resources: [backup.BackupResource.fromTag("backup", this.stackName)]`.
- [x] 2.5 Run the tests from Section 1 and confirm they pass.

## 3. Validation

- [x] 3.1 Run `npm test` in `infra-cdk` and confirm the full suite passes.
- [x] 3.2 Run `npm run typecheck` in `infra-cdk` and fix any errors.
- [x] 3.3 Run `npm run format` in `infra-cdk` and fix any lint/formatting issues.
- [x] 3.4 Run `npm run synth` in `infra-cdk` and confirm the stack synthesizes cleanly with the new Backup resources.

## Constitution Compliance

- **General Requirements (minimal cost)**: No paid subscription introduced; backup storage cost confirmed minimal in design.md.
- **Vendor Independence**: infra-cdk is explicitly permitted to be AWS-specific; no backend/frontend portability impact.
- **Code Quality Validation**: Section 3 follows the mandatory workflow — test, typecheck, format — for the `infra-cdk` package, which has a test suite configured.
- **Schema-Driven Development, Backend Layer Structure, Repository Pattern, Result Pattern, Domain Entities, Data Migrations, Authentication & Authorization, Test Strategy (backend/frontend), Input Validation, UI Guidelines, Frontend Code Discipline**: Not applicable — infra-only change, no backend/frontend/GraphQL code touched.
