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

```bash
# Copy the environment template
cp .env.example .env.development

# Edit .env.development with your Auth0 values:
# AUTH0_DOMAIN=your-tenant.auth0.com
# AUTH0_AUDIENCE=your-api-identifier
```

3. Set up development database:

```bash
npm run db:setup    # Starts DynamoDB Local and creates tables
```

4. Start the development server:

```bash
npm run dev         # Starts server on http://localhost:4000
```

## Database (Development)

Uses DynamoDB Local running in Docker with a named volume for data persistence.

### Database access:

- **DynamoDB Local**: http://localhost:8000
- **Admin UI**: http://localhost:8001

## Most Useful Scripts

- `npm run dev` - Start development server with hot reload
- `npm run format` - Run Prettier and ESLint to check and fix code style
- `npm run test` - Run tests with Jest
- `npm run db:seed` - Seed database with sample data
  - At least one user is required to exist in the database before seeding
  - The script erases all existing data
