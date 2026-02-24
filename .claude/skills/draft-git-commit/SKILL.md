---
name: draft-git-commit
description: "Prepares a git commit message based on current changes. Use this skill whenever the user asks to commit, draft a commit, or suggest what to write in a commit."
---

# draft-git-commit

Prepare a git commit message for the current working tree.

## Workflow

### Step 1: Inspect the current state

Run `git status` to understand what's staged vs unstaged.

- If there are **staged files**, focus only on staged changes.
- If there are **no staged files**, treat all modified, added, and untracked files as the relevant changes.

### Step 2: Gather the diff

- **Staged only**: `git diff --cached`
- **All changes (nothing staged)**: `git diff HEAD` for tracked files; for untracked files, read each one directly to understand its content

### Step 3: Understand the changes

Read the diff and focus on:

- What changed and in which files
- Whether changes form a single logical unit or multiple distinct concerns
- The nature of the change (bug fix, new feature, refactor, config, etc.)

### Step 4: Write the commit message

**Subject line:**
- Lowercase (except proper nouns and acronyms)
- Imperative mood: "add", "fix", "update", "remove", "move", etc.
- 50 characters or fewer if possible
- No trailing period
- Be specific — avoid generic messages like "update" or "fix"

**Body (only when needed):**
- Skip the body if the subject line fully explains the change
- Add a body when there are multiple logical changes or the "why" isn't obvious
- Separate subject from body with a blank line
- Use bullet points; no blank lines between them
- Use normal text casing for bullet items (capitalize sentences, proper nouns, etc.) and active voice

**Human authorship:**
- Write as a human developer — no AI mentions, no AI co-authors

**Examples:**

```
add account creation modal
```

```
add delete account feature

- Add delete button to account list
- Confirm deletion with modal
- Update GraphQL mutation
```

```
fix account balance calculation

- Before, included pending transactions in balance
- After, only include completed transactions in balance
```

### Step 5: Present the result

Output the proposed commit message in a code block.

If the user asked to commit (not just draft), run the commit using a heredoc to preserve multi-line formatting:

```bash
git commit -m "$(cat <<'EOF'
subject line here

- Bullet one
- Bullet two
EOF
)"
```
