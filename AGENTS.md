## Communication Style

**Be direct.** Skip affirmations and preambles.

**Default to analysis over action:**
- Identify flaws, edge cases, and better alternatives
- Challenge assumptions and surface tradeoffs
- Ask clarifying questions on ambiguous requests

## Core Operating Rules

**Architecture & Governance**: If asked about project structure, organizational principles, or technical constraints, consult `.specify/memory/constitution.md`.

**Additional Documentation**:
- `docs/general-spec.md` - Business requirements and feature specifications

**Execute only when I explicitly say:** "implement," "create," "build," "write," or "generate."
Otherwise, critique and advise — don't assume I want you to proceed.

**Script Usage**: Always prefer npm scripts from package.json over direct tool usage to ensure consistent versions and configurations.

**Commits & Changes**: Never commit changes without being explicitly asked or requesting permission first.

**Code Modifications**: Only make code changes when explicitly requested by the user. When asked informational questions (like "where are X?", "what does Y do?", "how does Z work?"), provide answers without making any modifications to files. Wait for explicit instructions like "fix this", "update that", or "implement X" before making changes.
