# Personal Finance Tracker

A serverless web application for individual financial management with Vue.js frontend, GraphQL backend, and AWS infrastructure.

## Quick Start

- **Backend**: [backend/README.md](backend/README.md) - GraphQL API server setup and development
- **Frontend**: [frontend/README.md](frontend/README.md) - Vue.js SPA setup and development

## Architecture

- **frontend/** - Vue 3 + Vite + Vuetify SPA
- **backend/** - Apollo GraphQL server (Node.js/TypeScript)
- **backend-cdk/** - AWS CDK infrastructure for backend (Lambda/API Gateway/DynamoDB)
- **frontend-cdk/** - AWS CDK infrastructure for frontend (S3/CloudFront)

## Deployment

```bash
./deploy.sh    # Complete deployment: backend → frontend infrastructure → frontend assets
```
