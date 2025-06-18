# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Finance Tracker - A serverless web application for individual financial management with Vue.js frontend, GraphQL backend, and AWS infrastructure.

### Architecture
- **frontend/** - Vue 3 + Vite + Vuetify SPA
- **backend/** - Apollo GraphQL server (Node.js/TypeScript)
- **backend-cdk/** - AWS CDK infrastructure for backend (Lambda/API Gateway/DynamoDB)
- **frontend-cdk/** - AWS CDK infrastructure for frontend (S3/CloudFront)

## Development Commands

### Backend Development
```bash
cd backend
npm run dev          # Start development server with nodemon
npm run build        # Compile and bundle for Lambda deployment
npm run lint         # ESLint check
npm run lint:fix     # ESLint with auto-fix
npm run prettier     # Prettier format check
npm run prettier:fix # Prettier format fix

# Database (Development)
npm run db:start      # Start DynamoDB Local + Admin UI
npm run db:start-only # Start only DynamoDB Local (without admin UI)
npm run db:admin      # Start admin UI separately
npm run db:stop       # Stop all database services
npm run db:setup      # Start database and create tables
npm run db:reset      # Reset database (stop, start, create tables)
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start Vite development server
npm run build        # Build for production
npm run type-check   # Vue TypeScript checking
npm run lint         # ESLint check
npm run lint:fix     # ESLint with auto-fix
npm run format       # Run prettier:fix and lint:fix together
```

### CDK Infrastructure
```bash
cd backend-cdk
npm run build        # Compile TypeScript
npm run deploy       # Deploy backend to AWS
npm run test         # Run Jest tests

cd frontend-cdk
npm run build        # Compile TypeScript
npm run deploy       # Deploy frontend infrastructure to AWS
npm run test         # Run Jest tests
```

### Full Deployment
```bash
./deploy.sh          # Complete deployment: backend → frontend infrastructure → frontend assets
```

## Key Technical Details

### Authentication Flow
- Auth0 JWT tokens used for authentication
- Backend verifies JWT signatures and extracts user context
- All data operations scoped to authenticated user

### Database Design
- DynamoDB with user data partitioned by internal user ID
- Repository pattern abstracts database operations for portability
- All queries scoped to authenticated user for data isolation

### Development Database

**Setup:**
- DynamoDB Local runs in Docker container (port 8000)
- DynamoDB Admin UI available at http://localhost:8001
- Tables created automatically with `npm run db:setup`
- Data persisted in `./docker/dynamodb/` directory

**First-time setup:**
```bash
cd backend
npm run db:setup    # Starts DynamoDB Local and creates all tables
```

**Daily development workflow:**
```bash
cd backend
npm run db:start    # Start DynamoDB Local + Admin UI
npm run dev         # Start backend development server

# Admin UI automatically available at http://localhost:8001
```

**Database management:**
```bash
npm run db:stop     # Stop DynamoDB Local + Admin UI
npm run db:reset    # Reset database (recreate all tables)
```

**Requirements:**
- Docker and Docker Compose must be installed
- AWS SDK dependencies installed via `npm install`

### Development Tools
- ESLint + Prettier for code quality across all packages
- TypeScript for type safety
- Jest for unit testing in CDK packages
- Git hooks available (run `git config core.hooksPath .githooks` to enable)

## Important Patterns

### Script Usage
Always prefer npm scripts from package.json over direct tool usage to ensure consistent versions and configurations.

### Multi-Currency Support
Each account has a specific currency. Transfers only allowed between accounts with same currency. Reports grouped by currency without conversion.

### Error Handling
Backend implements structured error handling with GraphQL-specific error formatting. Frontend uses Apollo Client error handling patterns.