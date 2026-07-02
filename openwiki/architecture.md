# Repository architecture

This repository is organized around a GraphQL backend, a Vue frontend, and AWS CDK infrastructure. The backend is the source of truth for business behavior; the frontend is mostly a typed GraphQL client and UI layer; the infrastructure code provisions the runtime and deployment surface.

## Runtime shape

### Backend

`backend/src/server.ts` creates the Apollo Server, loads `backend/src/graphql/schema.graphql`, and builds a per-request GraphQL context.

The context wires together:

- authentication via `resolveJwtAuthService()`
- repositories for users, accounts, and categories
- CRUD services for accounts, categories, transactions, transfers, and users
- report services
- AI services for assistant chat and natural-language transaction creation
- Telegram services
- request-scoped DataLoaders for accounts and categories

The main resolver index (`backend/src/graphql/resolvers/index.ts`) composes separate resolver modules by domain. That file also defines the GraphQL union resolution for `AgentTraceMessage`, mapping the service-layer discriminated union to GraphQL concrete types.

### Frontend

`frontend/src/main.ts` boots the Vue app. The assistant page (`frontend/src/views/Assistant.vue`) uses the `useAssistant` composable and the `AgenticInput` component to send questions and surface assistant trace data.

The natural-language transaction flow lives in `frontend/src/composables/useCreateTransactionFromText.ts`, which submits text to the GraphQL mutation, handles aborts, keeps failed input in place, and captures agent traces for the UI.

### Infrastructure

`infra-cdk/lib/backend-cdk-stack.ts` provisions the backend runtime:

- DynamoDB tables for users, accounts, categories, transactions, chat messages, migrations, and Telegram bots
- Lambda functions for the web GraphQL endpoint and background jobs
- IAM permissions and log groups
- Bedrock invocation permissions for agent-driven features
- environment variables that point the Lambdas at the right tables and auth settings

`infra-cdk/lib/frontend-cdk-stack.ts` provisions the frontend hosting path:

- S3 static website bucket
- CloudFront distribution
- API Gateway origin routing for `/graphql*`
- optional custom-domain support through Route 53 and ACM

## Request flow: GraphQL

A typical frontend request goes through these layers:

1. Vue composable or view calls a generated Apollo mutation/query.
2. The request reaches the GraphQL Lambda.
3. `backend/src/server.ts` creates auth and service context.
4. A resolver module dispatches to a service class.
5. The service uses repositories and domain helpers.
6. Data comes back to GraphQL and is serialized to the client.

This layering is visible in the service and repository structure under `backend/src/services/` and `backend/src/repositories/`.

## AI and agent flow

The AI assistant and voice transaction features are split across several layers:

- `backend/src/langchain/agents/assistant-agent.ts` defines the assistant agent, its system prompt, and the tools it can use.
- `backend/src/services/assistant-service.ts` formats user input, calls the assistant agent, and validates the result.
- `backend/src/langchain/agents/create-transaction-agent.ts` and `backend/src/services/create-transaction-from-text-service.ts` drive natural-language transaction creation.
- `frontend/src/views/Assistant.vue` and `frontend/src/composables/useCreateTransactionFromText.ts` expose those capabilities in the UI.

The recent git history shows this area is actively evolving for prompt tuning, abort support, voice-input handling, and input preservation on retry.

## Why the architecture is structured this way

Recent commits indicate a deliberate separation between UI behavior, AI orchestration, and core business services:

- `c97bcf64` added abort support for in-flight AI requests in the frontend.
- `9e98aa21` and earlier prompt-tuning commits refined voice input handling and transaction parsing.
- `c7cc1e11` moved runtime configuration into SSM-backed deployment/runtime inputs.

That history suggests the architecture is optimized for iterative AI workflow changes without entangling the repository’s core finance logic.

## Where to make changes

- Change GraphQL shape or resolver behavior: `backend/src/graphql/resolvers/`
- Change assistant or voice transaction behavior: `backend/src/langchain/` and `backend/src/services/`
- Change UI behavior: `frontend/src/components/`, `frontend/src/composables/`, and `frontend/src/views/`
- Change runtime resources or permissions: `infra-cdk/lib/`
