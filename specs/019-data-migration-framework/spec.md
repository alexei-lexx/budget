# Feature Specification: Data Migration Framework

**Feature Branch**: `019-data-migration-framework`
**Created**: 2025-12-03
**Status**: Draft
**Input**: User description: "Design a data migration framework - it might be similar to migration framework in ruby on rails - it should run locally in development and on production - on production, use lambda function to run the code - it should be run when deploying to production - in development, it should be run as npm script - it should be safe to run it several times, so that it must be safe to deploy changes that dont include any data migrations - main purpose of migrations - to change data, not schema because schema is defined in CDK scripts - each migration must be general purpose function with just dynamodb client as dependency. IMPORTANT: keep thing simple"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and Run Migration Locally (Priority: P1)

A developer needs to modify existing data in DynamoDB tables (e.g., backfill new fields, correct data inconsistencies, migrate data format). They create a migration file, test it locally against a development database, and verify the changes before deploying to production.

**Why this priority**: This is the core workflow that enables all data migrations. Without the ability to create and test migrations locally, developers cannot safely modify production data.

**Independent Test**: Can be fully tested by creating a sample migration that updates test data in a local DynamoDB instance and verifying the migration executes successfully via npm script.

**Acceptance Scenarios**:

1. **Given** a developer has a data modification requirement, **When** they create a new migration file with a timestamped name, **Then** the file is created with the correct structure and function signature
2. **Given** a migration file exists, **When** the developer runs the migration script locally, **Then** the migration executes against the local DynamoDB and modifies data as expected
3. **Given** multiple migration files exist, **When** the developer runs the migration script, **Then** migrations execute in chronological order based on timestamps
4. **Given** a migration has already been executed, **When** the developer runs the migration script again, **Then** the previously executed migration is skipped (idempotent behavior)

---

### User Story 2 - Automatic Migration on Deployment (Priority: P2)

When code is deployed to production, any new migrations that haven't been executed yet should run automatically as part of the deployment process. This ensures data is always in sync with the application code without manual intervention.

**Why this priority**: Automating migrations during deployment ensures consistency between code and data, prevents human error, and enables continuous delivery.

**Independent Test**: Can be tested by deploying to a staging environment with a new migration file and verifying the Lambda function executes the migration automatically during deployment.

**Acceptance Scenarios**:

1. **Given** new migration files exist in the deployment, **When** deploy.sh runs, **Then** the migration Lambda function is invoked that executes all pending migrations
2. **Given** all migrations have been executed previously, **When** a deployment occurs with no new migrations, **Then** the deployment completes successfully without errors
3. **Given** a migration fails during deployment, **When** the Lambda function detects the failure, **Then** the deployment process is halted and an error is reported
4. **Given** migrations are running on production, **When** the Lambda function completes, **Then** the migration history is updated to reflect successful execution

---

### User Story 3 - Migration History Tracking (Priority: P3)

The system maintains a record of which migrations have been executed in each environment. This prevents duplicate execution and provides visibility into data modification history.

**Why this priority**: This enables idempotency and provides an audit trail, but can be implemented after the core migration execution logic.

**Independent Test**: Can be tested by running the same migration twice and verifying the second run skips execution, then checking the migration history table contains the correct record.

**Acceptance Scenarios**:

1. **Given** a migration completes successfully, **When** the system updates the migration history, **Then** a record is created with the migration timestamp as the only attribute
2. **Given** a migration exists in the history, **When** the migration script runs again, **Then** the system skips that migration
3. **Given** multiple environments (dev, staging, prod) identified by NODE_ENV, **When** migrations run in each environment, **Then** each environment maintains its own independent migration history
4. **Given** a developer wants to check migration status, **When** they query the migration history table, **Then** they can see which migrations have been executed (by presence of timestamp records)

---

### Edge Cases

