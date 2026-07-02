# OpenWiki quickstart

This repository is a self-hosted personal finance tracker with three main runtime parts:

- `backend/` — a Node.js GraphQL API that stores and serves accounts, categories, transactions, reports, chat history, and Telegram bot data.
- `frontend/` — a Vue 3 single-page app for tracking finances, entering transactions, viewing reports, and using the assistant.
- `infra-cdk/` — AWS CDK stacks that provision the backend, frontend, auth, and supporting AWS resources.

The top-level README describes the product as a privacy-focused, self-hosted tracker that supports multiple accounts and currencies, monthly reports, AI-assisted transaction entry, a chat-style assistant, and Telegram integration.

## Start here

- [Repository architecture](architecture.md)
- [Domain and product concepts](domain.md)
- [Development and deployment workflow](workflows.md)
- [Data model and persistence](data-and-storage.md)
- [Integrations and external services](integrations.md)
- [Testing and verification](testing.md)

## What the app does

Core user-facing capabilities, based on `README.md` and `openspec/specs/`:

- Track accounts, balances, income, expenses, refunds, and transfers.
- Organize transactions with custom categories and currency-aware account data.
- View monthly/category reports.
- Ask a built-in assistant about spending, cash flow, and trends.
- Create transactions from natural language, including voice input.
- Use Telegram as an alternate entry point.
- Deploy to your own AWS account and optionally attach a custom domain.

## How the pieces fit together

The backend exposes GraphQL resolvers that call service-layer classes. Those services wrap repositories, business rules, and LangChain agents for assistant and voice-driven transaction creation.

The frontend consumes the GraphQL API, generates typed client code, and provides the UI for finance management and AI entry points.

The CDK stacks wire the app together with DynamoDB tables, Cognito auth, Lambda functions, API Gateway, CloudFront, S3, Route 53, and optional ACM certificates for custom domains.

## Good entry files for future changes

- `backend/src/server.ts` — GraphQL server bootstrap and request context creation.
- `backend/src/graphql/resolvers/index.ts` — resolver composition and union resolution.
- `backend/src/services/assistant-service.ts` and `backend/src/services/create-transaction-from-text-service.ts` — assistant/voice flows.
- `frontend/src/views/Assistant.vue` and `frontend/src/composables/useCreateTransactionFromText.ts` — assistant UI and submission behavior.
- `infra-cdk/lib/backend-cdk-stack.ts` and `infra-cdk/lib/frontend-cdk-stack.ts` — infrastructure topology and environment wiring.

## Known change areas

- AI flows are sensitive to prompt, tool, and agent changes; inspect `backend/src/langchain/` carefully.
- Deployment behavior is split between `deploy.sh` and CDK stack outputs.
- Repository conventions and higher-level specs also live in `openspec/` and `docs/`.
