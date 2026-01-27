# Welcome to Infra CDK

Unified infrastructure-as-code package for deploying both backend and frontend stacks to AWS.

## Development Setup

- `npm install` - Install dependencies

## Deployment

See the [root README.md](../README.md#deployment) for deployment instructions.

## Quality Checks

- `npm run format` - Run Prettier and ESLint to check and fix code style
- `npm run test` - Run tests with Jest
- `npm run typecheck` - Run TypeScript type checker

## Stacks

This CDK app deploys two CloudFormation stacks:

- **BackendCdkStack** - DynamoDB tables, Lambda functions, API Gateway
- **FrontendCdkStack** - S3 bucket, CloudFront distribution

CloudFormation automatically deploys BackendCdkStack first, then FrontendCdkStack.
