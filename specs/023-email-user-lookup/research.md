# Research: Email-Based User Lookup Migration

**Feature**: Migrate User Lookup from Auth0 ID to Email
**Branch**: 023-email-user-lookup
**Date**: 2025-12-29

This document consolidates research findings for all open questions identified in the Technical Context.

---

## 1. Email Normalization Best Practices

### Decision

Store normalized lowercase emails in the database and perform all normalization at the application layer before database operations.

**Specific approach:**
- Trim whitespace (leading/trailing) before any processing
- Convert to lowercase for storage and all lookups
- Apply NFC Unicode normalization for internationalized email addresses
- Validate email format according to practical RFC 5322 standards
- Use normalized email as the unique index key in DynamoDB

### Rationale

**RFC Standards vs. Practical Reality:**
- RFC 5321/5322 technically define the local-part (before @) as case-sensitive
- However, RFC 5321 explicitly warns that hosts expecting mail should avoid case-sensitive mailboxes
- All major providers (Gmail, Outlook, Yahoo) ignore case completely
- The domain part follows DNS rules and is always case-insensitive

**Security Considerations:**
- **Unicode attacks**: Inconsistent normalization creates critical authentication vulnerabilities
- **Duplicate account prevention**: Without normalization, `User@email.com` and `user@example.com` create separate accounts
- **User Experience**: Users frequently type emails with different capitalization

**DynamoDB Specifics:**
- DynamoDB is case-sensitive with no built-in case-insensitive search
- Normalization must happen at application layer, not database layer
- Creating a normalized field enables efficient indexed queries

### Implementation Details

**Email Normalization Function:**
```typescript
function normalizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email must be a non-empty string');
  }

  // 1. Trim leading/trailing whitespace
  let normalized = email.trim();

  // 2. Convert to lowercase (both local-part and domain)
  normalized = normalized.toLowerCase();

  // 3. Apply Unicode NFC normalization
  normalized = normalized.normalize('NFC');

  return normalized;
}
```

**Email Validation:**
- Use `validator` npm package for RFC 5322 compliance
- Maximum email length: 254 characters (RFC 5321)
- Maximum local part length: 64 characters
- Validate AFTER normalization

**Repository Integration:**
- Normalize in `create()` method (already done: `email: input.email.toLowerCase()`)
- Normalize in new `findByEmail()` method before query
- Normalize in `ensureUser()` before lookup

### Alternatives Considered

1. **Case-insensitive queries at database level**: DynamoDB doesn't support this natively; would require expensive table scans
2. **Separate normalized field**: Adds data duplication; current spec already stores normalized email
3. **Provider-specific normalization**: Gmail dot/plus removal would break legitimate use cases
4. **No Unicode normalization**: Leaves system vulnerable to Unicode normalization attacks

---

## 2. DynamoDB GSI Performance and Cost

### Decision

**Recommended GSI Configuration:**
- **Index Name**: `EmailIndex`
- **Partition Key**: `email` (String)
- **Sort Key**: None
- **Projection Type**: `ALL` (project all attributes for this use case)
- **Billing Mode**: `PAY_PER_REQUEST` (inherits from base table)

### Rationale

**ALL Projection vs KEYS_ONLY:**
- User lookups are on critical authentication path for every API request
- After email lookup, we always need full user object
- `ALL` eliminates second query to base table, reducing latency by 50%
- Trade-off: Higher storage cost (~100 bytes/user vs ~50 bytes) is negligible

**No Sort Key:**
- Email lookups are simple existence checks or single-item retrievals
- Composite key would add unnecessary complexity

**PAY_PER_REQUEST Mode:**
- GSIs automatically inherit billing mode from base table
- Cannot mix billing modes

### Performance Characteristics

**Query Latency:**
- GSI queries: 1-5ms under normal conditions (single-digit milliseconds)
- Primary key lookups: Comparable performance
- Eventually consistent only (GSI updates propagate within a fraction of a second)

**Capacity Efficiency:**
- Eventually consistent reads from GSI consume 0.5 RCU per 4 KB
- Each GSI query can retrieve up to 8 KB per RCU

**Write Considerations:**
- Every write to base table also writes to GSI
- Writes consume capacity from both base table AND GSI
- With PAY_PER_REQUEST, throttling unlikely unless exceeding account limits

### Cost Implications