- **Migration exceeds Lambda timeout (15 minutes)**: Migrations must be designed to complete within 15 minutes. Large data modifications must be split into multiple sequential migration files, each processing a subset of data.
- **Partial failures**: If a migration encounters an error during execution, it fails immediately and stops processing. The migration is NOT marked as completed and will be re-executed on the next migration run. Developers are responsible for writing idempotent migrations to ensure safe retry behavior.
- **Concurrent deployments**: Prevented by lock record in migration history table (see FR-013).
- **Stale lock from Lambda crash/timeout**: If Lambda crashes or times out before deleting the lock record (PK="LOCK"), all future migration runs will fail. Developer must manually delete the lock record from the migration history table to unblock migrations.
- **Migration dependencies**: Handled implicitly by chronological execution order (FR-008). Dependent migrations must have later timestamps than their dependencies.
- **Rerunning completed migrations**: Developer manually deletes the migration record from the history table in the target environment, then reruns the migration runner. The migration will execute as if it had never run.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST document the naming convention for migration files (YYYYMMDDHHMMSS-description.ts format); developers create files manually following this convention
- **FR-002**: System MUST execute migrations locally via `npm run migrate` command; local execution MUST reuse the existing local DynamoDB setup (Docker Compose/DynamoDB Local) that the backend uses for development; connection configuration MUST be consistent with backend's local development environment; System MUST extract core migration execution logic into a shared runner module (`backend/src/migrations/runner.ts`) that both the npm script and Lambda handler invoke with a DynamoDB client
- **FR-003**: CDK MUST define a Lambda function for migration execution; System MUST execute migrations on production environment via this Lambda function; backend's `npm run build` MUST compile the migration Lambda (including all migration files from backend/src/migrations/); backend-cdk MUST deploy the compiled bundle following the same pattern as existing Lambda functions
- **FR-004**: System MUST track migration execution history in a DynamoDB table
- **FR-005**: System MUST be idempotent - running migrations multiple times MUST NOT execute the same migration twice
- **FR-006**: System MUST deploy successfully when no new migrations exist (empty deployment safe)
- **FR-007**: Each migration file MUST export an async function named `up` that receives DynamoDB client as its only parameter: `export async function up(dynamoDbClient) { ... }`
- **FR-008**: System MUST execute migrations in chronological order based on migration file timestamps
- **FR-009**: Migrations MUST only modify data, not database schema (schema changes handled by CDK)
- **FR-010**: The <root>/deploy.sh script MUST invoke the migration Lambda function synchronously (RequestResponse invocation type) at the very end after all CDK deployments (backend, frontend) complete and wait for completion; deployment MUST halt if Lambda returns an error or fails
- **FR-011**: System MUST distinguish between executed and pending migrations in each environment using NODE_ENV to identify the current environment
- **FR-012**: Migration files MUST be stored in `backend/src/migrations/` directory and version-controlled; System MUST maintain a `backend/src/migrations/index.ts` file that explicitly imports and exports all migration modules; developers MUST manually add new migrations to this index file when creating them
- **FR-013**: System MUST prevent concurrent execution of migrations by creating a lock record (PK="LOCK") with conditional PutItem (condition: attribute_not_exists) before running migrations; delete lock after completion; abort if lock creation fails
- **FR-014**: Each migration MUST complete within 15 minutes (Lambda timeout limit); migrations requiring longer execution MUST be split into multiple sequential migrations
- **FR-015**: System MUST fail immediately when a migration encounters an error, stop execution, and NOT mark the migration as completed
- **FR-016**: System MUST retry failed migrations on subsequent runs; developers MUST write idempotent migrations to ensure safe retry behavior
- **FR-017**: Migration execution MUST log progress using console.log statements; Lambda automatically writes logs to CloudWatch Logs for monitoring
- **FR-018**: Each environment MUST have its own migration history DynamoDB table; backend-cdk MUST define the table alongside other DynamoDB tables and deploy it with the standard CDK stack; table name MUST be passed to the migration runner via environment variable (e.g., MIGRATIONS_TABLE_NAME=Migrations)
- **FR-019**: Migration history table MUST use timestamp as partition key (just the timestamp portion of the migration filename, e.g., "20231203120000"); records contain only the timestamp attribute; existence of a record indicates successful execution
- **FR-020**: If Lambda crashes or times out before deleting the lock record, the lock becomes stale and blocks all future migrations; operators MUST manually delete the lock record (PK="LOCK") to unblock
- **FR-021**: System MUST include 1-2 example migration files in `backend/src/migrations/`: one demonstrating read-only operations (scanning and counting records from Categories table), one demonstrating data update operations on Categories table using an always-false condition to safely show write syntax without modifying data
- **FR-022**: Migrations MUST discover table names by reading environment variables (e.g., process.env.CATEGORIES_TABLE_NAME, process.env.TRANSACTIONS_TABLE_NAME); migration runner MUST ensure all necessary table name environment variables are available

### Key Entities

- **Migration**: A TypeScript file that exports an async `up` function performing data modifications in DynamoDB. Contains a unique identifier (timestamp in filename), descriptive name, and the transformation logic. Each migration is atomic and idempotent where possible.
- **Migration History**: A record tracking which migrations have been executed successfully in each environment. Contains only the migration identifier (timestamp). Existence of a record indicates successful execution. Failed migrations are NOT recorded and will be retried on subsequent runs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can create a new migration file and run it locally in under 5 minutes
- **SC-002**: All pending migrations execute automatically during production deployment without manual intervention
- **SC-003**: Zero duplicate migration executions occur across all environments (100% idempotency)
- **SC-004**: Deployments complete successfully when no new migrations exist (zero false failures)
- **SC-005**: Migration execution completes within Lambda timeout limits (15 minutes) for typical data volumes
- **SC-006**: Failed migrations prevent deployment from completing (100% of failures block deployment)
- **SC-007**: Developers can query migration history and see execution status for any environment

## Clarifications

### Session 2025-12-03

