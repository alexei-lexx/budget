# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Finance Tracker - A Vue.js 3 frontend with Apollo GraphQL backend, both deployed to AWS. The app helps users track personal finances with Google OAuth authentication.

## Architecture

- **Monorepo Structure**: Independent frontend and backend with separate CDK stacks
- **Frontend**: Vue 3 + Vite (TypeScript), deployed to S3/CloudFront via CDK
- **Backend**: Apollo Server GraphQL on AWS Lambda, with API Gateway and DynamoDB
- **Infrastructure**: Each component has its own CDK stack in `*-cdk/` directories
- **Authentication**: Direct Google OAuth 2.0 integration (no AWS Cognito)
- **Database**: DynamoDB with abstraction layer for future portability

## Key Commands

### Git Setup
```bash
git config core.hooksPath .githooks
```

### Frontend (`frontend/`)
```bash
npm run dev           # Start development server
npm run build         # Build for production (includes type checking)
npm run type-check    # Run Vue TypeScript checks
npm run lint          # Check code style
npm run lint:fix      # Fix linting issues
npm run prettier      # Check formatting
npm run prettier:fix  # Fix formatting
```

### Backend (`backend/`)
```bash
npm run dev           # Start local development server
npm run build         # Build Lambda bundle
npm run compile       # TypeScript compilation
npm run lint          # Check code style
npm run lint:fix      # Fix linting issues
npm run prettier      # Check formatting
npm run prettier:fix  # Fix formatting
```

### CDK Stacks (`backend-cdk/` and `frontend-cdk/`)
```bash
npm run build         # Compile CDK TypeScript
npm run deploy        # Deploy to AWS
npm run test          # Run CDK tests
npm run cdk           # Direct CDK commands
```

### Full Deployment
```bash
./deploy.sh           # Complete build and deploy sequence
```

## Development Workflow

1. **Backend First**: Deploy backend stack to get API endpoints
2. **Frontend Second**: Deploy frontend stack (consumes backend outputs)
3. **Local Development**: Use `npm run dev` in respective directories
4. **Testing**: Each component has independent test suites
5. **Deployment**: Use `deploy.sh` for full deployment or individual CDK commands

## Important Notes

- Backend and frontend are completely independent stacks
- Frontend CDK creates `outputs.json` with deployment configuration
- All code uses TypeScript with strict typing
- Google OAuth requires proper client ID configuration for local/remote environments
- DynamoDB operations are abstracted through repository pattern for database portability