## 1. Update Create-Transaction Guide

- [x] 1.1 Confirm `guides.test.ts` and `load-guides.test.ts` need no changes: both assert against `GUIDES["create-transaction"].instruction` dynamically rather than fixed text, so no new test authoring is needed for this text-only edit
- [x] 1.2 In `backend/src/mcp/tools/guides.ts`, add a `## Receipts and Checks` section to `CREATE_TRANSACTION_INSTRUCTION`: allow the store/vendor name in the description as an exception to the `## Description` "no parties" rule, itemize purchases with quantity and unit of measure when legible, and never invent a store name, item, quantity, or unit that isn't legible
- [x] 1.3 Update the `## Description` section's "not the reason, parties, or context" rule to point to the new `## Receipts and Checks` exception instead of duplicating it

## 2. Validation

- [x] 2.1 Run `npm test` in `backend/` and confirm no regressions
- [x] 2.2 Run `npm run typecheck` and `npm run format` in `backend/` and resolve all issues
- [x] 2.3 Connect an MCP client to the running backend, call `load_guides` with `["create-transaction"]`, and confirm the returned `instruction` contains the store-name exception, the itemization rule, and the never-invent rule

## Constitution Compliance

**Applicable principles — compliant:**

- **Backend Layer Structure**: change stays entirely inside `backend/src/mcp/tools/guides.ts`, a static prompt constant; no resolver, service, or repository touched.
- **Test Strategy**: co-located tests are reused unchanged rather than restructured (task 1.1); no new test directory introduced.
- **TypeScript Code Generation standards**: edit stays inside the existing template-literal constant; no new types, names, or arguments introduced.
- **Code Quality Validation**: changed-file/full-suite tests, then typecheck and format, run in order (tasks 2.1–2.2).

**Not applicable:** Schema-Driven Development, GraphQL Pagination Strategy, Backend Service Layer, Backend Domain Entities, Backend Port Interfaces, Result Pattern, Database Record Hydration, Soft-Deletion, Data Migrations, Authentication & Authorization, Input Validation, UI Guidelines, Frontend Code Discipline, Finder Method Naming, Method Ordering, Vendor Independence.
