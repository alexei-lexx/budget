# Welcome to Infra CDK

Unified infrastructure-as-code package for deploying both backend and frontend stacks to AWS.

## Production Setup

## Prerequisites

- AWS CLI configured with valid credentials
- Node.js installed
- Backend built (`cd ../backend && npm install && npm run build`)

## Setup Steps

1. `npm install` - Install dependencies
2. `cp .env.production.example .env.production` - Copy environment template
3. Edit `.env.production`
4. `npm run deploy` - Deploy all stacks to your configured AWS account/region

## Quality Checks

- `npm run format` - Run Prettier and ESLint to check and fix code style
- `npm run test` - Run tests with Jest
- `npm run typecheck` - Run TypeScript type checker

## Stacks

This CDK app deploys two CloudFormation stacks:

- **BackendCdkStack** - DynamoDB tables, Lambda functions, API Gateway
- **FrontendCdkStack** - S3 bucket, CloudFront distribution

CloudFormation automatically deploys BackendCdkStack first, then FrontendCdkStack.
