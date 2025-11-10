# Quickstart: Implementing Database Record Hydration

**Target Audience**: Backend developers implementing the hydration pattern

**Goal**: Add database record validation to all repositories using the hydration pattern

---

## What You're Building

A pattern where all data read from DynamoDB is **validated at the repository boundary** before being returned to services. This catches data corruption immediately rather than downstream.

**Flow**:
```
DynamoDB Query → Raw Data → Hydration Validation → Typed Entity → Service Layer
```

---

## Implementation Checklist

### Phase 1: Create Zod Schemas

**Files to create in `backend/src/repositories/utils/`**:

- [ ] `Account.schema.ts` - Account validation schema
- [ ] `Category.schema.ts` - Category validation schema
- [ ] `Transaction.schema.ts` - Transaction validation schema
- [ ] `User.schema.ts` - User validation schema

**Reference**: See `contracts/SPECIFICATION.md` for what each schema file should export

### Phase 2: Update Repository Methods

**In each repository file** (`AccountRepository.ts`, `CategoryRepository.ts`, `TransactionRepository.ts`, `UserRepository.ts`):

- [ ] Import schema: `import { accountSchema } from './utils/Account.schema'`
- [ ] Define hydration function in repository (catch ZodError, throw RepositoryError)
- [ ] Find all locations using `as Entity` type assertion
- [ ] Replace `as Entity` with `hydrateEntity(data)` call
- [ ] For arrays: replace `as Entity[]` with `.map(hydrateEntity)`

### Phase 3: Testing & Validation

- [ ] Run existing test suite - should pass without changes
- [ ] Verify TypeScript compilation - no errors on schema/interface mismatches
- [ ] Check repository imports - all compilation successful
- [ ] Smoke test: Fetch a record and verify it validates correctly

---

## Key Implementation Patterns

### Schema Definition Pattern

Each schema file in `backend/src/repositories/utils/` exports:
- A Zod schema object with `satisfies z.ZodType<Entity>` for compile-time safety
- Entity type (imported from models or locally defined)

**Key points**:
- Use `satisfies z.ZodType<Entity>` after object definition
- Import types from `'../../models/Entity'`
- Validation rules must match entity interface exactly
- No hydration function in schema file - that lives in the repository

### Repository Method Pattern

**Step 1: Define hydration function in repository**
```typescript
import { z } from 'zod';
import { accountSchema } from './utils/Account.schema';

function hydrateAccount(data: unknown): Account {
  try {
    return accountSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AccountRepositoryError(
        `Invalid Account record from database: ${error.issues[0].message}`,
        'VALIDATION_FAILED',
        error.issues,
        error
      );
    }
    throw error;
  }
}
```

**Step 2: Use in repository methods**

Before (without hydration):
```typescript
return result.Item as Account;  // Unsafe
```

After (with hydration):
```typescript
return hydrateAccount(result.Item);  // Validated
```

### Query Result Pattern

For methods returning arrays:

**Before**:
```
return (result.Items || []) as Entity[]
```

**After**:
```
return (result.Items || []).map(hydrateEntity)
```

---

## Error Handling

### Validation Errors at Hydration Point

When Zod validation fails, the hydration function catches the error and throws a repository-specific error immediately:

```typescript
if (error instanceof z.ZodError) {
  throw new AccountRepositoryError(
    `Invalid Account record from database: ${error.issues[0].message}`,
    'VALIDATION_FAILED',
    error.issues,  // Zod issues for detailed debugging
    error          // Original error for logging
  );
}
```

**Error context provided**:
- Clear message identifying the entity and field that failed
- Zod issues array with detailed validation info
- Repository error code ('VALIDATION_FAILED') for monitoring

### Service Layer (No Changes)

Services already handle repository errors - no changes needed. Hydration is transparent to service layer. They receive validated entities or catch repository errors as normal.

---

## Validation Rules Reference

Use `data-model.md` as reference for validation rules for each entity:

- **User**: Simple - id, auth0Id, timestamps
- **Account**: Basic fields + currency code validation
- **Category**: Fields + INCOME/EXPENSE enum + optional description
- **Transaction**: Complex - UUIDs, positive amount, enum type, date format, optional foreign keys

---

## Troubleshooting

**TypeScript Error: "does not satisfy the constraint 'ZodType<X>'"**
- Schema and interface fields don't match
- Check both interface and schema have exactly the same fields
- Re-read the interface from models/ and add/remove schema fields to match

**RepositoryError with validation failure**
- Database record has missing/corrupt data
- Error thrown from hydration function with code 'VALIDATION_FAILED'
- Error message shows which field failed and why
- Check DynamoDB directly to verify stored value
- If data is correct, schema validation rule is too strict - adjust in schema file

**Import Errors**
- Verify import paths: `./utils/Entity.schema` for schemas
- Verify Zod import: `import { z } from 'zod'`
- Check TypeScript compilation

**Performance Concerns**
- Zod validation is negligible (~4 microseconds per record)
- DynamoDB queries are 10-50ms
- No optimization needed for normal CRUD operations

---

## Success Criteria

When implementation is complete:

✅ All four repositories have Zod schema files in utils/
✅ All four repositories define hydration functions
✅ All repository read methods use hydration instead of `as Entity`
✅ TypeScript compilation passes without errors
✅ Zod validation errors are caught and wrapped in repository errors
✅ Existing test suite passes without changes
✅ Database records are validated at repository boundary
✅ Service layer receives pre-validated, typed entities

---

## References

- `contracts/SPECIFICATION.md` - What each file should export
- `data-model.md` - Entity schemas and validation rules
- `research.md` - Pattern decisions and rationale
- `plan.md` - Overall feature plan and structure