- Q: Concurrent migration execution prevention - How should the system enforce FR-013 (prevent concurrent migrations)? → A: Use DynamoDB transactions to lock the migration history table during entire migration run
- Q: Migration file location - Where should migration files be stored in the codebase? → A: backend/src/migrations/ directory as part of backend source code
- Q: Migration timeout handling - What happens when a migration takes longer than Lambda timeout? → A: Document 15-minute limit as constraint; split large migrations into multiple files
- Q: Partial failure handling - How does the system handle partial failures? → A: Migration fails immediately on error and breaks execution. Failed migration must be re-executed on next run. Developer responsible for idempotency.
- Q: Rerunning completed migrations - How to rerun a previously executed migration to fix a bug? → A: Manually remove migration record from history table, then rerun normally
- Q: Migration file creation method - How should developers create new migration files? → A: Manual file creation with documented naming convention
- Q: Migration file structure - What should the migration file export? → A: Named export `up`: export async function up(dynamoDbClient) { ... }
- Q: Local migration execution command - What npm script should developers use? → A: npm run migrate
- Q: Environment identification - How does the system identify which environment it's running in? → A: NODE_ENV that we already have
- Q: CDK deployment integration - How should CDK trigger migration Lambda during deployment? → A: CDK defines the Lambda function; <root>/deploy.sh invokes the function
- Q: Logging and observability for migrations - How should migrations log execution details for monitoring? → A: Use console.log; Lambda automatically writes to CloudWatch
- Q: Migration history table deployment - How is the migration history table deployed per environment? → A: Each environment has its own table via env var (e.g., MIGRATIONS_TABLE_NAME=Migrations)
- Q: Migration history table primary key structure - What should the primary key structure be? → A: PK = timestamp (just the timestamp portion)
- Q: Concurrent execution lock mechanism - How should FR-013 lock be implemented? → A: Single lock record with conditional PutItem (PK="LOCK", condition: attribute_not_exists)
- Q: Stale lock cleanup strategy - What happens if Lambda crashes/times out before deleting lock? → A: No automatic cleanup; manual intervention required to delete stale locks
- Q: Migration Lambda invocation type - How should deploy.sh invoke the migration Lambda to detect failures? → A: Synchronous invocation (RequestResponse) - deploy.sh waits for Lambda completion
- Q: Example migration demonstrations - What should the 1-2 example migrations demonstrate? → A: One migration counting records (read-only), one migration showing data update pattern with always-false condition (demonstrates write syntax safely)
- Q: Table selection for example migrations - Which existing DynamoDB table(s) should the example migrations query? → A: Categories table (safer for accidental writes)
- Q: Deployment sequence timing - At what point in the deployment sequence should migrations run? → A: At the very end after all deployments complete
- Q: Migration history table schema - What additional attributes should each migration history record contain beyond timestamp PK? → A: Only timestamp (PK) - minimal schema, existence means success
- Q: Table name discovery in migrations - How should migration code discover table names to operate on? → A: Read from environment variables (e.g., process.env.CATEGORIES_TABLE_NAME)
- Q: Migration files delivery to Lambda - How should the Lambda function access the migration files to execute them? → A: backend npm run build compiles migration Lambda; backend-cdk deploys the bundle; follow existing Lambda function pattern
- Q: Local DynamoDB connection configuration - How should `npm run migrate` connect to DynamoDB in local development? → A: Reuse existing local DynamoDB setup (Docker Compose/DynamoDB Local) that backend already uses for development
- Q: Migration file discovery mechanism - How should the migration runner discover which migration files exist to execute? → A: Maintain migrations/index.ts that explicitly imports and exports all migrations; developer adds new migrations to index manually
- Q: Migration history table creation - How should the migration history DynamoDB table be created and deployed? → A: Define via backend-cdk alongside other DynamoDB tables; deploy with standard CDK stack; table name passed via environment variable
- Q: Migration runner shared logic - How should code be shared between the local npm script and the Lambda function? → A: Extract shared runner module (migrations/runner.ts) with core logic; both npm script and Lambda handler import and invoke this shared runner with DynamoDB client

## Assumptions

- Migration files will use timestamp-based naming (e.g., `YYYYMMDDHHMMSS-description.ts`) similar to Rails conventions
- A dedicated DynamoDB table will be used to store migration history
- The Lambda function will have appropriate IAM permissions to access all DynamoDB tables
- Migrations will typically complete within a few minutes (not hours)
- Rollback will be handled manually by creating new "rollback migrations" rather than automatic rollback
- Each migration will be atomic where possible, using DynamoDB transactions or batch operations
- The npm script for local migrations will use the same execution logic as the Lambda function via a shared runner module (`backend/src/migrations/runner.ts`) that contains all core migration logic (load from index, check history, execute in order, update history); both the npm script entry point and Lambda handler import and invoke this runner with a DynamoDB client
- Each environment has its own migration history table (isolation via separate tables, not via partition key)
- The <root>/deploy.sh script will invoke the migration Lambda function (defined by CDK) during the deployment process, before completing deployment
