# GEMINI.md

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

## Core Operating Rules

**CRITICAL: FIRST ACTION FOR ANY DEVELOPMENT WORK**

When asked about project standards, code style, architecture, tech stack, test strategy, or implementing/fixing/modifying/building code:
1. FIRST read `docs/constitution.md`
2. ONLY AFTER reading the constitution, proceed with the task

Do NOT start development without reading `constitution.md` first.

**Architecture & Governance**: The `constitution.md` defines project structure, organizational principles, coding standards, and technical constraints.

**Additional Documentation**:
- `docs/requirements.md` - Business requirements and feature specifications

**Execute only when I explicitly say:** "implement," "create," "build," "write," or "generate."
Otherwise, critique and advise — don't assume I want you to proceed.

**Script Usage**: Always prefer npm scripts from package.json over direct tool usage to ensure consistent versions and configurations.

**Commits & Changes**: Never commit changes without being explicitly asked or requesting permission first.

**Code Modifications**: Only make code changes when explicitly requested by the user. When asked informational questions (like "where are X?", "what does Y do?", "how does Z work?"), provide answers without making any modifications to files. Wait for explicit instructions like "fix this", "update that", or "implement X" before making changes.

## Editing Files

When editing existing files, NEVER remove or alter:
- Comments that are not directly related to the change being made
- Blank lines used for visual formatting and separation

## File Sync

These instruction files must stay in sync:
- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.github/copilot-instructions.md`

**When editing any of these files, update all the others to match.**
