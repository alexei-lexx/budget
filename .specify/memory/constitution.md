<!-- SYNC IMPACT REPORT
Version Change: 0.2.1 → 0.2.2 (PATCH: clarified all component sections as npm packages with concise descriptions)
Modified Sections: Backend, Frontend, Backend CDK, Frontend CDK (added npm package nature + function descriptions)
Added Sections: None
Removed Sections: None
Templates Requiring Updates: None required for this patch
Follow-up TODOs: Core Principles, additional sections, governance rules, ratification/amendment dates
-->

# Personal Finance Tracker Constitution

## Repository Structure

The project comprises four independent npm packages distributed across the repository:

- **backend/** – Apollo GraphQL server exposing the API for the frontend (Node.js/TypeScript), includes database integration
- **frontend/** – User-facing single-page application (Vue 3 + Vite + Vuetify)
- **backend-cdk/** – Deployable backend infrastructure (AWS CDK)
- **frontend-cdk/** – Deployable frontend infrastructure (AWS CDK)

Each package maintains its own `package.json`, dependencies, and build configuration. They are versioned and deployed independently while remaining architecturally coupled through shared GraphQL schema and deployment order requirements.

## Backend

An npm package providing Apollo GraphQL server and API implementation.

### Technologies
- **Language**: TypeScript
- **Framework**: Apollo Server, Node.js
- **Testing**: Jest
- **Quality**: ESLint, Prettier, TypeScript strict mode

## Frontend

An npm package providing the user-facing single-page application.

### Technologies
- **Language**: TypeScript
- **Framework**: Vue 3, Vite, Vuetify, Apollo Client
- **Testing**: Jest
- **Quality**: ESLint, Prettier, TypeScript strict mode, Vue type-checking

## Backend CDK

An npm package providing infrastructure-as-code for backend deployment to AWS.

### Technologies
- **Language**: TypeScript
- **Framework**: AWS CDK
- **Testing**: Jest
- **Quality**: ESLint, Prettier, TypeScript strict mode

## Frontend CDK

An npm package providing infrastructure-as-code for frontend deployment to AWS.

### Technologies
- **Language**: TypeScript
- **Framework**: AWS CDK
- **Testing**: Jest
- **Quality**: ESLint, Prettier, TypeScript strict mode

## Core Principles

### [PRINCIPLE_1_NAME]
<!-- Example: I. Library-First -->
[PRINCIPLE_1_DESCRIPTION]
<!-- Example: Every feature starts as a standalone library; Libraries must be self-contained, independently testable, documented; Clear purpose required - no organizational-only libraries -->

### [PRINCIPLE_2_NAME]
<!-- Example: II. CLI Interface -->
[PRINCIPLE_2_DESCRIPTION]
<!-- Example: Every library exposes functionality via CLI; Text in/out protocol: stdin/args → stdout, errors → stderr; Support JSON + human-readable formats -->

### [PRINCIPLE_3_NAME]
<!-- Example: III. Test-First (NON-NEGOTIABLE) -->
[PRINCIPLE_3_DESCRIPTION]
<!-- Example: TDD mandatory: Tests written → User approved → Tests fail → Then implement; Red-Green-Refactor cycle strictly enforced -->

### [PRINCIPLE_4_NAME]
<!-- Example: IV. Integration Testing -->
[PRINCIPLE_4_DESCRIPTION]
<!-- Example: Focus areas requiring integration tests: New library contract tests, Contract changes, Inter-service communication, Shared schemas -->

### [PRINCIPLE_5_NAME]
<!-- Example: V. Observability, VI. Versioning & Breaking Changes, VII. Simplicity -->
[PRINCIPLE_5_DESCRIPTION]
<!-- Example: Text I/O ensures debuggability; Structured logging required; Or: MAJOR.MINOR.BUILD format; Or: Start simple, YAGNI principles -->

## [SECTION_2_NAME]
<!-- Example: Additional Constraints, Security Requirements, Performance Standards, etc. -->

[SECTION_2_CONTENT]
<!-- Example: Technology stack requirements, compliance standards, deployment policies, etc. -->

## [SECTION_3_NAME]
<!-- Example: Development Workflow, Review Process, Quality Gates, etc. -->

[SECTION_3_CONTENT]
<!-- Example: Code review requirements, testing gates, deployment approval process, etc. -->

## Governance
<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

[GOVERNANCE_RULES]
<!-- Example: All PRs/reviews must verify compliance; Complexity must be justified; Use [GUIDANCE_FILE] for runtime development guidance -->

**Version**: 0.2.2 | **Ratified**: TODO(RATIFICATION_DATE) | **Last Amended**: 2025-10-26
