# Personal Finance Tracker

A serverless web application for personal financial management with Vue.js frontend, GraphQL backend, and AWS infrastructure.

## Quick Start

- **Backend**: [backend/README.md](backend/README.md) - GraphQL API server setup and development
- **Frontend**: [frontend/README.md](frontend/README.md) - Vue.js SPA setup and development
- **Infrastructure**: [infra-cdk/README.md](infra-cdk/README.md) - AWS CDK infrastructure

## Deployment

Deploy the application to AWS.

**Prerequisites:**
- AWS CLI configured with appropriate credentials
- `jq` command-line JSON processor installed

**Deployment order:**
1. Build backend
2. Deploy backend infrastructure
3. Deploy frontend infrastructure
4. Build and upload frontend

```bash
./deploy.sh
```
