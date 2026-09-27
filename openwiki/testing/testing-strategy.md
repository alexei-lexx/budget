---
type: testing strategy
title: Testing Strategy
description: How the repository layers unit, repository, integration, eval, frontend, and infrastructure tests, and which narrow test set to run for a change.
tags: [testing, strategy, unit-tests, integration-tests, repositories, evals, infrastructure]
verified:
  - by: openwiki/0.6.0
    at: 2026-09-27T13:28:59.762Z
sources:
  - id: openwiki-source-9a7277933ab0110af5cb7cbe
    resource: repo://backend/package.json
  - id: openwiki-source-7e91cba95e9b8553ea304739
    resource: repo://backend/src/lambdas/mcp-handler.test.ts
  - id: openwiki-source-55d3085d98e28003ae174736
    resource: repo://backend/src/mcp/server.test.ts
  - id: openwiki-source-7c6386d0abce169906825b0d
    resource: repo://backend/src/repositories/dyn-user-repository.test.ts
  - id: openwiki-source-e072acb019bcb88a55bb8756
    resource: repo://backend/src/server.test.ts
  - id: openwiki-source-25db427c1811bc00c2e7a9b3
    resource: repo://backend/src/services/assistant-chat-service.test.ts
  - id: openwiki-source-1047363cf615000e4c9bb694
    resource: repo://frontend/package.json
  - id: openwiki-source-b66e879cdda3db105489092f
    resource: repo://frontend/src/components/AgenticInput.test.ts
  - id: openwiki-source-b4616ec9243b6c4bf9f63160
    resource: repo://frontend/src/composables/useAssistant.test.ts
  - id: openwiki-source-8c5b5dad189ab833d33fad1e
    resource: repo://frontend/src/composables/useCreateTransactionFromText.test.ts
  - id: openwiki-source-3bdebe34c813d613d3487b78
    resource: repo://frontend/src/lib/appStorage.test.ts
  - id: openwiki-source-f4a2ce27725d9eae2abac014
    resource: repo://infra-cdk/package.json
  - id: openwiki-source-0e2214799c80b96b369330f3
    resource: repo://infra-cdk/test/auth-cdk.test.ts
  - id: openwiki-source-76158408444ea2b1b27970df
    resource: repo://infra-cdk/test/backend-cdk.test.ts
  - id: openwiki-source-2597ce68e6c1e7116586939a
    resource: repo://infra-cdk/test/frontend-cdk.test.ts
generated: { by: "openwiki/0.6.0", at: "2026-09-27T13:28:59.762Z" }
---

# Testing Strategy

This repository is organized around a narrow-validation workflow: make the smallest test run that exercises the changed boundary, then widen only if the failure output suggests the bug crosses a layer. The package scripts and test files show six practical test scopes: backend unit tests, backend repository tests, backend integration tests, backend evals, frontend tests, and infrastructure tests.

## How to choose the narrowest validation

Start from the layer your change touches:

- **Pure domain logic or small service behavior**: run the backend unit tests for the affected module or service. These tests are usually fast, isolated, and built around mocked repositories or providers.
- **DynamoDB persistence, query shape, pagination, or hydration behavior**: run backend repository tests. These are the narrowest tests that prove the adapter still translates between domain objects and stored records correctly.
- **Cross-repository workflows, Lambda wiring, or request/response boundaries**: run backend integration tests when the change needs real wiring across multiple collaborators.
- **Assistant-quality or prompt/agent behavior**: run backend evals rather than only unit tests, because the observable contract is the assistant output and trace, not just internal call counts.
- **Vue composables and browser-side orchestration**: run the relevant frontend composable or component tests.
- **CDK synthesis and infrastructure shape**: run the infra-CDK tests that assert template structure and resource properties.

If a test fails, its output matters most when it tells you which boundary moved: a repository test failure usually means a persistence contract changed, while a unit test failure usually means a local invariant or control-flow expectation changed. Use that signal to decide whether to stay narrow or add the next wider layer.

## Backend test layers

The backend package exposes separate scripts for the layers that matter most:

- `npm run test:unit` runs Vitest project `unit`
- `npm run test:repositories` runs Vitest project `repositories`
- `npm run test:integration` runs Vitest project `integration`
- `npm run test:evals` runs Vitest project `evals`
- `npm run test` runs the default unit and repository set
- `npm run test:coverage` collects coverage for the unit and repository projects

That split is intentional. The backend needs to protect both local business logic and persistence contracts, but those failures are easier to reason about when the suite is separated by layer instead of lumped into one big command.

### Unit tests

Backend unit tests are the fastest feedback loop for service rules, model invariants, and helper behavior. They usually mock repositories, transport clients, or other service dependencies and assert the observable result of one function or class.

Good unit-test changes include:

- new validation rules in a service or model
- new branching in a command handler or helper
- changes to error mapping or return-shape normalization
- small dependency-injection or utility changes

Representative fixtures and mocks matter here. The backend test suite already uses fake models and dedicated repository/service mocks, which keeps tests focused on behavior instead of setup noise. That pattern makes refactors safer because the test expresses the contract directly rather than depending on live infrastructure.