**On-Demand Pricing (2025, US East):**
- Read Request Units: $0.25 per million RRUs
- Write Request Units: $1.25 per million WRUs
- Storage: $0.25 per GB-month

**GSI-Specific Costs:**
1. **Storage**: ~100 bytes/user with ALL projection
   - 1M users: ~100 MB = $0.025/month
2. **Writes**: Every user creation/email update writes to both base + GSI
   - 10K new users/month = 20K WRUs = $0.025/month
3. **Reads**: Email lookups query the GSI
   - 100K logins/month = 100K RRUs = $0.025/month

**Estimated Total**: ~$0.075/month for GSI overhead (minimal)

### Alternatives Considered

1. **Local Secondary Index (LSI)**: Requires same partition key as base table; can't lookup by email if userId is partition key
2. **Scan with filter**: Reads entire table; extremely expensive at scale
3. **Separate email→userId mapping table**: Requires two sequential reads; higher latency
4. **ElasticSearch/OpenSearch**: Massive operational overhead for simple exact-match lookups

---

## 3. Testing Strategy for Case-Insensitive Email Lookups

### Decision

Adopt repository layer integration testing with real DynamoDB Local, following existing codebase pattern.

**Test coverage areas:**
1. Basic functionality tests - Standard email lookup scenarios
2. Case-insensitivity tests - Uppercase, lowercase, mixed-case variations
3. Normalization tests - Whitespace trimming, email conversion
4. Edge case tests - Unicode emails, maximum length, malformed inputs
5. Data integrity tests - Duplicate detection, hydration validation
6. Error scenario tests - Missing emails, null values, invalid formats

### Rationale

**Why Real DynamoDB Local:**
- Constitution mandates: "In repository tests, use real database connection to validate data access layer"
- Existing infrastructure already configured (Docker Compose + .env.test)
- Higher fidelity than mocks
- All existing repository tests use this approach

**Why Comprehensive Coverage:**
- Critical authentication path (every API request)
- Data integrity foundation (prevents duplicate accounts per FR-003, FR-004)
- Performance requirements (< 50ms per SC-003)
- Zero-downtime deployment with no rollback plan

**Why Co-located Tests:**
- Constitution: "Test files MUST be co-located next to source files"
- Follow pattern: `user-repository.test.ts` in same directory as `user-repository.ts`

### Test Scenarios

**Key test categories (32 scenarios total):**

1. **Basic Functionality** (TC-001 to TC-003)
   - Exact email match, return null when not found, find correct user among multiple

2. **Case-Insensitivity** (TC-004 to TC-008)
   - Uppercase email, mixed-case, create normalizes to lowercase, mixed-case local/domain parts

3. **Normalization & Whitespace** (TC-009 to TC-012)
   - Leading/trailing/surrounding whitespace, create with whitespace normalizes

4. **Edge Cases - Email Formats** (TC-013 to TC-017)
   - Plus addressing, subdomains, numbers/hyphens, maximum length (254 chars), dots in local part

5. **Error & Validation** (TC-018 to TC-022)
   - Empty string, whitespace only, invalid format, null/undefined, missing email

6. **Data Integrity** (TC-023 to TC-026)
   - Prevent duplicate emails, verify hydration, detect corruption, refetch created user

7. **Integration with ensureUser** (TC-027 to TC-030)
   - Find existing user, create if not found, case-insensitive, normalize before lookup

8. **Performance** (TC-031 to TC-032)
   - Parallel lookups, GSI query performance validation

### Implementation Approach

**Test File**: `/home/alex/workspace/budget2/backend/src/repositories/user-repository.test.ts`

**Pattern**: Follow existing repository test structure with `beforeAll`, `beforeEach` (truncate table), and nested `describe` blocks

**Test Data**: Use existing faker-based factories from `__tests__/utils/factories.ts`

**Environment**:
- DynamoDB Local via Docker Compose (port 8000)
- Environment: `.env.test` with `DYNAMODB_ENDPOINT=http://localhost:8000`
- Table setup: `npm run test:db:setup`

**Running Tests:**
```bash
npm run test:db:setup  # Start DynamoDB and create tables
npm test user-repository.test.ts
```

### Alternatives Considered

