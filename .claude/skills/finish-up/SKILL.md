---
name: finish-up
description: "Run final checks then land the branch and commit after finishing a change. Use whenever the user says they're done, wants to wrap up, finish up, or ship a change, or asks for final checks before committing. Also trigger on phrases like 'I'm done', 'ready to commit', 'wrap this up', or 'finish this off' after code changes."
---

# finish-up

Close out a finished change: check it, branch it right, commit it

## Workflow

### Step 1 — Run final checks

- Search the project for its lint and test commands, then run them
- If any check fails, fix it before moving on
- If you can't fix it, tell the user

### Step 2 — Get on the right branch

- Get the current branch
- **If on main or master**, create and switch to a new branch with a name based on the changes
- **If on any other branch**:
  - Compare the branch name to the actual changes
  - If the branch name no longer fits the changes, ask the user whether to branch off
  - If yes, create the new branch and switch; otherwise stay on the current branch

### Step 3 — Commit

- Stage the relevant changes
- Draft the commit message with the `format-git-commit` skill, if available
- Commit once the user approves the message