### Repository tests

Repository tests protect the persistence boundary. They are the right place to verify query composition, pagination, hydration, conditional writes, and corruption handling against DynamoDB-adapter behavior.

Use repository tests when a change affects:

- sort keys, filters, or index use
- pagination cursors or result ordering
- data hydration from persistence records into domain objects
- update/create/delete mapping to stored attributes
- explicit handling of malformed or incomplete stored data

These tests are the narrowest validation for data-layer changes because they fail close to the adapter. If a repository test breaks, the fix is usually in the repository or its schema mapping, not in a higher service layer.

### Integration tests

Backend integration tests cover workflows that need more than one layer working together. They are the right choice when the change spans services, handlers, or runtime wiring and you want confidence that the pieces compose correctly.

Use them for changes such as:

- request-path assembly across a handler and a service
- multi-step flows that persist and then read back data
- auth or context wiring that needs several collaborators
- changes that are too cross-cutting for a single unit test but still need deterministic local execution

The integration suite is where boundary tests become especially valuable: a representative happy-path fixture plus one or two failure cases usually prove the contract without enumerating every branch.

### Eval tests

Backend evals exist for assistant behavior that cannot be safely reduced to deterministic unit assertions alone. The `test:evals` script is the repo’s dedicated place for those checks, and it keeps model-facing behavior separate from ordinary logic tests.

Use evals when the change alters:

- prompt construction or agent orchestration
- response quality expectations
- tool-selection behavior
- trace or reasoning outputs that need semantic validation

Because evals are more expensive and less deterministic than unit or repository tests, they should be used as the narrowest meaningful signal for AI-facing changes, not as the default for ordinary code paths.

### Backend coverage command

`npm run test:coverage` combines unit and repository projects. That is the right command when you want a broader confidence sweep after a change has already passed the narrower focused test. It is not the first choice for local iteration because it trades speed for breadth.

## Frontend test layers

The frontend package has a single default Vitest entrypoint, `npm test`, plus watch and coverage variants. The test organization is centered on composables and stateful UI helpers rather than on a large number of end-to-end browser flows.

The most valuable frontend tests are the ones that pin down:

- request lifecycle and abort handling in composables
- session persistence and storage behavior
- auth-adjacent or route-adjacent state transitions
- component behavior that would otherwise be hidden behind generated GraphQL hooks

Use the narrowest composable or component test for the changed behavior first. If the failure is in a mock expectation, that usually means the orchestration contract changed. If it is in a rendered state or storage assertion, the issue is likely in browser-side lifecycle or persistence.

## Infrastructure test layers

The infrastructure package also uses Vitest, but the tests are CDK assertions rather than runtime execution.

Run `npm test` in `infra-cdk` when a change affects stack shape, resource counts, output wiring, or deployment assumptions. These tests protect the synthesized CloudFormation template, which is the real contract for deployment.

The existing infrastructure tests show the pattern well:

- one test checks that the backend stack synthesizes the HTTP API
- one group checks backup vault, plan, selection, and table tagging behavior
- the sibling stack tests cover auth configuration and frontend deployment shape

For infrastructure changes, a boundary test usually means asserting the smallest stable template property that proves the contract: resource count, required property value, or explicit reference between stacks. That keeps the test resilient to harmless CDK churn while still catching behavioral drift.

## What to update for common change types

Use this as a practical starting map:

- **Model validation or service logic**: backend unit tests
- **Repository mapping, indexes, TTLs, pagination, or hydration**: backend repository tests
- **Request handlers, flow orchestration, or multi-collaborator behavior**: backend integration tests
- **Assistant prompt, tool use, or response quality**: backend evals, plus unit tests for deterministic helper logic
- **Vue composable behavior, aborts, or local persistence**: frontend composable tests
- **Shared UI components that depend on composables or generated hooks**: frontend component tests
- **CDK resources, stack outputs, routing, or backup policy**: infrastructure tests

When a change spans more than one of these categories, update the narrowest tests first and then add only the next wider test that proves the contract across the boundary.

## Why representative fixtures and mocks matter

The repository’s tests rely on representative fixtures, fake models, and mock repositories/services to keep the signal high. That approach is especially useful at boundaries:

- a fake domain object makes a service test deterministic without hiding the service contract
- a mock repository isolates service logic from persistence details
- a protocol-level test, such as the MCP server test, proves behavior through the real interface instead of a private accessor
- a template assertion on a synthesized stack proves deployment shape without booting AWS

This is what makes the suite safe for refactoring. When the test fixture is representative, you can change internals confidently while still catching changes that matter to callers.

## Practical rule of thumb

If you are unsure which suite to run, pick the smallest test that can fail for the exact contract you changed:

- business rule changed: unit test
- storage contract changed: repository test
- flow across collaborators changed: integration test
- AI output quality changed: eval test
- browser orchestration changed: frontend composable/component test
- stack shape changed: infrastructure test

That discipline keeps feedback fast and makes failure output more actionable, because each suite is answering a different question about the system.
