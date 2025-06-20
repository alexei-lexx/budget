# Backend CDK Infrastructure

AWS CDK infrastructure for the Personal Finance Tracker backend. Deploys Lambda functions, API Gateway, and DynamoDB resources.

## Environment Configuration

This project uses environment variables for configuration. Copy and customize the environment file:

```bash
cp .env.example .env.production
```

### Environment Variables

- `NODE_ENV` - Environment (production/development)
- `AUTH0_DOMAIN` - Auth0 domain for JWT verification
- `AUTH0_AUDIENCE` - Auth0 API audience
- `USERS_TABLE_NAME` - DynamoDB table name for users

## Commands

- `npm run build` - Compile TypeScript to JavaScript
- `npm run deploy` - Deploy stack to AWS with environment config
- `npm run diff` - Compare deployed stack with current state
- `npm run synth` - Generate CloudFormation template
- `npm run test` - Run Jest unit tests

## Prerequisites

1. AWS CLI configured with appropriate credentials
2. Backend built and ready for deployment (`cd ../backend && npm run build`)
3. Environment variables configured in `.env.production`
