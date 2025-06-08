# Technical Stack Specification

**Project Name:** Personal Finance Tracker
**Version:** 1.3
**Date:** 28 May 2025

---

## 1. High-Level Architecture

- **Monorepo:** Single repository containing frontend and backend, each with its own infrastructure-as-code (IaC).
- **Frontend:** Simple SPA (Vue 3 + Vite), PWA-ready, responsive.
- **Backend:** Apollo Server (GraphQL) running on AWS Lambda.
- **API Gateway:** AWS API Gateway to expose Lambda as HTTP endpoint.
- **Unified Hosting:** Both frontend and backend are served from a single CloudFront distribution and domain.
- **Authentication:** Google OAuth 2.0 (direct integration, no Cognito).
- **Database:** AWS DynamoDB (NoSQL, serverless).
- **Hosting:** AWS S3 + CloudFront for static frontend assets and API routing.
- **IaC:** AWS CDK (TypeScript) defined within each component (`frontend/cdk/`, `backend/cdk/`).
- **CI/CD:** GitHub Actions for automated build, test, and deployment.

---

## 2. Stack Independence & Deployment

- **Independent Stacks:**
  The frontend and backend each define and deploy their own AWS resources using CDK code located within their respective folders.
- **Output Sharing:**
  The backend stack outputs required values (e.g., API endpoint, auth config) after deployment.
  The frontend stack consumes these outputs as environment variables or configuration during build/deploy.
- **No Central Infra Layer:**
  There is no shared `infra/` folder coupling frontend and backend.
  Coordination between stacks is handled via output sharing and documentation.

---

## 3. Technology Choices

**Frontend:**

- Vue 3 + Vite (TypeScript)
  - Simple, fast, easy to maintain
  - PWA support
  - Integrates directly with Google OAuth 2.0 for authentication
  - CDK code for S3, CloudFront, etc. in `frontend/cdk/`

**Backend:**

- Apollo Server (Node.js/TypeScript)
  - GraphQL API
  - Deployed as AWS Lambda
  - Verifies Google ID tokens for authentication
  - CDK code for Lambda, API Gateway, DynamoDB, etc. in `backend/cdk/`

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

## 4. Repository Structure

This project uses a simple monorepo structure. All code for the frontend and backend, including their infrastructure, is organized in separate folders within a single repository. No special monorepo management tool is used—just clear folder organization.

```
budget-app/
├── frontend/      # Vite + Vue 3 app
│   └── cdk/       # CDK code for frontend infra (S3, CloudFront, etc.)
├── backend/       # Apollo Server (GraphQL) for Lambda
│   └── cdk/       # CDK code for backend infra (Lambda, API Gateway, DynamoDB, etc.)
├── .github/       # GitHub Actions workflows
└── README.md
```

- Each folder is self-contained and can be developed, built, and deployed independently.
- Shared code (if any) can be placed in a common directory or managed with relative imports.
- Backend and frontend stacks are defined separately in their respective folders.
- Outputs from the backend stack (e.g., API URL, auth config) are made available for the frontend stack.
- This approach keeps things simple and avoids extra tooling overhead.

---

## 5. Rationale

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

## 6. Deployment & Maintenance

- **Automated CI:** GitHub Actions will be used initially for automated testing only.
- **Build and deployment:** Build and deployment steps will be run manually from the development machine at first. GitHub Actions for build and deployment can be added later as the project matures.
- **Serverless-first:** No server management, pay only for usage.
- **Easy rollback and updates:** All infrastructure and code changes tracked in the repo.
- **Stack outputs:** After backend deployment, outputs (API URL, etc.) are documented or exported for frontend configuration.

---

## 7. Local Development

- The application must be runnable locally for development and testing.
- **DynamoDB Local:**
  - Use [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) for local development and testing of backend features.
  - If DynamoDB Local is not available or suitable, the development environment should support connecting to a remote DynamoDB instance (e.g., via environment variables).
- **Frontend:**
  - The Vue 3 app can be run locally using Vite's development server.
  - Google OAuth client ID must be configured for local development.
  - API endpoint and other backend outputs must be provided via environment variables or config.
- **Backend:**
  - Apollo Server (GraphQL) can be run locally using Node.js.
  - Google ID token verification must work in local and cloud environments.
- **Infrastructure:**
  - All infrastructure code (AWS CDK) and deployment scripts must be runnable from a developer's local machine.
  - Each stack (frontend, backend) can be deployed independently.
- **Environment Configuration:**
  - Use environment variables or configuration files to switch between local and remote resources as needed.

---
