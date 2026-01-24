# Frontend

Vue 3 single-page application for the Personal Finance Tracker.

## Development Setup

### Prerequisites

- Node.js 22+

### Setup Steps

1. `npm install` - Install dependencies
2. `cp .env.development.example .env.development` - Copy environment template
3. Edit `.env.development` with your Identity Provider settings
   - `VITE_AUTH_CLIENT_ID`
   - `VITE_AUTH_ISSUER`
4. `npm run dev` - Start development server on http://localhost:5173/

## Production Setup

1. `cp .env.production.example .env.production` - Copy environment template
2. Edit `.env.production`
   - `VITE_AUTH_CLIENT_ID`
   - `VITE_AUTH_ISSUER`
3. `npm run build` - Build production assets

## Quality Checks

- `npm run format` - Run Prettier and ESLint to check and fix code style
- `npm run typecheck` - Run TypeScript type checker
