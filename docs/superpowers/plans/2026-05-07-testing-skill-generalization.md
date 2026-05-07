# Generalize `jest-tests` skill into `testing` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Rename project skill `jest-tests` to `testing` and make all guidance applicable to both Jest and Vitest, preserving every existing rule in substance.

**Architecture:** Pure documentation refactor. Move skill directory, edit SKILL.md surgically, annotate the reference example, update one live config reference. No code, no tests, no dependency changes.

**Tech Stack:** Markdown (Claude Code skill files), YAML (OpenSpec config). Verified by `grep`.

**Spec:** `docs/superpowers/specs/2026-05-07-testing-skill-generalization-design.md`

---

## File Structure

- Move: `.claude/skills/jest-tests/` → `.claude/skills/testing/`
  - `SKILL.md` — frontmatter, H1, mapping table, neutralized prose
  - `references/service.test.ts.md` — annotated example
- Modify: `openspec/config.yaml` — replace `jest-tests` rule reference

Frozen (do not touch): `docs/superpowers/plans/2026-04-*.md`, `openspec/changes/archive/**`.

---

### Task 1: Rename skill directory

**Files:**
- Move: `.claude/skills/jest-tests/` → `.claude/skills/testing/`

- [x] **Step 1: Move the directory with `git mv`**

```bash
git mv .claude/skills/jest-tests .claude/skills/testing
```

- [x] **Step 2: Verify move**

```bash
ls .claude/skills/testing/
```

Expected output:

```
SKILL.md
references
```

And:

```bash
test ! -d .claude/skills/jest-tests && echo "old dir gone"
```

Expected: `old dir gone`

- [x] **Step 3: Commit**

```bash
git add -A .claude/skills/
git commit -m "rename jest-tests skill to testing"
```

---

### Task 2: Update SKILL.md frontmatter, description, and H1

**Files:**
- Modify: `.claude/skills/testing/SKILL.md` (lines 1–6)

- [x] **Step 1: Replace frontmatter block**

Old (lines 1–4):

```markdown
---
name: jest-tests
description: Use when writing, rewriting, reviewing, adding, or modifying Jest tests.
---
```

New:

```markdown
---
name: testing
description: Use when writing, rewriting, reviewing, adding, or modifying unit tests (Jest or Vitest).
---
```

- [x] **Step 2: Replace H1**

Old (line 6):

```markdown
# jest-tests
```

New:

```markdown
# testing
```

- [x] **Step 3: Verify**

```bash
head -7 .claude/skills/testing/SKILL.md
```

Expected: shows the new frontmatter and H1 above.

- [x] **Step 4: Commit**

```bash
git add .claude/skills/testing/SKILL.md
git commit -m "rename testing skill identifier and description"
```

---

### Task 3: Insert "Test runner" section after Scope

**Files:**
- Modify: `.claude/skills/testing/SKILL.md` (insert after the Scope section, before `## Test file location`)

- [x] **Step 1: Insert the new section**

Locate the line `## Test file location` and insert the following block immediately above it (separated from Scope above by one blank line and from "Test file location" below by one blank line):

```markdown
## Test runner

Skill applies to both Jest and Vitest. Use the APIs of whichever runner the package uses (check `package.json`). The mapping table below covers every runner-specific call referenced in this skill.

| Concept                   | Jest                            | Vitest                            |
| ------------------------- | ------------------------------- | --------------------------------- |
| Mocked type               | `jest.Mocked<T>`                | `Mocked<T>` from `vitest`         |
| Enable fake timers        | `jest.useFakeTimers()`          | `vi.useFakeTimers()`              |
| Advance timers            | `jest.advanceTimersByTime(ms)`  | `vi.advanceTimersByTime(ms)`      |
| Run all timers            | `jest.runAllTimers()`           | `vi.runAllTimers()`               |
| Restore real timers       | `jest.useRealTimers()`          | `vi.useRealTimers()`              |
| Auto-reset mocks (config) | `resetMocks: true`              | `clearMocks: true` / `restoreMocks: true` |
| Module mock               | `jest.mock(path)`               | `vi.mock(path)`                   |
```

- [x] **Step 2: Verify section position and content**

```bash
grep -n "^## " .claude/skills/testing/SKILL.md
```

Expected order (the new section appears second):

```
## Scope
## Test runner
## Test file location
## What to test
## What not to test
## Test naming
## Describe nesting
## Test structure per method
## Test anatomy
## Async tests
## Timers and dates
## Test isolation
## Mocks and fakes
## After writing
## Reference
```

- [x] **Step 3: Commit**

```bash
git add .claude/skills/testing/SKILL.md
git commit -m "add Test runner section with Jest/Vitest mapping table"
```

---

