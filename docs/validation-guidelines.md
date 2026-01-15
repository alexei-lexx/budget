# Validation Guidelines by Layer

This document defines clear rules for what should be validated in each architectural layer of the application.

## Principles

- **Resolver**: Validates that the request is well-formed
- **Service**: Validates that the operation is allowed (business logic)
- **Repository**: Trusts caller, focuses on data access

## Resolver Layer - "Is the request well-formed?"

### MUST Validate

1. **Type safety** - Is it the correct type?
   - String, number, boolean, enum
   - Use Zod schemas

2. **Required vs Optional** - Is the field present when required?
   - Use Zod `.optional()`, `.nullish()`, or required fields

3. **Format validation** - Does it match expected format?
   - UUID format: `z.uuid()`
   - Date format: `z.iso.date()`
   - Email format: `z.email()`
   - Enum values: `z.enum()`

   **Note:** Some formats (dates, emails) may also need validation in the service layer. See "Format Validation: Technical vs Business" section.

### SHOULD Validate (Pragmatic)

4. **Sanitization** - Clean external input
   - Trim whitespace: `.trim()`
   - Normalize case: `.toUpperCase()`, `.toLowerCase()`

5. **Technical range limits** - Prevent abuse
   - Max string length (prevent DoS with huge strings)
   - Number range (prevent integer overflow)

### Example

```typescript
// Resolver imports shared schema when concerns are inseparable
import { nameSchema } from "../services/my-service";

const argsSchema = z.object({
  name: nameSchema, // Reuse service's schema
});

const validated = argsSchema.parse(args);
await service.create(userId, validated.name);
```

**Note:** Resolvers can import schemas from services when transformation and validation are inseparable (outer → inner dependency is valid).

---

## Service Layer - "Is the operation allowed?"

### MUST Validate

1. **Business rules** - Domain-specific constraints
   - Min search length = 2 chars (business decision about "meaningful")
   - Year within ±100 years (business decision about "reasonable")
   - Amount > 0 for transfers (business requirement)

2. **Authorization** - Does user have permission?
   - Account belongs to user
   - Category is accessible
   - Transaction is owned by user

3. **Cross-entity validation** - Do related entities match?
   - Category type matches transaction type (INCOME category for INCOME transaction)
   - Source and destination accounts have same currency
   - Account is active/not archived

4. **Uniqueness constraints** - Domain-level uniqueness
   - Account name must be unique per user
   - Category name must be unique per type and user

5. **State validation** - Can operation be performed?
   - Can only archive active items
   - Can only update non-archived items
   - Transfer must have exactly 2 transactions

6. **Defensive format validation** - For business-critical formats
   - Date format validation (service does date math)
   - Email format validation (service sends emails)
   - URL validation (service fetches URLs)
   - Reason: Service should protect itself if called from multiple entry points

### Example

```typescript
// Service exports schema for reuse
export const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters");

// Service validates defensively
async create(userId: string, name: string) {
  const result = nameSchema.safeParse(name);
  if (!result.success) {
    throw new BusinessError(z.prettifyError(result.error), BusinessErrorCodes.INVALID_PARAMETERS);
  }

  // Use validated/transformed value
  const validated = result.data;

  // Business logic
  return this.repository.create(userId, validated);
}
```

---

## Repository Layer - "Can I execute this query?"

### SHOULD Validate (Minimal)

