---
name: generate-typescript-code
user-invocable: false
description: >
  Generate TypeScript code with strict type safety, descriptive naming, consistent method ordering,
  and a post-change validation pipeline. Use this skill whenever you are writing, generating, or
  reviewing TypeScript code — including new files, new classes, new methods, or any refactoring.
---

# TypeScript Code Generation

Apply these rules whenever you write or generate TypeScript code.

## Type Safety

- **No non-null assertions** (`!`) unless genuinely unavoidable — add a comment explaining why
- **No type assertions** (`as any` or `as SomeType`) unless genuinely unavoidable — add a comment explaining why
- **No unnecessary type narrowing** — avoid `typeof`, null-checks, or undefined-checks when the declared type already makes them redundant

## Naming

Use descriptive, full-word names everywhere: variables, methods, parameters, and types.

- **No single-character names** except loop indices (`i`, `j`, `k`)
- **No abbreviations** that obscure meaning (`usr` → `user`, `tx` → `transaction`, `cfg` → `config`, `mgr` → `manager`)
- **No shortened forms** — spell it out even when it feels verbose
- Clarity beats brevity — a slightly longer name is better than a cryptic short one

## Method Ordering

Within every class, order methods by these rules (earlier rules take precedence):

1. **Public before private** — all public methods come before all private methods
2. **Reads before writes** (for CRUD classes):
   - Reads (in order): find-one, find-many, other reads (aggregations, calculations)
   - Writes (in order): create-one, create-many, update-one, update-many, delete-one, delete-many
3. **Stepdown Rule** — a method must appear above any private helpers it calls

**Test files**: `describe` blocks must mirror the method order of the source class.

## Post-Change Validation

Before running any validation, read the project's `package.json` to discover available scripts and
installed dev dependencies (test runner, formatter, linter). Use those scripts throughout.

Run this sequence and fix any failures before finishing:

1. **Test the changed file** (if a test file exists for it — e.g. `.test.ts`, `.spec.ts`, `.test.tsx`):
   - Use the project's single-file test command (check `package.json` scripts and test runner)
2. **Full test suite** (skip step 1 if no test file exists):
   - Use the project's test script
3. **Typecheck** (skip steps 1–2 if no test suite):
   - Use the project's typecheck script or `tsc --noEmit` directly
4. **Format**:
   - Use the project's format script if present (Prettier, dprint, etc.)
5. **Lint**:
   - Use the project's lint script if present (ESLint, Biome, etc.)

Fix every error before considering the task complete. Do not leave failing tests or type errors.
