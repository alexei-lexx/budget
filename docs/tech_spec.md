# Technical Stack Specification

- **Project Name:** Personal Finance Tracker
- **Version:** 1.0
- **Date:** 12 June 2025

---

## 1. System Overview

Personal Finance Tracker is a serverless web application for individual financial management. Users authenticate via Auth0, manage their financial data through a Vue.js frontend, and store data in AWS DynamoDB via a GraphQL API.

### Architecture
```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │───>│ CloudFront   │───>│ API Gateway  │───>│   Lambda    │───>│  DynamoDB   │
│  (Vue SPA)  │    │   (S3 +      │    │   (HTTP      │    │ (GraphQL    │    │  (User      │
│             │    │    CDN)      │    │    API)      │    │   API)      │    │   Data)     │
└─────────────┘    └──────────────┘    └──────────────┘    └─────────────┘    └─────────────┘
       │                                                          │
       │                       ┌─────────────┐                    │
       └──────────────────────>│   Auth0     │<───────────────────┘
                               │ (Identity   │
                               │  Provider)  │
                               └─────────────┘
```

### Repository Structure
- **frontend/** - Vue 3 + Vite application
- **backend/** - Apollo GraphQL server
- **frontend-cdk/** - Frontend infrastructure (S3/CloudFront)
- **backend-cdk/** - Backend infrastructure (Lambda/API Gateway)

---

## 2. Frontend

### Technologies
- **Vue 3** - Progressive JavaScript framework with Composition API and Vue Router
- **Vite** - Fast build tool and development server
- **Vuetify** - Material Design component library
- **Apollo Client** - GraphQL client for data fetching
- **Auth0 SDK** - Authentication integration
- **TypeScript** - Type safety and enhanced developer experience

### Responsibilities
- User interface and user experience
- Client-side routing for single-page application
- Auth0 authentication integration
- GraphQL API communication
- Local UI state management using Vue's reactivity

### Key Features
- PWA support for mobile installation
- Responsive design optimized for mobile browsers
- Authentication with automatic token refresh
- Apollo Client cache for server data management

---

## 3. Backend

### Technologies
- **Apollo Server** - GraphQL server implementation
- **Node.js** - JavaScript runtime environment
- **TypeScript** - Type-safe server-side development
- **esbuild** - Fast bundling for Lambda deployment
- **JWT libraries** - Token verification and Auth0 integration
- **AWS SDK** - DynamoDB client libraries

### Responsibilities
- GraphQL API implementation
- Auth0 JWT token verification
- Business logic and data validation
- Database operations through repository pattern
- User context management and data isolation

### Key Features
- Schema-first GraphQL development
- Authentication middleware for JWT verification
- Repository pattern for database abstraction
- Structured error handling and input validation

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
- Users created automatically on first sign-in
- Linked to Auth0 account via Auth0 user ID
- Point-in-time recovery enabled for backups

### Vendor Independence
- **Repository Pattern** - Database operations abstracted behind service layer
- **Generic Queries** - Avoid DynamoDB-specific features
- **Migration Ready** - Can switch to PostgreSQL, MongoDB, etc.
- **Portability** - Database design enables future platform changes

---

## 5. Authentication

### Provider
- **Auth0** - Identity service and JWT token management
- **Initial Phase** - Email/password authentication
- **User Creation** - Manual creation in Auth0 dashboard
- **Future Expansion** - Social logins (Google, GitHub, etc.)

### Token Flow
1. User authenticates with Auth0, receives JWT tokens
2. Frontend includes JWT in GraphQL request headers
3. Backend verifies JWT signature and extracts user context
4. Database operations scoped to authenticated user

### Security Features
- JWT signature validation with Auth0 public keys
- Automatic token refresh in frontend
- User data isolation at database level
- Authentication handled in backend code, not AWS services

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

### Vendor Independence
- Minimal AWS dependencies to avoid vendor lock-in
- Frontend can be deployed on any static hosting provider (S3, GitHub Pages, nginx)
- Backend can run on any Node.js platform (Lambda, Docker, VPS)

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

### Environment Configuration
- Environment-specific configs for Auth0, AWS, and API endpoints
- Separate AWS profiles for dev/prod environments

---

## 8. Technical Rationale

### Technology Choices

**Vue.js over React/Angular:**
- Simpler learning curve for solo development
- Excellent TypeScript integration
- Rich ecosystem with Vuetify
- Smaller bundle size

**GraphQL over REST:**
- Type-safe API development
- Flexible data fetching
- Single endpoint simplifies client code
- Excellent tooling and introspection

**Auth0 over AWS Cognito:**
- Multiple authentication methods support
- Better developer experience
- Future expansion to social logins
- Industry-standard security practices

**DynamoDB over RDS:**
- Serverless architecture alignment
- Pay-per-request pricing model
- Automatic scaling without configuration
- Single-digit millisecond latency

### Key Principles

**Vendor Independence:** Minimal dependencies, portable across hosting providers, repository pattern for database abstraction

**Simplicity:** Manual deployment, no complex CI/CD, straightforward troubleshooting

**Security:** JWT verification, user data isolation, HTTPS enforcement
