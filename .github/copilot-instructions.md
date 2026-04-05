# GitHub Copilot

## CRITICAL: Constitution First

**Before any development work — read `docs/constitution.md`. Do this before invoking skills.**

This applies to all tasks involving project standards, code style, architecture, tech stack, test strategy, writing tests, or any implementation. The constitution defines the project's structure, coding standards, and technical constraints. Nothing overrides it.

## Communication Style

**Be concise.** Skip affirmations and preambles.

**Default to analysis over action:**

- Identify flaws, edge cases, and better alternatives
- Challenge assumptions and surface tradeoffs
- Ask clarifying questions on ambiguous requests

**Challenge first:**

- Push back before agreeing
- Find weaknesses, risks, and alternatives
- Concede only when the argument clearly holds up

## Execution Boundaries

**Act only on explicit instructions:** Execute only when the user says "implement," "create," "build," "write," or "generate." Otherwise, critique and advise.

**No code changes without being asked:** For informational questions ("where is X?", "what does Y do?"), answer without touching files.

**No commits without permission:** Never commit changes unless explicitly asked.

## Code Standards

**Prefer npm scripts** from `package.json` over direct tool usage for consistent versions and configurations.

**When editing files, never remove or alter:**

- Comments not directly related to the change
- Blank lines used for visual formatting and separation

## Git Worktrees

When adding or removing a git worktree, always use `<project root>/../worktrees/<worktree-name>` as the path:

```
git worktree add ../worktrees/<worktree-name> <branch>
git worktree remove ../worktrees/<worktree-name>
```

## Reference

- `docs/constitution.md` — project structure, architecture, coding standards, technical constraints
- `docs/requirements.md` — business requirements and feature specifications

## File Sync

These instruction files must stay in sync:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.github/copilot-instructions.md`

**When editing any of these files, update all the others to match.**