### Task 4: Neutralize "Timers and dates" section

**Files:**
- Modify: `.claude/skills/testing/SKILL.md` (the `## Timers and dates` section, originally lines 95–98 in the pre-rename file)

- [x] **Step 1: Replace section body**

Old:

```markdown
## Timers and dates

Use `jest.useFakeTimers()` when the code under test depends on `setTimeout`, `setInterval`, or `Date.now()`.
Advance time explicitly with `jest.advanceTimersByTime(ms)` or `jest.runAllTimers()`.
Restore real timers with `jest.useRealTimers()` in `afterEach`.
```

New:

```markdown
## Timers and dates

Use the runner's fake timers (`jest.useFakeTimers()` / `vi.useFakeTimers()` — see mapping table) when the code under test depends on `setTimeout`, `setInterval`, or `Date.now()`.
Advance time explicitly with `advanceTimersByTime(ms)` or `runAllTimers()` on the same namespace.
Restore real timers with `useRealTimers()` in `afterEach`.
```

- [x] **Step 2: Verify**

```bash
sed -n '/^## Timers and dates/,/^## /p' .claude/skills/testing/SKILL.md
```

Expected: prints the new section body, ending at the next `## ` heading. Confirm both `jest.useFakeTimers()` and `vi.useFakeTimers()` appear, and no bare `jest.advanceTimersByTime` / `jest.runAllTimers` / `jest.useRealTimers` remain in this section.

- [x] **Step 3: Commit**

```bash
git add .claude/skills/testing/SKILL.md
git commit -m "neutralize Timers and dates wording for Jest/Vitest"
```

---

### Task 5: Neutralize "Test isolation" section

**Files:**
- Modify: `.claude/skills/testing/SKILL.md` (the `## Test isolation` section)

- [x] **Step 1: Replace the `Reset mocks` line**

Old:

```markdown
Reset mocks in `beforeEach` (or rely on `resetMocks: true` in Jest config).
```

New:

```markdown
Reset mocks in `beforeEach` (or via runner config: Jest `resetMocks`, Vitest `clearMocks` / `restoreMocks`).
```

Leave the surrounding lines (`Tests must not share mutable state.` and `Avoid beforeAll for state that any test could mutate.`) unchanged.

- [x] **Step 2: Verify**

```bash
sed -n '/^## Test isolation/,/^## /p' .claude/skills/testing/SKILL.md
```

Expected: the section now mentions both Jest `resetMocks` and Vitest `clearMocks` / `restoreMocks`.

- [x] **Step 3: Commit**

```bash
git add .claude/skills/testing/SKILL.md
git commit -m "neutralize Test isolation wording for Jest/Vitest"
```

---

### Task 6: Neutralize "Mocks and fakes" section

**Files:**
- Modify: `.claude/skills/testing/SKILL.md` (the `## Mocks and fakes` section)

- [x] **Step 1: Replace the "Mocks" definition line**

Old:

```markdown
**Mocks** replace real dependencies (repositories, clients) with Jest mock objects whose return values can be controlled per test.
```

New:

```markdown
**Mocks** replace real dependencies (repositories, clients) with runner mock objects whose return values can be controlled per test.
```

- [x] **Step 2: Replace the two `jest.Mocked` rules at the bottom of the section**

Old:

```markdown
MUST type mocked dependencies with `jest.Mocked<InterfaceName>` when an interface is available.
MUST NOT use `ReturnType<typeof createMock...>` when an interface is available.
```

New:

```markdown
MUST type mocked dependencies with the runner's mocked type (`jest.Mocked<InterfaceName>` for Jest, `Mocked<InterfaceName>` from `vitest` for Vitest) when an interface is available.
MUST NOT use `ReturnType<typeof createMock...>` when an interface is available.
```

- [x] **Step 3: Verify**

```bash
sed -n '/^## Mocks and fakes/,/^## /p' .claude/skills/testing/SKILL.md
```

Expected: `runner mock objects` appears once; the mocked-type rule mentions both `jest.Mocked` and `Mocked<InterfaceName>` from `vitest`. The bottom-of-section text about `Reuse existing fakes`, the fakes paths, and the `Mock all dependencies` line are unchanged.

- [x] **Step 4: Commit**

```bash
git add .claude/skills/testing/SKILL.md
git commit -m "neutralize Mocks and fakes wording for Jest/Vitest"
```

---

### Task 7: Annotate the reference example with Vitest equivalents

**Files:**
- Modify: `.claude/skills/testing/references/service.test.ts.md`

- [x] **Step 1: Add an intro note above the existing code block**

