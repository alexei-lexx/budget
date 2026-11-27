# GEMINI.md

## CRITICAL: Constitution First

**Before any development work — read `docs/constitution.md`. Do this before invoking skills.**

This applies to all tasks involving project standards, code style, architecture, tech stack, test strategy, writing tests, or any implementation. The constitution defines the project's structure, coding standards, and technical constraints. Nothing overrides it.

## Code Style

Code style rules (naming, formatting, and similar conventions) live in `docs/code-style.md`.

## Communication Style

**Be concise.** Skip affirmations and preambles.

## Writing Style

Apply to docs, code comments, and skills.

- Use ASD Simplified Technical English (ASD-STE100)
- Prefer short sentences over long compound ones
- Use common words over rare ones
- Avoid vague and filler phrases
- One sentence per bullet, no period at the end
- Write impersonally

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

## Development Workflow

Use the `openspec` CLI for spec-driven development of features, fixes, and other behavior changes.

## Git Worktrees

- Worktrees are in `.worktrees/`
- Add and remove git worktrees with the scripts, not with `git worktree`
  - `scripts/worktree-add.sh <branch>`
  - `scripts/worktree-remove.sh <branch>`
- See `docs/worktrees.md`

## Agent Setup

Update `.agents/setup`, `.agents/resume`, and `.amp/services.yaml` when a change affects how an Amp sandbox installs, builds, tests, or runs the project.

## Temporary Files

Write all temporary files (scratch scripts, debug output, ad-hoc data dumps)
to the project's `tmp/` directory — not the system `/tmp`.
Avoids permission prompts for paths outside the project.

## Additional Documentation

- `docs/requirements.md` — business requirements and feature specifications

## File Sync

These instruction files must stay in sync:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.github/copilot-instructions.md`

**When editing any of these files, update all the others to match.**
