# Technical Stack Specification

**Project Name:** Personal Finance Tracker
**Version:** 2.0 (Updated to reflect current implementation)
**Date:** 10 June 2025

---

## 1. Current Implementation Status

**What's Working:**
- Basic Vue 3 frontend with Vite scaffolding
- Apollo GraphQL server with health check endpoint
- AWS CDK infrastructure for both frontend and backend
- Working deployment pipeline via `deploy.sh`
- Frontend deployed to S3/CloudFront
- Backend deployed to Lambda with API Gateway

**What's Not Yet Implemented:**
- Google OAuth authentication
- DynamoDB database integration
- User management system
- Financial data models and GraphQL schema
- Application-specific frontend components

## 2. Current Architecture

- **Monorepo:** Single repository with `frontend/`, `backend/`, `frontend-cdk/`, `backend-cdk/` directories
- **Frontend:** Vue 3 + Vite + TypeScript (currently default template)
- **Backend:** Apollo Server GraphQL + TypeScript (minimal health check only)
- **Infrastructure:** Separate CDK stacks for frontend (S3/CloudFront) and backend (Lambda/API Gateway)
- **Deployment:** Manual deployment via shell script

## 3. Planned Architecture (To Be Implemented)

- **Authentication:** Google OAuth 2.0 (direct integration, no Cognito)
- **Database:** AWS DynamoDB (NoSQL, serverless)
- **Unified Domain:** Both frontend and backend served from single CloudFront distribution
- **CI/CD:** GitHub Actions for automated build, test, and deployment

---

## 4. Current Deployment Structure

- **Independent Stacks:**
  - `frontend-cdk/`: Defines S3 bucket and CloudFront distribution
  - `backend-cdk/`: Defines Lambda function and API Gateway
- **Deployment Process:**
  1. Backend builds and deploys Lambda
  2. Frontend CDK creates S3 bucket and outputs to `outputs.json`
  3. Frontend builds and syncs to S3 bucket
- **Current Limitations:**
  - No output sharing between stacks yet
  - No unified domain configuration
  - Manual deployment process only

---

## 5. Technology Choices

**Frontend (Current):**
- Vue 3 + Vite + TypeScript
- Default Vite template with HelloWorld and Welcome components
- Infrastructure: S3 + CloudFront via CDK in `frontend-cdk/`

**Frontend (Planned):**
- PWA support for mobile installation
- Google OAuth 2.0 client integration
- Responsive design for mobile browsers

**Backend (Current):**
- Apollo Server + Node.js + TypeScript
- Single health check GraphQL query
- Infrastructure: Lambda + API Gateway via CDK in `backend-cdk/`

**Backend (Planned):**
- Complete GraphQL schema for finance tracking
- Google ID token verification
- DynamoDB integration with repository pattern

**API Gateway:**

- AWS API Gateway
  - HTTP endpoint
  - CORS, security, routing

**Authentication:**

- Google OAuth 2.0 (direct)
  - Users sign in with Google
  - Frontend obtains Google ID token
  - Backend verifies Google ID token and extracts user identity
  - No AWS Cognito or proprietary auth services

**Database:**

- AWS DynamoDB
  - Serverless, scalable, pay-per-use
  - **Data access is abstracted via a repository/service layer to enable future migration to other databases if needed.**
  - **Data models and queries are designed to avoid DynamoDB-specific features, ensuring portability.**
  - All user data is scoped by an internal user ID
  - Each user is created on first login and linked to their Google account (by Google user ID)
  - Internal user IDs are used as primary keys for all user data

**Hosting:**

- AWS S3 + CloudFront
  - Static site hosting
  - CDN

**Infrastructure as Code (IaC):**

- AWS CDK (TypeScript)
  - Infrastructure as code
  - Each stack (frontend, backend) is defined and deployed independently within its own folder
  - Outputs from backend stack are consumed by frontend stack as needed

**CI/CD:**

- GitHub Actions
  - Automated build, test, deploy

---

## 6. Current Repository Structure

```
budget2/
├── frontend/           # Vue 3 + Vite app
│   ├── src/
│   │   ├── App.vue            # Main app component (default template)
│   │   ├── main.ts            # Vue app entry point
│   │   └── components/        # Default Vite components
│   └── package.json           # Frontend dependencies
├── frontend-cdk/       # Frontend infrastructure
│   ├── lib/frontend-cdk-stack.ts  # S3 + CloudFront setup
│   └── outputs.json           # CDK deployment outputs
├── backend/            # Apollo GraphQL server
│   ├── src/
│   │   ├── index.ts           # Local development server
│   │   ├── lambda.ts          # Lambda handler
│   │   ├── server.ts          # Apollo server setup
│   │   ├── schema.ts          # GraphQL schema (health check only)
│   │   └── resolvers.ts       # GraphQL resolvers (health check only)
│   └── dist/                  # Built Lambda code
├── backend-cdk/        # Backend infrastructure
│   └── lib/backend-cdk-stack.ts   # Lambda + API Gateway setup
├── deploy.sh           # Manual deployment script
├── docs/              # Project documentation
└── CLAUDE.md          # Claude Code guidance
```

**Key Points:**
- Each component is self-contained with its own package.json
- CDK infrastructure is separate from application code
- No shared code or common utilities yet
- No GitHub Actions or automated CI/CD

---

## 7. Technical Rationale

- **Independent deployment:** Enables faster iteration and easier rollbacks for frontend and backend.
- **Single language (TypeScript/JavaScript):** Reduces context switching, easy for solo maintenance.
- **Serverless:** Minimal maintenance, low cost, scalable.
- **GraphQL:** Flexible data fetching, single endpoint, strong typing.
- **Monorepo:** Simplifies versioning, deployment, and collaboration.
- **AWS:** Fits your experience and project requirements.
- **Vue 3:** Simple, approachable, and productive for solo or small-team development.
- **Direct Google OAuth:** Avoids AWS vendor lock-in for authentication, keeps stack portable.
- **Database abstraction for portability:** By using a repository/service layer and avoiding DynamoDB-specific features, the backend can be migrated to another database (e.g., PostgreSQL, MongoDB) in the future with minimal changes.

---

## 8. Current Deployment Process

**Manual Deployment via `deploy.sh`:**
1. Build backend and deploy via `backend-cdk`
2. Deploy frontend infrastructure via `frontend-cdk` 
3. Build frontend and sync to S3 bucket
4. All deployments are manual and sequential

**Future Enhancements:**
- GitHub Actions for automated CI/CD
- Stack output sharing between backend and frontend
- Unified domain configuration
- Environment-specific deployments (dev/staging/prod)

---

## 9. Local Development

**Current Local Development:**
- **Frontend:** `npm run dev` in `frontend/` starts Vite dev server on port 5173
- **Backend:** `npm run dev` in `backend/` starts Apollo server on port 4000
- **No database integration yet:** Backend only has health check endpoint
- **No authentication:** No Google OAuth setup yet

**Future Local Development Setup:**
- DynamoDB Local for database development
- Google OAuth client configuration for local testing
- Environment variables for switching between local/remote resources
- Backend API endpoint configuration for frontend

**Infrastructure:**
- CDK deployment can be run locally from respective directories
- Each stack deploys independently to AWS
- No local infrastructure emulation currently

---