1. **Mocked DynamoDB Client**: Constitution violation; lower fidelity; inconsistent with existing tests
2. **jest-dynamodb preset**: Existing Docker Compose infrastructure works; adds unnecessary complexity
3. **Separate integration test suite**: Constitution compliance requires repository tests to be integration tests
4. **Test against AWS DynamoDB**: Cost, latency, environment dependency issues

---

## 4. Error Handling Patterns for Email-Based Authentication

### Decision

Implement a defense-in-depth error handling strategy that:
1. Uses generic client-facing error messages to prevent user enumeration
2. Provides specific error codes for programmatic handling
3. Logs detailed error information server-side for debugging
4. Distinguishes between authentication failures (missing/invalid token) and authorization failures (valid token, missing user)

### Rationale

**Security First:**
- OWASP guidelines warn against user enumeration vulnerabilities
- Generic error messages prevent attackers from determining valid user accounts
- Consistent error timing prevents timing attacks

**GraphQL Best Practices:**
- Apollo Server separates HTTP transport (200 OK) from GraphQL errors
- Errors communicated via `errors` array with structured `extensions`

**Consistency with Existing Patterns:**
- Project already uses `BusinessError` for service-layer errors
- GraphQLError with custom extensions for resolver-layer errors
- Fail-fast approach with `requireAuthentication()`

### Error Scenarios and Responses

| Scenario | Error Code | User Message | Internal Log |
|----------|------------|--------------|--------------|
| Missing Authorization header | UNAUTHENTICATED | "Authentication required" | "No auth header provided" |
| Malformed auth header | UNAUTHENTICATED | "Authentication required" | "Invalid auth header format" |
| Invalid/Expired JWT | UNAUTHENTICATED | "Authentication required" | "JWT verification failed: [reason]" |
| Missing email claim | AUTHENTICATION_ERROR | "Failed to authenticate user" | "Missing email claim for auth0UserId: [id]" |
| Invalid email format | AUTHENTICATION_ERROR | "Failed to authenticate user" | "Invalid email format: [email]" |
| User not found | USER_NOT_FOUND or auto-create | "User not found" or success | "No user found for email: [email]" |
| Multiple users same email | INTERNAL_SERVER_ERROR | "An error occurred" | "CRITICAL: Multiple users for email: [email]" |
| Database query failure | INTERNAL_SERVER_ERROR | "An error occurred" | "Database error in user lookup" |

### Security Considerations

1. **Prevent User Enumeration**: Use generic error messages for authentication failures
2. **Consistent Error Timing**: Ensure all paths take similar time
3. **Log Sanitization**: Never log JWT tokens, passwords; always log Auth0 user IDs, timestamps
4. **Error Message Separation**: Maintain client-facing (generic) vs server-side (detailed) messages
5. **HTTP Status Strategy**: Always return 200 for executed GraphQL operations per convention

### Implementation Recommendations

1. **Auto-Create Users on First Access** (Recommended)
   - Eliminates "user not found" errors
   - Prevents user enumeration
   - Matches existing `ensureUser` mutation pattern
   - Provides seamless UX

2. **Consolidate Error Codes**
   - Create centralized error codes file
   - Avoid overly granular codes that leak implementation details

3. **Structured Logging**
   - Implement consistent log format with auth0UserId, email, error code, timestamp
   - Track authentication failure rate, auto-created users, critical data integrity issues

4. **Documentation**
   - Document error codes in GraphQL schema comments

### Alternatives Considered

1. **Specific error codes for each scenario**: Enables user enumeration; violates OWASP guidelines
2. **Silent authentication failures**: Inconsistent handling; doesn't match fail-fast pattern
3. **Custom error class hierarchy**: More maintenance; doesn't solve enumeration issue
4. **Auto-create users** (RECOMMENDED): Already implemented for `ensureUser`; apply more broadly

---

## Summary & Next Steps

All research questions have been resolved with clear decisions and implementation guidance:

✅ **Email Normalization**: Trim → Lowercase → NFC at application layer; use `validator` npm package

✅ **DynamoDB GSI**: Add `EmailIndex` with `ALL` projection; minimal cost (~$0.075/month); excellent performance (<5ms)

✅ **Testing Strategy**: 32 test scenarios with real DynamoDB Local; follow existing repository test patterns

✅ **Error Handling**: Generic client messages + detailed server logs; consider auto-create pattern to eliminate "user not found"

**Ready to proceed to Phase 1: Design & Contracts**
