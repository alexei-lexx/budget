---
name: check-constitution-compliance
description: "Assess current working directory changes, a pull request, or a branch for compliance with the project constitution. Use when the user wants to review changes against architecture rules, coding standards, or any constitution principle — even if they just say 'check compliance', 'review against constitution', or 'does this follow the rules'."
---

# check-constitution-compliance

Assess changes for compliance with every principle in `docs/constitution.md`.

## Step 1: Determine the target

Parse the user's input to determine what to assess:

- **No argument or "workdir"**: assess uncommitted changes in the working directory
- **PR number or URL**: assess the diff of that pull request
- **Branch name**: assess committed changes on that branch vs its merge base (detect via `git merge-base HEAD <branch>` or fall back to the default branch)

## Step 2: Collect the diff

**Workdir (no argument)**:
```bash
git status
git diff HEAD          # tracked modifications
```
For untracked files, read each new file directly.

**Pull request**:
```bash
gh pr diff <number>
gh pr view <number> --json title,body,headRefName,baseRefName
```

**Branch**:
```bash
git log <default-branch>..<branch> --oneline
git diff <default-branch>..<branch>
```

## Step 3: Read the constitution

Read `docs/constitution.md` in full.

Read the constitution top to bottom and extract every assessable principle — any section, rule, or guideline that imposes a constraint on the codebase or process.

## Step 4: Assess each principle

For each principle in the list above:

**Determine applicability**:
- If no changed files are in scope for this principle, mark **N/A** with a one-line reason.

**Assess compliance**:
- Read the relevant changed code/files carefully.
- Check every specific rule in the principle against the actual changes.
- If all rules are satisfied (or no rules are violated): mark **PASSED**.
- If any rule is violated: mark **FAILED**.

**For each FAILED principle**:
- Describe exactly what rule is violated and what was found instead
- Classify the violation based on how the constitution frames the rule:
  - **MAJOR** — the constitution presents the rule as strict or critical (architecture, security, data integrity)
  - **MINOR** — the constitution presents it as a guideline or recommendation

**Scope heuristics**:
- For each principle extracted from the constitution, use its own rules and stated scope to determine whether the changed files are in scope.
- Do not assume which principles apply — derive applicability from the principle's own description and the changed files.

## Step 5: Output the compliance report

Use this format exactly:

---

```
# Constitution Compliance Report

<1-2 sentence summary of what the change does>
```

Then, grouped by constitution section, list every principle with its result:

```
## <Section Name>

- ✅ <Principle> — passed
- ⬜ <Principle> — N/A: <one-line reason>
- ❌ <Principle> — MAJOR: <one-line reason>
- ❌ <Principle> — MINOR: <one-line reason>
```

Every principle from the constitution must appear. No principle may be silently skipped.

---

After all sections, detailed findings for every FAILED principle:

```
## Violations

### ❌ <Principle Name> — MAJOR

**Rule**: <quote the specific rule from the constitution>
**Found**: <what the change actually does — describe the pattern, not individual lines>
```

If there are zero violations, output instead:

```
## Result: ✅ All applicable principles passed
```

---

## Assessment Rules

- **Never mark N/A to avoid work.** Only mark N/A when the principle genuinely cannot apply to the change.
- **Be specific.** Every FAILED finding must describe the violation clearly. Never write "may violate" or "consider reviewing."
- **Re-read the constitution rule before assessing.** Don't rely on memory of the rule.
- **Severity follows the constitution's own framing.** Rules the constitution presents as strict or critical are MAJOR; those presented as guidelines or recommendations are MINOR.
- **Check non-code artifacts too.** If specs, documentation, or process artifacts changed, assess them against the constitution's architectural principles as well.
