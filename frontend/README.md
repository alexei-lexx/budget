# Frontend

Vue 3 single-page application for the Personal Finance Tracker.

## Prerequisites

- Auth stack deployed (see [infra-cdk/README.md](../infra-cdk/README.md#development-setup))

## Development Setup

1. `npm install` - Install dependencies
2. `cp .env.example .env` - Copy environment template
3. Edit `.env` to set environment variables (values can be found in `../infra-cdk/cdk-outputs.auth.development.json`):
   - `VITE_AUTH_CLIENT_ID` - from `UserPoolClientId` output
   - `VITE_AUTH_ISSUER` - from `AuthIssuer` output
   - `VITE_AUTH_UI_URL` - from `UserPoolDomainUrl` output
4. `npm run dev` - Start development server on http://localhost:5173/

## Quality Checks

- `npm run format` - Run Prettier and ESLint to check and fix code style
- `npm run test` - Run tests with Jest
- `npm run typecheck` - Run TypeScript type checker
