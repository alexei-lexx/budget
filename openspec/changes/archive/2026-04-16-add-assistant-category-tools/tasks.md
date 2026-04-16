## 1. Extract `CategoryService` interface

- [x] 1.1 Extract a `CategoryService` interface from the concrete class in `backend/src/services/category-service.ts`, listing the public methods: `getCategoriesByUser`, `createCategory`, `updateCategory`, `deleteCategory`. Rename the class to `CategoryServiceImpl implements CategoryService`. Update imports in `backend/src/services/category-service.test.ts` and `backend/src/dependencies.ts`.
- [x] 1.2 Create `backend/src/utils/test-utils/services/category-service-mocks.ts` with a `createMockCategoryService` factory returning `jest.Mocked<CategoryService>`, following the `account-service-mocks.ts` pattern.
- [x] 1.3 Confirm existing tests pass after the refactor.

## 2. `CategoryDto`

- [x] 2.1 Write `backend/src/langchain/tools/category-dto.test.ts` covering: maps `id`, `name`, `type`, `isArchived` from a `Category` model.
- [x] 2.2 Implement `backend/src/langchain/tools/category-dto.ts` exporting `CategoryDto` interface and `toCategoryDto` mapper, following the `account-dto.ts` pattern.

## 3. `create_category` tool

- [x] 3.1 Write `backend/src/langchain/tools/create-category.test.ts` covering: calls `CategoryService.createCategory` with parsed `name`, `type`, and `excludeFromReports: false`; reads `userId` from agent runtime context (never from LLM input); returns the service result wrapped in `Success(...)`; propagates `BusinessError` from the service unchanged.
- [x] 3.2 Implement `backend/src/langchain/tools/create-category.ts` as a keyword-argument factory taking `{ categoryService }`. Define a zod schema for `name` and `type` (enum: INCOME, EXPENSE). Parse `userId` via `agentContextSchema.shape.userId.parse(config?.context?.userId)`. Write a tool description that states the tool's purpose and instructs the agent to first call `get_categories` and ask the user to confirm when the requested name is a semantic near-variant (pluralisation, typo, abbreviation, synonym) of an existing category.
- [x] 3.3 Confirm tests pass and no business-rule validation was duplicated at the tool layer.

## 4. `update_category` tool

- [x] 4.1 Write `backend/src/langchain/tools/update-category.test.ts` covering: calls `CategoryService.updateCategory` with `id` plus any of optional `name`/`type`; rejects input shapes containing `excludeFromReports` (schema-level); reads `userId` from agent runtime context; returns the service result wrapped in `Success(...)`; propagates `BusinessError` from the service unchanged.
- [x] 4.2 Implement `backend/src/langchain/tools/update-category.ts` as a keyword-argument factory taking `{ categoryService }`. Define a zod schema for `id`, optional `name`, optional `type` (no `excludeFromReports` field). Use `.strict()` to reject unknown fields. Write a tool description that states the tool's purpose, instructs the agent that it MUST obtain `id` by first calling `get_categories`, and instructs it to ask the user to confirm when the requested new name is a semantic near-variant of another existing category.
- [x] 4.3 Confirm tests pass and no business-rule validation was duplicated at the tool layer.

## 5. Assistant agent wiring

- [x] 5.1 Extend `backend/src/langchain/agents/assistant-agent.test.ts` to assert that `create_category` and `update_category` are registered on the assistant agent and receive `CategoryService` through the dependency-injection factory.
- [x] 5.2 Register the two new tools in `backend/src/langchain/agents/assistant-agent.ts`, injecting `CategoryService` (and updating the factory signature if needed). Add them to the `writeTools` array.
- [x] 5.3 Verify `backend/src/dependencies.ts` wires `CategoryService` into the assistant agent factory; update if not already injected.

## 6. End-to-end verification

- [x] 6.1 Run the backend test suite and confirm all new and existing tests pass.
- [x] 6.2 Run typecheck and linting (`npm run typecheck` and `npm run format` from the backend package root).

## Constitution Compliance

- **Backend Layer Structure**: New tools call `CategoryService`; no direct repository or database access is introduced. Compliant.
- **Backend Service Layer**: `CategoryService` gains no new public methods; existing methods are reused. The class is refactored into interface + impl. Compliant.
- **Input Validation**: All business-rule validation stays in `CategoryService`. Tool-layer zod schemas only restrict input shape (notably omitting `excludeFromReports`). Compliant.
- **Authentication & Authorization**: `userId` is read from the agent runtime context populated by authenticated callers (GraphQL resolver, Telegram service). Tools never accept `userId` from LLM input. Compliant.
- **Result Pattern**: Tools return service results wrapped in `Success(...)` and let `BusinessError` propagate, matching the existing tool precedent. Compliant.
- **Test Strategy**: Each new tool file has a co-located `.test.ts`. TDD order is enforced by task ordering (test task precedes implementation task within each tool group). `assistant-agent.test.ts` is extended for wiring. Compliant.
- **TypeScript Code Generation**: Tools use keyword-argument factories with object-destructured dependencies, descriptive names, no non-null assertions, no `as any`. Compliant.
- **Schema-Driven Development**: No GraphQL schema changes. Not applicable.
