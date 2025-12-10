# Backend

GraphQL API server for the Personal Finance Tracker application.

## Development Setup

### Prerequisites

- Node.js 22+
- Docker and Docker Compose
- npm

### Getting Started

1. Install dependencies:

```bash
npm install
```

2. Configure Auth0:

Copy the environment template

```bash
cp .env.example .env.development
```

Edit `.env.development` with your Auth0 values

```env
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=your-api-identifier
```

3. Set up development database:

Start DynamoDB Local and create tables

```bash
npm run db:setup
```

4. Start the development server:

Start server on http://localhost:4000

```bash
npm run dev
```

## Database (Development & Test)

Uses DynamoDB Local running in Docker with a named volume for data persistence.

### Database access:

- **DynamoDB Local**: http://localhost:8000
- **Admin UI**: http://localhost:8001

### Database Scripts

**Container Management:**

- `npm run db:start` - Start DynamoDB Local container (detached mode)
- `npm run db:stop` - Stop and remove DynamoDB Local container

**Table Management (Development):**

- `npm run db:create` - Create all tables (skips existing tables)
- `npm run db:drop` - Delete all tables ⚠️ **Destroys all data**
- `npm run db:recreate` - Drop and recreate all tables ⚠️ **Destroys all data**
- `npm run db:setup` - Start container + create tables (first-time setup)

**Data Management (Development):**

- `npm run db:seed` - Populate database with sample data
  - ⚠️ **Erases all existing data**
  - Requires at least one user in the database
- `npm run migrate` - Run pending data migrations
  - Safe for production use
  - Tracks migration history in migrations table
  - Idempotent (safe to run multiple times)

**Table Management (Test Environment):**

- `npm run test:db:create` - Create test tables (uses `.env.test`)
- `npm run test:db:drop` - Delete test tables ⚠️ **Destroys all test data**
- `npm run test:db:recreate` - Drop and recreate test tables ⚠️ **Destroys all test data**
- `npm run test:db:setup` - Start container + create test tables

**Use Cases:**

- **First-time setup**: `npm run db:setup`
- **Apply schema changes**: `npm run db:recreate` (local development only)
- **Reset to empty tables**: `npm run db:recreate`
- **Reset with sample data**: `npm run db:recreate && npm run db:seed`
- **Production schema changes**: Use the migration framework (never drop tables)

## Most Useful Scripts

- `npm run dev` - Start development server with hot reload
- `npm run format` - Run Prettier and ESLint to check and fix code style
- `npm run test` - Run tests with Jest
