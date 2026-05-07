# Generalize `jest-tests` skill into `testing` (Jest + Vitest)

## Goal

Rename the project skill `jest-tests` to `testing` and make its guidance applicable to both Jest and Vitest, so it remains usable when a package migrates from Jest to Vitest. Substance and structure are preserved; only runner-specific phrasing changes.

## Motivation

A package in this repo is being migrated to Vitest. The current skill encodes Jest-only APIs (`jest.Mocked<T>`, `jest.useFakeTimers()`, etc.) and is named after the runner. After migration, applying the skill to a Vitest test file would require the reader to mentally translate every reference. Generalizing now keeps a single source of truth for test conventions across runners.

## Out of scope

- Migrating any package (backend, frontend, infra-cdk) to Vitest.
- Adding or changing test dependencies in any `package.json`.
- Rewriting existing test files.
- Adding new sections (snapshots, coverage, e2e, etc.) — preserve the current scope of the skill.
- Updating historical plan docs (`docs/superpowers/plans/*.md`) or archived OpenSpec change tasks (`openspec/changes/archive/**`). These are dated artifacts and are left untouched.

## Changes

### 1. Rename skill directory and identifier

- Move: `.claude/skills/jest-tests/` → `.claude/skills/testing/`
- Update `SKILL.md` frontmatter:
  - `name: testing`
  - `description: Use when writing, rewriting, reviewing, adding, or modifying unit tests (Jest or Vitest).`
- Update H1 heading: `# testing`

### 2. Add a "Test runner" section near the top of SKILL.md

Insert immediately after the "Scope" section (and before "Test file location"). Content:

> Skill applies to both Jest and Vitest. Use the APIs of whichever runner the package uses (check `package.json`). The mapping table below covers every runner-specific call referenced in this skill.
>
> | concept | Jest | Vitest |
> |---|---|---|
> | mocked type | `jest.Mocked<T>` | `Mocked<T>` from `vitest` |
> | enable fake timers | `jest.useFakeTimers()` | `vi.useFakeTimers()` |
> | advance timers | `jest.advanceTimersByTime(ms)` | `vi.advanceTimersByTime(ms)` |
> | run all timers | `jest.runAllTimers()` | `vi.runAllTimers()` |
> | restore real timers | `jest.useRealTimers()` | `vi.useRealTimers()` |
> | auto-reset mocks (config) | `resetMocks: true` | `clearMocks: true` / `restoreMocks: true` |
> | module mock | `jest.mock(path)` | `vi.mock(path)` |

### 3. Surgical edits to existing sections

Only the runner-specific lines are touched. Everything else (file location, naming rules, describe nesting, structure per method, anatomy, async, scope) stays as-is.

- **"Timers and dates"** — replace `jest.useFakeTimers()` etc. with neutral wording: "Use the runner's fake timers (`jest.useFakeTimers()` / `vi.useFakeTimers()` — see mapping table)." Apply same neutralization to `advanceTimersByTime`, `runAllTimers`, `useRealTimers`.
- **"Test isolation"** — change `Reset mocks in beforeEach (or rely on resetMocks: true in Jest config).` to `Reset mocks in beforeEach (or via runner config: Jest resetMocks, Vitest clearMocks/restoreMocks).`
- **"Mocks and fakes"** — change "Jest mock objects" → "runner mock objects". Replace the `jest.Mocked<InterfaceName>` rule with "Use the runner's mocked type (`jest.Mocked<T>` for Jest, `Mocked<T>` from `vitest` for Vitest) when an interface is available."
- **"After writing"** — unchanged. `npm test -- <path>`, `npm run typecheck`, `npm run format` all work for both runners.

### 4. Reference example

`references/service.test.ts.md` — single annotated example.

- Keep the current Jest-flavored code as the primary example body.
- Add a short note at the top: "Example uses Jest. Vitest equivalents are shown as `// vitest:` annotations on the runner-specific lines. See SKILL.md mapping table."
- For each runner-specific line in the example, add an inline `// vitest: <equivalent>` comment immediately above it. In the current example this is limited to two `jest.Mocked<...>` declarations.

### 5. Live config update

- `openspec/config.yaml:26` — replace `jest-tests` with `testing` in the rule that prefixes test tasks. This is the only live config reference to the old skill name.

### Not changed (frozen history)

- `docs/superpowers/plans/2026-04-24-transaction-entity.md`
- `docs/superpowers/plans/2026-04-25-account-entity.md`
- `docs/superpowers/plans/2026-04-26-account-balance-denormalization.md`
- All `openspec/changes/archive/**/tasks.md` references

## Impact

- Existing skill consumers (`openspec/config.yaml` rules, future plans) reference the new `testing` name.
- Test conventions remain unchanged in substance — file names, directory rules, describe nesting, anatomy, etc.
- Jest-using packages: no behavioral change; Jest APIs still shown.
- Vitest-using packages (after migration): skill applies directly, with Vitest equivalents visible in mapping table and example annotations.

## Validation

After implementing:

1. `SKILL.md` H1, frontmatter `name`, and `description` reflect the new name.
2. Mapping table contains every Jest API previously named in the skill.
3. No remaining `jest.` API references in SKILL.md prose outside the mapping table or paired neutral wording.
4. `references/service.test.ts.md` carries a `// vitest:` annotation for every runner-specific line it contains.
5. `openspec/config.yaml` no longer references `jest-tests`; references `testing` instead.
6. `grep -rn "jest-tests" .claude/ openspec/config.yaml` returns no results. (Historical plans and archives are intentionally untouched.)
