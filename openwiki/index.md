---
okf_version: "0.2"
---

# Files

- [System architecture](architecture.md) - End-to-end architecture for the Vue SPA, GraphQL/Lambda backend, Cognito authentication, DynamoDB persistence, and CloudFront/CDK deployment, including AI, Telegram, and MCP entry paths.
- [Data model and persistence](data-and-storage.md)
- [Domain model and concepts](domain.md) - Finance domain concepts, ownership boundaries, and invariants for users, accounts, categories, transactions, transfers, reports, assistant sessions, Telegram bots, and currency/date rules.
- [Integrations and external systems](integrations.md) - External boundaries for authentication, AWS services, Bedrock/LangChain, MCP, Telegram, and the adapters and infrastructure that isolate them from application code.
- [Operations and configuration](operations.md) - Deployment, environment variables, SSM parameters, stack outputs, bootstrap requirements, and local setup for safely changing runtime and deployment configuration.
- [OpenWiki quickstart](quickstart.md) - Entry point for the repository wiki. Use this page to route changes to the right architecture, workflow, operations, integration, and testing guide.
- [Testing and verification](testing.md) - Repository test entrypoints and how to choose the smallest useful test scope for backend, frontend, and infrastructure changes.
- [Workflows and request flows](workflows.md) - End-to-end request and operator workflows for authentication, GraphQL calls, assistant chat, quick transaction entry, Telegram message handling, migrations, and deployment.
