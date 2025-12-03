# Migration Framework Contracts

This directory contains TypeScript interface definitions that specify the contracts for the migration framework.

## Files

### [migration-interface.ts](migration-interface.ts)

Defines the contract that all migration files must implement:
- `MigrationFunction`: The signature of the `up` function each migration exports
- `MigrationModule`: The structure of a migration module
- `Migration`: Metadata extracted from migration files
- `MigrationEnvironment`: Required environment variables
- Example migration file structure

**Key Contract**: Every migration file must export:
```typescript
export async function up(client: DynamoDBClient): Promise<void>
```

### [runner-interface.ts](runner-interface.ts)

Defines the contract for the migration runner that orchestrates execution:
- `MigrationRunner`: Main runner interface
- `RunnerConfig`: Configuration for runner execution
- `RunnerStatistics`: Statistics returned after running migrations
- `LockOperations`: Lock acquisition and release operations
- `HistoryOperations`: Migration history tracking operations
- `LoaderOperations`: Migration file loading operations
- Usage examples for npm script and Lambda handler

**Key Contract**: The runner module must export:
```typescript
export async function runMigrations(client: DynamoDBClient): Promise<RunnerStatistics>
```

## Usage

These contracts serve as:
1. **Design documentation**: Clear specification of interfaces before implementation
2. **Type definitions**: Can be imported in implementation files for type safety
3. **Testing reference**: Define expected behavior for test cases
4. **Developer guide**: Examples and patterns for creating migrations

## Implementation Notes

- Migration files are discovered via explicit imports in `backend/src/migrations/index.ts`
- Migrations execute in chronological order based on timestamp in filename
- Runner enforces single-execution guarantee via lock record in DynamoDB
- Each migration must be idempotent (safe to retry after failure)
- Migration history is append-only (no deletions or modifications)

## Examples

See inline code examples in each contract file for:
- Migration file structure
- Runner usage in npm script
- Runner usage in Lambda handler
- Lock acquisition pattern
- History tracking pattern
