# Personal Finance Tracker

Web application for personal financial management.

## Core Features

- **Multi-Account Management** - Create and manage multiple accounts (bank, cash, credit cards) with different currencies
- **Transaction Tracking** - Record income, expenses, and refunds with dates, amounts, categories, and descriptions
- **Inter-Account Transfers** - Transfer money between accounts with matching currencies
- **Custom Categories** - Organize transactions with custom income and expense categories
- **Multi-Currency Support** - Track accounts in different currencies without automatic conversion
- **Monthly Reports** - View detailed monthly breakdowns by category with currency-specific totals and percentages
- **Smart Transaction Patterns** - Get intelligent suggestions for account and category combinations based on your history
- **Auto-Complete Descriptions** - Quick-fill transaction descriptions from your previous entries
- **Advanced Filtering** - Filter transactions by account, category, date range, and type with cursor-based pagination
- **Real-Time Balance Calculation** - Automatic balance updates as you add transactions and transfers
- **Soft Deletion** - Archive accounts and transactions for data recovery while keeping them hidden from reports
- **Exclude from Reports** - Mark specific categories to exclude from monthly summaries
- **Secure Authentication** - Login with Auth0 for enterprise-grade security with JWT tokens
- **Progressive Web App** - Install on mobile devices directly from your browser without app stores
- **Cross-Device Sync** - Access your financial data from any device with automatic cloud synchronization

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
