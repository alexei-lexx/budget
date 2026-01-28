# Personal Finance Tracker

Web application for personal financial management.

## Core Features

- **Multiple Accounts** - Track all your finances in one place: bank accounts, cash, credit cards, and more
- **Income and Expense Tracking** - Record every transaction including income, expense, and refunds with dates, amounts, categories, and notes
- **Money Transfers** - Move money between your accounts while maintaining accurate balances
- **Custom Categories** - Organize your finances your way with personalized income and expense categories
- **Multi-Currency** - Manage accounts in different currencies (USD, EUR, etc.) without forced conversions
- **Monthly Reports** - See where your money goes each month with detailed category breakdowns
- **Smart Suggestions** - Save time with intelligent account and category recommendations based on your habits
- **Transaction Search** - Find any transaction by filtering on account, category, date, etc.

## Technologies

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

> **Note:** Replace placeholder values (`<TENANT>`, `<REGION>`, `your-client-id`, etc.) with your actual configuration before running the commands.

```bash
# Auth audience
aws ssm put-parameter --overwrite --type String \
    --name "/manual/budget/production/auth/audience" \
    --value "https://personal-budget-tracker"

# Auth issuer
aws ssm put-parameter --overwrite --type String \
    --name "/manual/budget/production/auth/issuer" \
    --value "https://<TENANT>.<REGION>.auth0.com"

# Auth client ID (SPA Client ID)
aws ssm put-parameter --overwrite --type String \
    --name "/manual/budget/production/auth/client-id" \
    --value "your-client-id"

# Auth claim namespace
aws ssm put-parameter --overwrite --type String \
    --name "/manual/budget/production/auth/claim-namespace" \
    --value "https://personal-budget-tracker"

# Auth scope
aws ssm put-parameter --overwrite --type String \
    --name "/manual/budget/production/auth/scope" \
    --value "openid profile email offline_access"

# Lambda memory size (in MB)
aws ssm put-parameter --overwrite --type String \
    --name "/manual/budget/production/lambda/memory-size" \
    --value "512"

# Lambda timeout (in seconds)
aws ssm put-parameter --overwrite --type String \
    --name "/manual/budget/production/lambda/timeout-seconds" \
    --value "30"
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

### Multi-Environment Deployment

> **Important:** Before running the deployment script, ensure all required parameters in AWS Systems Manager Parameter Store are created for the desired environment (e.g., `staging`, `production`). Replace `production` in the parameter names with your target environment when setting up for non-production deployments.

The deployment script supports multi-environment deployments using the ENV environment variable. By default, it deploys to the `production` environment. To deploy to a different environment (e.g., `staging`), set the ENV variable when running the script:

```bash
ENV=staging ./deploy.sh
```
