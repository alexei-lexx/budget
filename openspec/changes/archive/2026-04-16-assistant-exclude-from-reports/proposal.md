## Why

The AI assistant has no awareness of the `excludeFromReports` category property. It cannot see the field when listing categories, cannot set it when creating or updating categories, and does not factor it into spending or income calculations. This means the assistant may produce incorrect totals by including transactions the user explicitly excluded from reports.

## What Changes

- Expose the report-exclusion flag in the assistant's category data so it can see which categories are excluded
- Update the assistant's system prompt to explain the concept of report-excluded categories and instruct it to omit them from spending/income calculations
- Allow the assistant to set the report-exclusion flag when creating a category
- Allow the assistant to toggle the report-exclusion flag when updating a category
- Update category tool descriptions to explain the purpose of the flag
- Reuse the shared category DTO in the get-categories tool instead of a local interface

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- `assistant`: Add background knowledge about report-excluded categories and behavioral rules for excluding them from financial calculations; allow setting/toggling the flag via create and update category tools; update tool descriptions

## Impact

- `backend/src/langchain/agents/assistant-agent.ts` — system prompt changes
- `backend/src/langchain/tools/get-categories.ts` — return `excludeFromReports` via shared DTO
- `backend/src/langchain/tools/category-dto.ts` — add `excludeFromReports` to DTO
- `backend/src/langchain/tools/create-category.ts` — add optional `excludeFromReports` parameter
- `backend/src/langchain/tools/update-category.ts` — add optional `excludeFromReports` parameter, remove restriction
- Tests for all modified tools

## Constitution Compliance

- **Backend Layer Structure**: Changes stay within the existing tool/agent layer — no service or repository changes needed
- **Test Strategy**: All modified tool files have co-located test files that will be updated
- **Code Quality Validation**: Will run tests, typecheck, and format after implementation
