# Integrations and external services

## Authentication

Authentication is based on AWS Cognito and JWT validation.

Evidence:

- `infra-cdk/lib/auth-cdk-stack.ts` provisions auth infrastructure.
- `backend/src/auth/jwt-auth.ts` validates incoming JWTs and builds the auth context.
- `frontend/src/plugins/auth.ts` integrates auth into the Vue app.
- `backend/src/server.ts` calls `resolveJwtAuthService()` when creating request context.

The README and recent git history show auth-related configuration is also driven by SSM and deployment-time URLs.

## AI / Bedrock / LangChain

The assistant and quick-entry features rely on LangChain and AWS Bedrock.

Evidence:

- `backend/src/langchain/langchain-agent.ts` configures the generic agent runtime.
- `backend/src/langchain/agents/assistant-agent.ts` defines assistant behavior and tools.
- `backend/src/langchain/agents/create-transaction-agent.ts` handles natural-language transaction creation.
- `infra-cdk/lib/backend-cdk-stack.ts` grants `bedrock:InvokeModel` permissions to the Lambdas.
- `backend/package.json` includes `@aws-sdk/client-bedrock-runtime`, `@langchain/aws`, `@langchain/core`, and `langchain`.

The assistant prompt is intentionally finance-specific, with rules for spending, refunds, transfers, excluded categories, and archived data.

## Telegram

Telegram is a first-class integration rather than a side demo.

Evidence:

- `backend/src/services/telegram-bot-service.ts`
- `backend/src/services/process-telegram-message-service.ts`
- `backend/src/providers/http-telegram-api-client.ts`
- `backend/src/lambdas/telegram-webhook-handler.ts`
- `backend/src/graphql/resolvers/telegram-bot-resolvers.ts`
- `openspec/specs/telegram-bot-integration/spec.md`

The CDK stack gives the backend Lambda a `TELEGRAM_BOTS_TABLE_NAME` and the repository includes a webhook-secret lookup index for routing webhooks back to the right user.

## GraphQL client/server boundary

The frontend uses Apollo Client and generated TypeScript artifacts.

Evidence:

- `frontend/src/apollo.ts`
- `frontend/src/graphql/*`
- `frontend/src/__generated__/vue-apollo.ts`
- `frontend/package.json` scripts for code generation and build
- `backend/src/graphql/schema.graphql`

The frontend copies the backend schema before code generation, which keeps the client types aligned with the server schema.

## Voice input and assistant trace UI

Recent work in git shows the product has an interactive, agentic input experience:

- `frontend/src/components/AgenticInput.vue`
- `frontend/src/components/AgentTracePanel.vue`
- `frontend/src/components/AgentTraceTriggerButton.vue`
- `frontend/src/composables/useVoiceInput.ts`
- `frontend/src/composables/useAssistant.ts`
- `frontend/src/composables/useCreateTransactionFromText.ts`

This area is where voice vs keyboard input, abort handling, and trace surfacing all intersect.

## Custom domain and hosting

The frontend is hosted on CloudFront and optionally attached to a user-provided domain.

Evidence:

- `infra-cdk/lib/frontend-cdk-stack.ts`
- `README.md` deployment and custom-domain instructions
- `docs/screenshots/` for published marketing/usage screenshots

The custom-domain flow depends on Route 53 hosted-zone lookup and an ACM certificate in `us-east-1`.
