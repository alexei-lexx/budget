# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Finance Tracker - Currently in scaffolding phase with working infrastructure but no application features implemented yet.

## Current Implementation Status

**Working:**
- Basic Vue 3 frontend with default Vite template
- Apollo GraphQL server with health check endpoint only
- CDK infrastructure for both frontend (S3/CloudFront) and backend (Lambda/API Gateway)
- Manual deployment pipeline via `deploy.sh`

**Not Yet Implemented:**
- Google OAuth authentication
- DynamoDB database integration
- Financial data models and GraphQL schema
- Application-specific UI components
- User management system

## Architecture

- **Monorepo**: Four independent directories with separate package.json files
- **Frontend**: Vue 3 + Vite + TypeScript (currently default scaffolding)
- **Backend**: Apollo Server + TypeScript on AWS Lambda (minimal health check only)
- **Infrastructure**: Separate CDK stacks in `frontend-cdk/` and `backend-cdk/`
- **Deployment**: Manual process with working S3/CloudFront and Lambda/API Gateway setup

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

**Current Local Development:**
1. **Frontend**: `cd frontend && npm run dev` (serves on port 5173)
2. **Backend**: `cd backend && npm run dev` (serves on port 4000)
3. **Deployment**: `./deploy.sh` for full AWS deployment

**Current Infrastructure Deployment:**
1. Backend builds and deploys Lambda function
2. Frontend CDK deploys S3/CloudFront and creates `outputs.json`
3. Frontend builds and syncs static files to S3

## Key Technical Details

- Each directory (`frontend/`, `backend/`, `frontend-cdk/`, `backend-cdk/`) is independent
- Backend currently only has `Query.health` GraphQL endpoint
- Frontend shows default Vue welcome page with Vite branding
- CDK stacks deploy separately without output sharing yet
- No database, authentication, or core application logic implemented
- TypeScript used throughout with ESLint and Prettier configured