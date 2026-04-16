## 1. CategoryDto and get_categories

- [x] 1.1 Add `excludeFromReports` to `CategoryDto` in `category-dto.ts` and update `toCategoryDto`
- [x] 1.2 Update `category-dto.ts` tests (if any) or add assertions in existing tool tests that verify the field is present
- [x] 1.3 Replace local `CategoryData` interface in `get-categories.ts` with `CategoryDto & { recentDescriptions: string[] }`
- [x] 1.4 Update `get-categories.test.ts` — add test that `excludeFromReports` is returned in the response; update existing "required fields only" assertion to include the field

## 2. create_category tool

- [x] 2.1 Write test in `create-category.test.ts`: calling without `excludeFromReports` creates category with `excludeFromReports: false`
- [x] 2.2 Write test in `create-category.test.ts`: calling with `excludeFromReports: true` passes it to the service
- [x] 2.3 Add optional `excludeFromReports` boolean to the create schema, defaulting to `false`
- [x] 2.4 Update tool description to explain the flag's purpose

## 3. update_category tool

- [x] 3.1 Write test in `update-category.test.ts`: calling with `excludeFromReports: true` passes it to the service
- [x] 3.2 Write test in `update-category.test.ts`: calling without `excludeFromReports` does not include it in the service input
- [x] 3.3 Add optional `excludeFromReports` boolean to the update schema
- [x] 3.4 Update tool description — remove "not supported" restriction, explain the flag's purpose

## 4. System prompt

- [x] 4.1 Extend the Category paragraph in Background Knowledge to describe report-excluded categories (concept, not property name)
- [x] 4.2 Add a rule to Rules for Analysis and Calculations: exclude report-excluded categories from spending/income totals, mention the omission for report-related queries

## 5. Validation

- [x] 5.1 Run tests for all changed files individually
- [x] 5.2 Run full backend test suite
- [x] 5.3 Run typecheck and format

## Constitution Compliance

- **Test Strategy**: Tests written before implementation (TDD). All test files co-located next to source files.
- **Code Quality Validation**: Validation pipeline (changed file tests → full suite → typecheck/format) in task group 5.
- **Backend Layer Structure**: Changes stay within tool/agent layer, no service or repository modifications.
- **TypeScript Code Generation**: New schema fields use descriptive names and Zod types.
