# Personal Finance Tracker

Web application for personal financial management.

### Technologies

- [Node.js](https://nodejs.org/) backend with GraphQL API
- [Vue.js](https://vuejs.org/) frontend SPA
- Infrastructure as Code with [AWS CDK](https://aws.amazon.com/cdk/)
- Deployed on [AWS](https://aws.amazon.com/)
- Serverless, free-tier friendly
- [Typescript](https://www.typescriptlang.org/) throughout
- [Spec-driven development](https://github.com/github/spec-kit)

## Repository Structure

- **Backend**: [backend/README.md](backend/README.md) - GraphQL API server setup and development
- **Frontend**: [frontend/README.md](frontend/README.md) - Vue.js SPA setup and development
- **Infrastructure**: [infra-cdk/README.md](infra-cdk/README.md) - AWS CDK infrastructure

## Deployment

Deploy the application to AWS.

### Prerequisites

- AWS CLI installed and configured
- Node.js installed
- `jq` command-line JSON processor installed

**Parameters in AWS Systems Manager Parameter Store:**
- `/manual/budget/production/auth/audience` - e.g. `https://personal-budget-tracker`
- `/manual/budget/production/auth/issuer` - e.g. `https://<TENANT>.<REGION>.auth0.com`
- `/manual/budget/production/auth/clientId` - SPA Client ID
- `/manual/budget/production/auth/claim-namespace` - e.g. `https://personal-budget-tracker`
- `/manual/budget/production/auth/scope` - e.g. `openid profile email offline_access`
- `/manual/budget/production/lambda/memory-size` - e.g. `512`
- `/manual/budget/production/lambda/timeout-seconds` - e.g. `30`

### Deployment order

1. Build backend
2. Deploy backend infrastructure
3. Deploy frontend infrastructure
4. Build and upload frontend

### Deployment Script

```bash
./deploy.sh
```
