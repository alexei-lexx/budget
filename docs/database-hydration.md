# Database Record Hydration Pattern

## Overview

Hydration is the process of validating and transforming raw database records into strongly-typed objects at the database boundary. This ensures data integrity and provides early error detection.

## Problem Statement

When reading records from DynamoDB, raw data lacks validation. Using TypeScript type assertions without validation creates risk:

```typescript
// ❌ Unsafe - no validation
const account = result.Item as Account;
```

**Risks:**
- Missing required fields go undetected
- Type errors don't surface until service layer execution, obscuring their actual source
- Data corruption from manual DynamoDB modifications isn't caught
- Errors appear far from the actual data source

**Concrete Example:**

Suppose DynamoDB is manually edited and `initialBalance` is removed:
```
Raw DB record: { id: "123", userId: "user1", name: "Checking" }
                 (missing initialBalance)
```

**❌ Without Hydration (type assertion only):**
```typescript
// Repository layer - no validation
const account = result.Item as Account;  // Returns incomplete object, no error

// Service layer (much later)
const newBalance = account.initialBalance + 100;  // undefined + 100 = NaN
```

Error appears as:
```
Error: Invalid balance calculation in updateAccount() service
Stack trace: accountService.ts:47
```

You debug in the **service layer** looking for calculation logic bugs, but the actual problem is **corrupted database data**. The error's source is obscured.

**✅ With Hydration (Zod validation):**
```typescript
// Repository layer - validation catches the problem immediately
const account = hydrateAccount(result.Item);
// Throws: "initialBalance" is required
```

Error appears as:
```
Error: Validation failed in AccountRepository.findActiveById()
Problem: "initialBalance" field is required but missing
Stack trace: accountRepository.ts:142
```

You immediately know: "The database returned incomplete data" and can look at what happened to that record in DynamoDB.

**Why this matters:** Without hydration, the error's **symptom** (NaN in service layer) is far from its **source** (bad database read), making debugging harder and slower.

## Solution: Zod-Based Hydration

Use Zod schemas to validate every record read from the database at the repository boundary.

### Design Principles

1. **TypeScript interface is the source of truth**
   - Account, Category, Transaction interfaces define the data shape
   - Zod schemas exist only to validate against these interfaces

2. **Zod schemas mirror interfaces**
   - Use `satisfies z.ZodType<Account>` for compile-time type safety
   - Ensures schema always matches TypeScript interface

3. **Generic hydration utility**
   - Shared across all repositories
   - Avoids code duplication
   - Consistent validation pattern

4. **Validation at repository boundary**
   - Catches data issues immediately
   - Errors are clear and traceable
   - Service layer receives pre-validated data

## How It Works

### Core Principle

Create a generic hydration utility that validates data using Zod schemas that mirror TypeScript interfaces:

```typescript
// Generic utility - reusable across all repositories
export function createHydrator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => schema.parse(data);
}
```

Define one Zod schema per entity that mirrors its TypeScript interface:

```typescript
// In AccountRepository
const accountSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  initialBalance: z.number(),
  // ... other fields matching Account interface
}) satisfies z.ZodType<Account>;

const hydrateAccount = createHydrator(accountSchema);
```

The `satisfies z.ZodType<Account>` ensures the schema shape matches the interface at compile-time.

Use the hydrator in repository methods instead of type assertions:

```typescript
// ❌ Before: No validation
const account = result.Item as Account;

// ✅ After: Validated
const account = hydrateAccount(result.Item);
```

### Key Concept: Compile-Time Safety

The `satisfies z.ZodType<Account>` clause ensures at compile-time that the Zod schema shape matches the Account interface. If someone later changes the Account interface but forgets to update the schema, TypeScript will catch it immediately.

## Benefits

| Benefit | Description |
|---------|-------------|
| **Data Integrity** | Every record validated at read time catches corruption immediately |
| **Fail Fast** | Invalid data detected at repository boundary, not downstream |
| **Type Safety** | TypeScript interface + Zod schema + runtime validation aligned |
| **Consistency** | Same pattern across Account, Category, Transaction repositories |
| **DRY** | Generic utility avoids repeating hydration logic |
| **Error Messages** | Zod provides clear, field-level validation errors |
| **Debuggability** | Issues traced to their source (database), not buried in service layer |

## Performance Consideration

Hydration adds minimal CPU overhead (microseconds per record) which is negligible compared to:
- Network latency (milliseconds)
- Database query time (milliseconds)
- Zod validation is highly optimized

The safety benefit far outweighs the minimal performance cost.

## Related Patterns

- **Repository Pattern** (docs/tech-spec.md) - Database abstraction layer where hydration occurs
- **Service Layer** (docs/tech-spec.md) - Business logic layer receives pre-validated data from repositories
