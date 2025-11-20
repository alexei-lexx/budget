# Technical Stack Specification

## 3. Backend

### Pagination Architecture

**Relay-Compatible Cursor Pagination:**
The application implements Relay Connection specification using database-native pagination mechanisms while maintaining stable navigation.

**GraphQL Schema Pattern:**
```typescript
input PaginationInput {
  first: Int
  after: String
  last: Int
  before: String
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type ItemEdge {
  node: Item!
  cursor: String!
}

type ItemConnection {
  edges: [ItemEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
```

**Implementation Strategy:**
- **Backend:** Uses database's native pagination keys as cursor foundation
- **Cursor Design:** Encodes database's pagination tokens (contains relevant key fields)
- **Sort Limitation:** Fixed sort order by creation date (most recent first) for efficient queries
- **Stable Navigation:** Cursors remain valid even when new data is inserted

**Database Integration:**
- **Database GSI:** Efficient chronological queries using sort keys
- **Native Pagination:** Leverages database's built-in pagination mechanisms
- **Cursor Format:** Base64-encoded JSON containing composite keys (partition key + sort key + index keys) that represent the last item position. Cursors are opaque to clients and enable resuming pagination from any point without offset calculations.

**UI Design Pattern:**
```
Item List (showing latest first):
- Item A
- Item B
- Item C
...
[Load More]
```

**Implementation Benefits:**
- **✅ Stable Pagination:** Results don't shift when new items are added
- **✅ Performance:** Efficient database queries using indexed sort keys
- **✅ Standards Compliance:** Relay-compatible for GraphQL tooling
- **✅ Simple UX:** Intuitive "Load More" pattern familiar to users
- **✅ Cumulative View:** Users see all loaded items in one continuous list
- **❌ Fixed Sort Order:** Users cannot change sort criteria (chronological only)

**Benefits:**
- **Consistency:** Same cursor always returns same results
- **Performance:** Leverages database-native pagination efficiently
- **Standards Compliance:** Compatible with Relay and GraphQL ecosystem
- **Simplicity:** Straightforward Previous/Next navigation pattern

### Runtime Environment
- **Primary:** AWS Lambda for serverless execution
- **Portable:** Can run on any Node.js hosting platform (Docker, VPS, etc.)

### Dependencies
Apollo Server, GraphQL, esbuild, JWT libraries, AWS SDK, TypeScript

---

## 4. Database

### Technology
- **AWS DynamoDB** - NoSQL document database
- **Scaling** - On-demand billing with automatic scaling

### Data Architecture
- All user data partitioned by internal user ID
- Point-in-time recovery enabled for backups

---

## 6. Infrastructure

### AWS Services
- **S3** - Static website hosting for Vue.js application
- **CloudFront** - CDN for global content delivery
- **Lambda** - Serverless compute for GraphQL API
- **API Gateway** - HTTP API endpoint with rate limiting
- **DynamoDB** - NoSQL database with automatic scaling
- **IAM** - Least-privilege access roles

### CDK Architecture
- **Language** - TypeScript for type-safe infrastructure
- **Stacks** - Separate deployments for frontend and backend
- **Environments** - Support for dev/prod configurations

### Deployment
- **Method** - Manual deployment via shell script
- **Sequence** - Backend infrastructure → Backend code → Frontend infrastructure → Frontend assets
- **Rollback** - Redeploy previous Git commit via deployment script

### Security
- HTTPS enforcement and rate limiting
- Least-privilege IAM policies

---

## 7. Development Environment

### Local Development
- **Frontend** - Vite dev server with hot reload
- **Backend** - Apollo server with GraphQL playground
- **Database** - DynamoDB Local for offline development
- **Authentication** - Auth0 development tenant

### Code Quality
- **Linting** - ESLint with TypeScript
- **Formatting** - Prettier
- **Testing** - Jest unit tests
- **TypeScript Best Practices**
  - Avoid unnecessary type checks (typeof, non-null, non-undefined) when the provided type is explicit and doesn't require such checks

### Environment Configuration
- Environment configuration is managed by .env files
- Each package has .env.example that can be used in production and development as a reference
- Environment-specific configs for Auth0, AWS, and API endpoints
- Separate AWS profiles for dev/prod environments

---

## 8. Technical Rationale

### Key Principles

**Simplicity:** Manual deployment, no complex CI/CD, straightforward troubleshooting