1. **Database-specific constraints** - Technical DB limits
   - Batch size <= 100 (DynamoDB `TransactWriteItems` limit)
   - Query parameter exists (can't query without `userId`)

2. **Data integrity** - Schema validation for persistence
   - Required fields present (Zod schemas in `repositories/schemas/`)
   - Data types match schema

### MUST NOT Validate

- ❌ Business rules (trust caller)
- ❌ Authorization (trust service)
- ❌ Format validation (trust caller already validated)
- ❌ Uniqueness checks (move to service)
- ❌ Cross-entity validation (move to service)

### Example

```typescript
// Repository - trust caller, minimal validation
async findActiveByDescription(
  userId: string,
  searchText: string,
  limit: number
): Promise<Transaction[]> {
  // Only validate required parameters exist
  if (!userId) {
    throw new TransactionRepositoryError(
      "User ID is required",
      "INVALID_PARAMETERS"
    );
  }

  // Optimization: empty search = no results (not business logic)
  if (!searchText) {
    return [];
  }

  // Trust caller: searchText is already trimmed and validated
  // Execute query without further validation
  const { items } = await paginateQuery(...);
  return items;
}
```

---

## Format Validation: Technical vs Business

Not all format validation is the same. The key question: **Does the service do something with the format beyond storing it?**

### Technical Formats (Resolver Only)

**Characteristics:**
- Used as identifiers or type markers
- No business logic depends on the format
- Service just passes them through to repository
- Single entry point makes duplication unnecessary

**Examples:**
- **UUID**: Just an identifier, service doesn't parse or manipulate it
- **Enum values**: Type safety, service uses them as-is
- **String tokens**: Opaque identifiers

**Validation strategy:**
```typescript
// Resolver validates format
const schema = z.object({
  userId: z.uuid(),
  categoryType: z.enum(["INCOME", "EXPENSE"])
});

// Service trusts format
async createCategory(userId: string, type: string) {
  // Don't re-validate UUID or enum
  // Just use them
  return this.repository.create({ userId, type });
}
```

### Business Formats (Both Layers - Defensive)

**Characteristics:**
- Service performs operations using the format
- Format has business meaning (not just storage)
- Service might be called from multiple entry points
- Service needs to protect itself from malformed data

**Examples:**
- **Date strings**: Service does date arithmetic, comparisons, formatting
- **Email addresses**: Service might send emails, needs valid format
- **Phone numbers**: Service might initiate calls, needs valid format
- **URLs**: Service might fetch content, needs valid format
- **Currency codes**: Service does currency-specific logic

**Validation strategy:**
```typescript
// Resolver validates for fail-fast
const schema = z.object({
  date: z.iso.date(),
  email: z.email()
});

// Service ALSO validates defensively
async createUser(email: string, birthdate: string) {
  // Defensive: validate business-critical formats
  this.validateEmail(email); // might send welcome email
  this.validateDate(birthdate); // will calculate age

  // Now safe to use in business logic
  const age = this.calculateAge(birthdate);
  await this.emailService.sendWelcome(email);
}
```

### Why Duplicate Business Format Validation?

**Scenario: Multiple Entry Points**
```typescript
// GraphQL resolver - validates with Zod
createUser(args: { email: string, date: string }) {
  // Zod validates format
  const validated = schema.parse(args);
  return service.createUser(validated.email, validated.date);
}

// REST endpoint - different validation library
app.post('/users', (req, res) => {
  // Maybe uses different validation, or none
  return service.createUser(req.body.email, req.body.date);
});

// Batch job - CSV import, might have bugs
processCSV(rows) {
  rows.forEach(row => {
    // CSV might have malformed data
    service.createUser(row.email, row.date);
  });
}

// Service protects itself
async createUser(email: string, date: string) {
  // Defensive validation ensures service always works correctly
  // regardless of which entry point called it
  if (!this.isValidEmail(email)) {
    throw new BusinessError("Invalid email format");
  }
  if (!this.isValidDate(date)) {
    throw new BusinessError("Invalid date format");
  }
  // ...
}
```

### Trade-offs

**Approach A: Validate only at resolver**
- ✅ Less code duplication
- ✅ Faster (no double validation)
- ❌ Service fragile to incorrect calls
- ❌ Must duplicate validation if adding REST/CLI

**Approach B: Validate at both layers (defensive)**
- ✅ Service is robust and reusable
- ✅ Protected from programming errors
- ✅ Multiple entry points work safely
- ❌ Small duplication cost
- ❌ Slight performance overhead

**Recommendation:** Use Approach B (defensive) for business formats, especially if:
- Service performs operations using the format
- You might add more entry points later
- Service is critical infrastructure
- Service is used by multiple teams/codebases

---

## Validation Type Reference

| Validation Type | Example | Resolver | Service | Repository |
|----------------|---------|----------|---------|------------|
| **Type checking** | "is string?" | ✅ MUST | ❌ No | ❌ No |
| **Technical format** | "valid UUID?" | ✅ MUST | ❌ No | ❌ No |
| **Business format** | "valid date/email?" | ✅ MUST | ✅ MUST (defensive) | ❌ No |
| **Sanitization** | trim/normalize | ✅ SHOULD | ❌ No | ❌ No |
| **Tech limits** | max string length | ✅ SHOULD | ❌ No | ❌ No |
| **Business rules** | min length = 2 | ❌ No | ✅ MUST | ❌ No |
| **Authorization** | user owns account | ❌ No | ✅ MUST | ❌ No |
| **Cross-entity** | category matches type | ❌ No | ✅ MUST | ❌ No |
| **Uniqueness** | name unique | ❌ No | ✅ MUST | ❌ No |
| **State rules** | can archive? | ❌ No | ✅ MUST | ❌ No |
| **DB constraints** | batch size <= 100 | ❌ No | ❌ No | ✅ SHOULD |

---

## Common Anti-Patterns to Avoid

### ❌ Business Logic in Repository

**Bad:**
```typescript
// Repository
async create(input: CreateAccountInput) {
  // Checking for duplicate names is business logic!
  const existing = await this.findByName(input.name);
  if (existing) {
    throw new Error("Account name already exists");
  }
  // ...
}
```

**Good:**
```typescript
// Service
async create(userId: string, input: CreateAccountInput) {
  // Business logic: check uniqueness
  await this.validateUniqueName(userId, input.name);

  // Delegate to repository
  return this.repository.create(input);
}
```

### ❌ Business Validation in Resolver

**Bad:**
```typescript
// Resolver
if (input.categoryType === "INCOME" && transaction.type === "EXPENSE") {
  throw new GraphQLError("Category type must match transaction type");
}
```

**Good:**
```typescript
// Resolver: only validate format
const schema = z.object({
  categoryId: z.uuid(),
  type: z.enum(["INCOME", "EXPENSE"])
});

// Service: validate business rule
async create(input: CreateTransactionInput) {
  await this.validateCategoryTypeMatches(input.categoryId, input.type);
  // ...
}
```

### ❌ Repository Validating Input Already Validated by Service

**Bad:**
```typescript
// Repository
async findByDescription(userId: string, searchText: string) {
  if (searchText.length < MIN_SEARCH_TEXT_LENGTH) {
    throw new Error("Search text too short"); // Duplicate validation!
  }
  // ...
}
```

**Good:**
```typescript
// Service validates once
if (searchText.length < MIN_SEARCH_TEXT_LENGTH) {
  throw new BusinessError(...);
}

// Repository trusts caller
async findByDescription(userId: string, searchText: string) {
  // No validation - trust service validated it
  // ...
}
```

---

## Inseparable Concerns: When to Combine Validation + Transformation

### The Problem

Some validations **depend on transformations** - you can't validate without transforming first.

**Example:** Minimum length validation after trimming
- Input: `"a  "` (with trailing spaces)
- After trim: `"a"`
- Length check: 1 character (fails min length = 2)

**Question:** Should we separate `.trim()` (resolver) from `.min()` (service)?

**Answer:** No - they must be combined because the validation depends on the transformation.

### Solution: Combine in Service, Share with Resolver

When validation depends on transformation, create a **single schema in the service** and **share it with the resolver**.

```typescript
// Service: Define and export schema
export const textSchema = z.string().trim().min(2);

// Service: Use defensively
async process(userId: string, text: string) {
  const result = textSchema.safeParse(text);
  if (!result.success) {
    throw new BusinessError(z.prettifyError(result.error), ErrorCodes.INVALID);
  }

  const validated = result.data;
  return this.repository.find(userId, validated);
}
```

```typescript
// Resolver: Import and reuse
import { textSchema } from "../services/my-service";

const schema = z.object({ text: textSchema });
const validated = schema.parse(args);
// validated.text is trimmed AND validated
```

### Why This Works

1. **No duplication** - Single source of truth for the validation logic
2. **Consistent** - Resolver and service use identical validation
3. **Type-safe** - Resolver gets the transformed value automatically
4. **Architecturally valid** - Resolver (outer layer) importing from service (inner layer) is acceptable

### When to Combine vs Separate

**Combine transformation + validation when:**
- ✅ Validation logic depends on the transformation (min length after trim)
- ✅ Transformation is required for correctness (normalize before uniqueness check)

**Keep separate when:**
- ❌ Transformation is optional convenience (lowercase for case-insensitive search)
- ❌ Validation is independent of transformation (UUID format + trim are separate concerns)

---

## Error Handling Best Practices

### Use `z.prettifyError()` for Human-Readable Error Reporting

When using Zod's `safeParse()`, use `z.prettifyError()` to format **all validation issues** into a readable string.


**Good (all errors, readable):**
```typescript
const result = schema.safeParse(input);
if (!result.success) {
  throw new BusinessError(z.prettifyError(result.error), code); // ✅ Formatted, all issues
}
```

### Security: Don't Expose User Input in Error Details

Error details are often sent to clients and logged. **Never include user input** in error details.

**Bad:**
```typescript
throw new BusinessError(
  "Input too short",
  ErrorCodes.INVALID,
  {
    userInput: input, // ❌ Exposes sensitive data!
    actualLength: input.length,
  }
);
```

**Good:**
```typescript
throw new BusinessError(
  z.prettifyError(result.error), // Safe - doesn't echo raw input
  ErrorCodes.INVALID,
  // No details - message is sufficient
);
```

**Why:** User input may contain PII, credentials, or sensitive data that shouldn't be logged or returned to clients.

---

## Decision Tree

When adding new validation, ask:

1. **Is it about the type/shape of the input?**
   - → Resolver (Zod schema)

2. **Is it a format validation?**
   - **Technical format** (UUID, enum) → Resolver only
   - **Business format** (date, email) → Both resolver AND service (defensive)
   - Ask: "Does service do something with the format beyond storage?"

3. **Is it a business rule about valid operations?**
   - → Service

4. **Is it a technical database constraint?**
   - → Repository (only if necessary)

5. **Is it sanitization/normalization of external input?**
   - → Resolver (pragmatic choice)

When in doubt: **Put it in the service layer.** Better to have business rules together than scattered.
