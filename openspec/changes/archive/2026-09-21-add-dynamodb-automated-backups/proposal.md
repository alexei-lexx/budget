## Why

DynamoDB tables have point-in-time recovery (PITR) enabled, giving 35 days of continuous restore. PITR data lives with the table itself, so it offers no protection if a table is deleted — deleting the table deletes its PITR history too. The project needs automated, retained backups stored independently of the tables themselves, across all environments.

## What Changes

- Add an AWS Backup vault and daily backup plan in `infra-cdk`, covering all 8 application DynamoDB tables (Users, Accounts, Categories, Transactions, Migrations, ChatMessages, TelegramBots, TrendPresets).
- Select tables by tag, so a table added to the stack later is backed up automatically, with no separate list to maintain — and so that only DynamoDB tables are ever covered, not other resource types.
- Set backup retention to 30 days.
- No cross-region backup copy.

## Capabilities

### New Capabilities

- `data-backups`: automatic, retained backup of application data stored in DynamoDB, independent of the source table's lifecycle.

### Modified Capabilities

None.

## Impact

- `infra-cdk/lib/backend-cdk-stack.ts`: add a Backup construct (vault, plan, tag-based selection); add a `backup` tag to `commonTableOptions`.
- New AWS resources per environment: one Backup vault, one backup plan, one IAM role for the AWS Backup service.
- Additional AWS cost: backup storage is billed per GB-month; expected minimal given current data volume.
- No changes to application code, GraphQL schema, or user-facing behavior.

## Constitution Compliance

- **General Requirements (minimal cost)**: AWS Backup storage is billed per GB-month. Given the current small data footprint, added cost is expected to stay minimal. No mandatory paid subscription is introduced.
- **Vendor Independence**: The constitution explicitly permits infra code to be AWS-specific ("CDK is AWS-specific but frontend and backend remain portable"). This change is infra-only and does not affect backend/frontend portability.
- **Other principles** (Schema-Driven Development, Backend Layer Structure, Repository Pattern, Test Strategy, etc.): not applicable — this change touches infra-cdk only, with no application code, GraphQL schema, or data-layer code changes.
