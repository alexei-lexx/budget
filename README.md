# Personal Finance Tracker

Web application for personal financial management.

### Technologies

- [Node.js](https://nodejs.org/) backend with GraphQL API
- [Vue.js](https://vuejs.org/) frontend SPA
- Infrastructure as Code with [AWS CDK](https://aws.amazon.com/cdk/)
- Deployed on [AWS](https://aws.amazon.com/)
- Serverless, free-tier friendly
- [TypeScript](https://www.typescriptlang.org/) throughout
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

**Create Parameters in AWS Systems Manager Parameter Store:**

```bash
# Auth audience
aws ssm put-parameter \
    --name "/manual/budget/production/auth/audience" \
    --value "https://personal-budget-tracker" \
    --type String

# Auth issuer
aws ssm put-parameter \
    --name "/manual/budget/production/auth/issuer" \
    --value "https://<TENANT>.<REGION>.auth0.com" \
    --type String

# Auth client ID (SPA Client ID)
aws ssm put-parameter \
    --name "/manual/budget/production/auth/client-id" \
    --value "your-client-id" \
    --type String

# Auth claim namespace
aws ssm put-parameter \
    --name "/manual/budget/production/auth/claim-namespace" \
    --value "https://personal-budget-tracker" \
    --type String

# Auth scope
aws ssm put-parameter \
    --name "/manual/budget/production/auth/scope" \
    --value "openid profile email offline_access" \
    --type String

# Lambda memory size (in MB)
aws ssm put-parameter \
    --name "/manual/budget/production/lambda/memory-size" \
    --value "512" \
    --type String

# Lambda timeout (in seconds)
aws ssm put-parameter \
    --name "/manual/budget/production/lambda/timeout-seconds" \
    --value "30" \
    --type String
```

### Deployment order

1. Build backend
2. Deploy backend infrastructure
3. Deploy frontend infrastructure
4. Build and upload frontend

### Deployment Script

```bash
./deploy.sh
```
