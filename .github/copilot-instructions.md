# GitHub Copilot

## CRITICAL: Constitution First

**Before any development work — read `docs/constitution.md`. Do this before invoking skills.**

This applies to all tasks involving project standards, code style, architecture, tech stack, test strategy, writing tests, or any implementation. The constitution defines the project's structure, coding standards, and technical constraints. Nothing overrides it.

## Communication Style

**Be concise.** Skip affirmations and preambles.

## Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly; if uncertain, ask
- If multiple interpretations exist, present them — don't pick silently
- If a simpler approach exists, say so; push back when warranted
- If something is unclear, stop and ask — name what's confusing

## Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked
- No abstractions for single-use code
- No "flexibility" or "configurability" that wasn't requested
- No error handling for impossible scenarios
- If you write 200 lines and it could be 50, rewrite it

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting
- Don't refactor things that aren't broken
- Match existing style, even if you'd do it differently
- If you notice unrelated dead code, mention it — don't delete it

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused
- Don't remove pre-existing dead code unless asked

The test: every changed line should trace directly to the user's request.

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

## Temporary Files

Write all temporary files (scratch scripts, debug output, ad-hoc data dumps)
to the project's `tmp/` directory — not the system `/tmp`.
Avoids permission prompts for paths outside the project.

## CRITICAL: Cloud Agent Setup

**Run at the start of every cloud session.** Skip if already set up.

- Use Node.js version from `.tool-versions` (`nodejs` key)
- Run `npm install` in any package you plan to modify (`backend/`, `frontend/`, `infra-cdk/`)

Before first backend test run:

```
cd backend
cp .env.test.example .env.test
npm run test:db:setup
```

## Reference

- `docs/constitution.md` — project structure, architecture, coding standards, technical constraints
- `docs/requirements.md` — business requirements and feature specifications

## OpenWiki

This repository has documentation located in the /openwiki directory.

Start here:

- [OpenWiki quickstart](openwiki/quickstart.md)

OpenWiki includes repository overview, architecture notes, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

When working in this repository, read the OpenWiki quickstart first, then follow its links to the relevant architecture, workflow, domain, operation, and testing notes.

## File Sync

These instruction files must stay in sync:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.github/copilot-instructions.md`

**When editing any of these files, update all the others to match.**
