# Frontend

Vue 3 single-page application for the Personal Finance Tracker.

## Prerequisites

- Backend running (see [backend/README.md](../backend/README.md#development-setup))

## Development Setup

1. `npm install` - Install dependencies
2. `cp .env.example .env` - Copy environment template
3. `npm run dev` - Start development server on http://localhost:5173/
4. Sign in as a dev user (see [backend/README.md](../backend/README.md#authentication-development))

The Vite dev server proxies `/graphql` to the backend and `/oidc` to the mock OIDC server.
The dev server must use port 5173, because the token issuer contains the port.

## Deployed Cognito User Pool

To use the deployed Cognito user pool:

1. Deploy the auth stack (see [infra-cdk/README.md](../infra-cdk/README.md#development-setup))
2. In `.env`, comment out the local mock OIDC server block, then uncomment the Cognito block and set its values from `../infra-cdk/cdk-outputs.auth.development.json`:
   - `VITE_AUTH_CLIENT_ID` - from `UserPoolClientId` output
   - `VITE_AUTH_ISSUER` - from `AuthIssuer` output
   - `VITE_AUTH_UI_URL` - from `UserPoolDomainUrl` output
3. In `backend/.env`, comment out the local mock OIDC server block, then uncomment the Cognito block and set its values (see [backend/README.md](../backend/README.md#authentication-development))

## Quality Checks

- `npm run format` - Run Prettier and ESLint to check and fix code style
- `npm run test` - Run tests with Jest
- `npm run typecheck` - Run TypeScript type checker
