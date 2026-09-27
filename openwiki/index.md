---
okf_version: "0.2"
---

# Files

- [System architecture](architecture.md) - End-to-end architecture for the Vue SPA, GraphQL/Lambda backend, Cognito authentication, DynamoDB persistence, and CloudFront/CDK deployment, including AI, Telegram, and MCP entry paths.
- [Data model and persistence](data-and-storage.md)
- [Domain](domain.md) - User-scoped finance concepts and invariants for accounts, categories, transactions, transfers, reports, assistant chat, Telegram bots, and persistence schemas.
- [Integrations and external systems](integrations.md) - External boundaries for authentication, AWS services, Bedrock/LangChain, MCP, Telegram, and the cloud infrastructure that exposes them.
- [Operations and configuration](operations.md) - Deployment, environment variables, SSM parameters, stack outputs, bootstrap requirements, and local setup for safely changing runtime and deployment configuration.
- [Quickstart](quickstart.md) - Start here to route to the smallest set of wiki pages for repo orientation, local setup, and subsystem-specific changes across backend, frontend, and infrastructure.
- [Testing and verification](testing.md) - Repository test entrypoints and how to choose the smallest useful verification scope for backend, frontend, and infrastructure changes.
- [Workflows and request flows](workflows.md) - End-to-end request and operator workflows for authentication, GraphQL calls, assistant chat, quick transaction entry, Telegram message handling, migrations, and deployment.

# Directories

- [architecture](architecture/)
- [concepts](concepts/)
- [integrations](integrations/)
- [operations](operations/)
- [testing](testing/)
- [workflows](workflows/)
