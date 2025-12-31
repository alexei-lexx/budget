# Welcome to Infra CDK

Unified infrastructure-as-code package for deploying both backend and frontend stacks to AWS.

## Prerequisites

- AWS CLI configured with valid credentials
- Node.js installed
- Backend built (`cd ../backend && npm install && npm run build`)
- `.env.production` file (see below)

## Environment Variables

```bash
cp .env.example .env.production
```

Then edit `.env.production` and configure:

```env
NODE_ENV=production

# Auth Configuration
AUTH_AUDIENCE=https://personal-budget-tracker
AUTH_DOMAIN=identity-provider.example.com

# JWT Custom Claims Configuration
AUTH_CLAIM_NAMESPACE=https://personal-budget-tracker

# Database Configuration (for production)
ACCOUNTS_TABLE_NAME=Accounts
CATEGORIES_TABLE_NAME=Categories
MIGRATIONS_TABLE_NAME=Migrations
TRANSACTIONS_TABLE_NAME=Transactions
USERS_TABLE_NAME=Users

# Lambda Configuration
LAMBDA_MEMORY_SIZE=512
LAMBDA_TIMEOUT_SECONDS=30
```

## Useful Commands

- `npm run build` - Compile typescript to js
- `npm run deploy:backend` - Deploy backend stack only
- `npm run deploy:frontend` - Deploy frontend stack only
- `npm run deploy` - Deploy both stacks to your default AWS account/region
- `npm run diff` - Compare deployed stack with current state
- `npm run synth` - Emit the synthesized CloudFormation template
- `npm run test` - Perform the jest unit tests
- `npm run watch` - Watch for changes and compile

## Stacks

This CDK app deploys two CloudFormation stacks:

- **BackendCdkStack** - DynamoDB tables, Lambda functions, API Gateway
- **FrontendCdkStack** - S3 bucket, CloudFront distribution

CloudFormation automatically deploys BackendCdkStack first, then FrontendCdkStack.