Insert this paragraph before the opening fence (line 1) so the file starts with the note, then a blank line, then the existing ```typescript fence:

```markdown
> Example uses Jest. Vitest equivalents are shown as `// vitest:` annotations on runner-specific lines. See SKILL.md "Test runner" mapping table.
```

Resulting first 3 lines of file:

```markdown
> Example uses Jest. Vitest equivalents are shown as `// vitest:` annotations on runner-specific lines. See SKILL.md "Test runner" mapping table.

```typescript
```

- [x] **Step 2: Annotate the two `jest.Mocked` declarations**

Inside the code block, replace the two declaration lines (originally lines 3–4 of the file's TS code) so each carries a Vitest annotation immediately above it.

Old:

```typescript
  let mockWidgetRepository: jest.Mocked<WidgetRepository>;
  let mockExternalApiClient: jest.Mocked<ExternalApiClient>;
```

New:

```typescript
  // vitest: let mockWidgetRepository: Mocked<WidgetRepository>;
  let mockWidgetRepository: jest.Mocked<WidgetRepository>;
  // vitest: let mockExternalApiClient: Mocked<ExternalApiClient>;
  let mockExternalApiClient: jest.Mocked<ExternalApiClient>;
```

- [x] **Step 3: Verify**

```bash
head -10 .claude/skills/testing/references/service.test.ts.md
```

Expected: file starts with the intro note line, then a blank line, then the ```typescript fence, then `describe(...)`, then both `// vitest:` annotation lines paired with the two `jest.Mocked<...>` declarations.

```bash
grep -c "// vitest:" .claude/skills/testing/references/service.test.ts.md
```

Expected: `2`

```bash
grep -c "jest.Mocked" .claude/skills/testing/references/service.test.ts.md
```

Expected: `2` (declarations preserved unchanged).

- [x] **Step 4: Commit**

```bash
git add .claude/skills/testing/references/service.test.ts.md
git commit -m "annotate testing skill example with Vitest equivalents"
```

---

### Task 8: Update live OpenSpec config reference

**Files:**
- Modify: `openspec/config.yaml:26`

- [x] **Step 1: Replace the `jest-tests` reference**

Old (line 26):

```yaml
    - Prefix every task that writes or modifies tests with "(use `jest-tests` skill)" after the task number
```

New:

```yaml
    - Prefix every task that writes or modifies tests with "(use `testing` skill)" after the task number
```

- [x] **Step 2: Verify**

```bash
grep -n "jest-tests\|testing.*skill" openspec/config.yaml
```

Expected: a single match on line 26 referencing `` `testing` skill ``, and no remaining `jest-tests` matches.

- [x] **Step 3: Commit**

```bash
git add openspec/config.yaml
git commit -m "update openspec rule to reference testing skill"
```

---

### Task 9: Final validation

**Files:** none modified.

- [x] **Step 1: No stale `jest-tests` references in live locations**

```bash
grep -rn "jest-tests" .claude/ openspec/config.yaml
```

Expected: no output (exit code 1). Historical plans and archives are intentionally untouched and not in this scope.

- [x] **Step 2: Mapping table contains every previously named Jest API**

```bash
for token in 'jest.Mocked' 'jest.useFakeTimers' 'jest.advanceTimersByTime' 'jest.runAllTimers' 'jest.useRealTimers' 'resetMocks' 'jest.mock'; do
  grep -q "$token" .claude/skills/testing/SKILL.md && echo "ok: $token" || echo "MISSING: $token"
done
```

Expected: `ok:` for all seven tokens.

- [x] **Step 3: All Jest tokens have a Vitest counterpart in the document**

```bash
for token in 'vi.useFakeTimers' 'vi.advanceTimersByTime' 'vi.runAllTimers' 'vi.useRealTimers' 'clearMocks' 'restoreMocks' 'vi.mock' 'Mocked<T>'; do
  grep -q "$token" .claude/skills/testing/SKILL.md && echo "ok: $token" || echo "MISSING: $token"
done
```

Expected: `ok:` for all eight tokens.

- [x] **Step 4: Reference example carries the intro note and Vitest annotations**

```bash
head -1 .claude/skills/testing/references/service.test.ts.md | grep -q "vitest:" && echo "ok: intro note"
test "$(grep -c '// vitest:' .claude/skills/testing/references/service.test.ts.md)" = "2" && echo "ok: 2 annotations"
```

Expected:

```
ok: intro note
ok: 2 annotations
```

- [x] **Step 5: Skill directory rename committed cleanly**

```bash
git log --oneline -10
```

Expected: visible commits for the rename, frontmatter, mapping table, three neutralization edits, reference annotations, and config update. Tree is clean:

```bash
git status
```

Expected: `nothing to commit, working tree clean`.

- [x] **Step 6: No further action — plan complete**

If any step above fails, fix the corresponding earlier task and re-run validation.
