## Code Style

Follow `docs/code-style.md`.

## 1. MCP guide text

- [x] 1.1 In `backend/src/mcp/tools/guides.ts`, in `CREATE_TRANSACTION_INSTRUCTION`, move the `## Category` section so it appears before the `## Account` section, keeping both sections' content unchanged
- [x] 1.2 Update `backend/src/mcp/tools/guides.test.ts` if any existing assertion depends on `CREATE_TRANSACTION_INSTRUCTION` section order (currently none do — confirm before editing)

## 2. Inapp Assistant prompt

- [x] 2.1 In `backend/src/langchain/agents/create-transaction-agent.ts`, in `SYSTEM_PROMPT_TEMPLATE`, move the `### Category` section so it appears before the `### Account` section, keeping both sections' content unchanged
- [x] 2.2 (use `testing` skill) Update `backend/src/langchain/agents/create-transaction-agent.test.ts` and `create-transaction-agent.eval.test.ts` if any existing assertion depends on prompt section order (currently none do — confirm before editing)

## 3. Spec sync

- [x] 3.1 Confirm `openspec/changes/infer-category-before-account/specs/mcp-server/spec.md` matches the reordered guide text (field order: type, amount, category, account)

## 4. Validation

- [x] 4.1 Run `npm test` in `backend/` and fix any failures
- [x] 4.2 Run `npm run typecheck` and `npm run format` in `backend/` and fix any issues
- [x] 4.3 Run `npx prettier --write openspec/` to format the updated spec files

## Constitution Compliance

- No architectural, layering, or data-access principle applies — this change only reorders prompt/guide text in existing files.
- Test Strategy principle: no new unit-testable behavior is introduced (LLM prompt text is not deterministically assertable); existing repository/service tests are unaffected. Compliant.
- Code Quality Validation principle: tasks 4.1–4.2 cover the mandatory test/typecheck/lint pipeline. Compliant.
