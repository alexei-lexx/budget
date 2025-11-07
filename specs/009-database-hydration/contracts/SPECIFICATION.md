# Hydration Pattern Specification

**Location**: `backend/src/repositories/utils/`

## Files to Implement

### 1. hydrator.ts (Not Needed - Remove This File)

**Decision**: Based on research findings, hydrator utility is **NOT needed**.

**Reason**: Each hydrator function needs to throw its specific repository error class (AccountRepositoryError, CategoryRepositoryError, etc.), which makes a "generic" hydrator factory impossible without adding unnecessary intermediary errors.

**Simpler Approach**:
- Define hydration inline in each repository file
- Hydration function catches ZodError and throws repository-specific error directly
- No separate utility file required

**Hydration Pattern** (implement in each repository):
```typescript
// In AccountRepository.ts
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

**Benefits**:
- No intermediate HydrationError wrapper
- Direct error wrapping at repository boundary
- Simple, no factory pattern overhead
- Each repository owns its hydration logic

---

### 2. Account.schema.ts

**Location**: `backend/src/repositories/utils/Account.schema.ts`

**Exports**:
- `accountSchema` - Zod schema object
  - Validates: id (uuid), userId (uuid), name (string, 1-255 chars), initialBalance (number), currency (3-char code), isArchived (boolean), createdAt (string), updatedAt (string)
  - Must use `satisfies z.ZodType<Account>` for compile-time type checking
  - Import types: `import type { Account } from '../../models/Account'`

- `Account` type export (re-export from models or define locally)

**Usage** (in AccountRepository.ts):
```typescript
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

**Validation Rules** (from data-model.md):
- id: UUID format, required
- userId: UUID format, required (partition key)
- name: Non-empty string, max 255 chars
- initialBalance: Any number (positive/negative/zero)
- currency: 3-character uppercase code (e.g., "USD")
- isArchived: Boolean (never null)
- createdAt: ISO 8601 datetime string
- updatedAt: ISO 8601 datetime string

---

### 3. Category.schema.ts

**Location**: `backend/src/repositories/utils/Category.schema.ts`

**Exports**:
- `categorySchema` - Zod schema
  - Validates: id (uuid), userId (uuid), name (string, 1-255), type ('INCOME' | 'EXPENSE'), description (optional string, max 1000), isArchived (boolean), createdAt (string), updatedAt (string)
  - Must use `satisfies z.ZodType<Category>`

- `Category` and `CategoryType` type exports

**Usage** (in CategoryRepository.ts):
Define `hydrateCategory` function following the same pattern as Account (catch ZodError, throw CategoryRepositoryError)

**Validation Rules** (from data-model.md):
- id: UUID, required
- userId: UUID, required
- name: Non-empty string, max 255 chars
- type: Enum 'INCOME' or 'EXPENSE', required
- description: Optional string, max 1000 chars
- isArchived: Boolean (never null)
- createdAt: ISO 8601 datetime string
- updatedAt: ISO 8601 datetime string

---

### 4. Transaction.schema.ts

**Location**: `backend/src/repositories/utils/Transaction.schema.ts`

**Exports**:
- `transactionSchema` - Zod schema
  - Validates: id (uuid), userId (uuid), accountId (uuid), amount (positive number), type (enum), currency (3-char code), date (YYYY-MM-DD format), description (optional), categoryId (optional uuid), transferId (optional uuid), isArchived (boolean), createdAt (string), updatedAt (string)
  - Must use `satisfies z.ZodType<Transaction>`

- `Transaction` and `TransactionType` type exports

**Usage** (in TransactionRepository.ts):
Define `hydrateTransaction` function following the same pattern as Account (catch ZodError, throw TransactionRepositoryError)

**Validation Rules** (from data-model.md):
- id: UUID, required
- userId: UUID, required
- accountId: UUID, required (FK)
- amount: Positive number, required
- type: Enum 'INCOME' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT', required
- currency: 3-character uppercase code, required
- date: YYYY-MM-DD format, required
- description: Optional string, max 500 chars
- categoryId: Optional UUID
- transferId: Optional UUID
- isArchived: Boolean (never null)
- createdAt: ISO 8601 datetime string
- updatedAt: ISO 8601 datetime string

---

### 5. User.schema.ts

**Location**: `backend/src/repositories/utils/User.schema.ts`

**Exports**:
- `userSchema` - Zod schema
  - Validates: id (uuid), auth0Id (non-empty string), createdAt (string), updatedAt (string)
  - Must use `satisfies z.ZodType<User>`

- `User` type export

**Usage** (in UserRepository.ts):
Define `hydrateUser` function following the same pattern as Account (catch ZodError, throw UserRepositoryError)

**Validation Rules** (from data-model.md):
- id: UUID, required
- auth0Id: Non-empty string, required (unique at DB level, not validated here)
- createdAt: ISO 8601 datetime string
- updatedAt: ISO 8601 datetime string

---

## Integration Points

### In Each Repository (AccountRepository, CategoryRepository, TransactionRepository, UserRepository)

**Step 1: Import the schema**:
```typescript
import { accountSchema } from './utils/Account.schema';
import type { Account } from '../models/Account';
```

**Step 2: Define hydration function in the repository**:
```typescript
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

**Step 3: Use in repository methods**:
Replace all `as Entity` type assertions with hydration:
```typescript
// Before
return result.Item as Account;

// After
return hydrateAccount(result.Item);
```

For query results (arrays):
```typescript
// Before
return (result.Items || []) as Account[];

// After
return (result.Items || []).map(hydrateAccount);
```

---

## Design Principles

1. **Schemas mirror interfaces**: Use `satisfies z.ZodType<T>` for compile-time safety
2. **Fail-fast validation**: Use `parse()` not `safeParse()` - invalid DB data is exceptional
3. **Direct error wrapping**: Hydration catches ZodError and throws repository-specific error directly, no intermediary
4. **Per-repository hydration**: Each repository owns its hydration function, catches errors, and throws its own error class
5. **ZodError preservation**: Original Zod issues passed to repository error for detailed debugging
6. **Database schema evolution**: Default `.strip()` behavior for forward compatibility

---

## Summary

This specification is simple and minimal:
- **What to build**: 4 Zod schema files (Account, Category, Transaction, User)
- **No utility files needed**: Hydration logic lives in each repository
- **Error handling**: Repository catches and wraps Zod errors directly
- **Type safety**: `satisfies z.ZodType<Entity>` ensures schema/interface alignment

Implementation follows standard patterns established in the codebase.
