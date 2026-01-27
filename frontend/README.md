# Frontend

Vue 3 single-page application for the Personal Finance Tracker.

## Development Setup

1. `npm install` - Install dependencies
2. `cp .env.example .env` - Copy environment template
3. Edit `.env` to set environment variables; typically only:
   - `VITE_AUTH_CLIENT_ID`
   - `VITE_AUTH_ISSUER`
4. `npm run dev` - Start development server on http://localhost:5173/

## Quality Checks

- `npm run format` - Run Prettier and ESLint to check and fix code style
- `npm run typecheck` - Run TypeScript type checker
