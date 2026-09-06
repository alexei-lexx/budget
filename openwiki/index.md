---
okf_version: "0.2"
---

# Files

- [Architecture](architecture.md) - End-to-end topology for the GraphQL backend, Vue frontend, and AWS CDK infrastructure, including Lambda dispatch, dependency injection, and client bootstrapping.
- [Data and Storage](data-and-storage.md) - DynamoDB-backed persistence boundaries, table purposes and keys, migration locking, TTL behavior, and repository-level integrity checks.
- [Domain Model](domain.md) - Finance, assistant, Telegram, and settings concepts enforced by the backend models and GraphQL schema, including embedded transaction behavior and key invariants.
- [Integrations](integrations.md) - External systems and protocol boundaries for authentication, API access, AWS services, Bedrock/LangChain, MCP, Telegram, and frontend/backend handoffs.
- [Operations](operations.md) - Runtime configuration, deployment-time inputs, local development setup, Lambda bootstrap behavior, and operational rules for safely changing and running the personal finance tracker.
- [OpenWiki quickstart](quickstart.md)
- [Testing](testing.md) - How the repository’s unit, repository, integration, eval, frontend, and infrastructure tests are organized, what each suite validates, and how to choose the narrowest useful validation for a change.
- [Workflows](workflows.md) - End-to-end request, chat, transaction, Telegram, and deployment flows across the backend and release tooling.
