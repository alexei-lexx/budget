---
name: github-pr
description: "Creates or updates a GitHub pull request with a properly formatted title and description. Use this skill whenever the user wants to open a PR, create a pull request, submit changes for review, update a PR's title or description, fix PR formatting, or rewrite PR content — even if they just say 'make a PR', 'open a PR', 'update the PR desc', or provide a PR number/URL to fix."
---

# github-pr

Create or update a GitHub pull request with a well-crafted title and description that communicates *what* changed and *why*.

## Step 1: Detect the PR context

Figure out whether a PR already exists or needs to be created.

If the user provided a PR number or GitHub URL, look it up directly:
```bash
gh pr view <number> --json number,title,body,baseRefName,isDraft,url
```

Otherwise, check if the current branch already has a PR:
```bash
gh pr view --json number,title,body,baseRefName,isDraft,url 2>/dev/null
```

- PR found → **update** it
- No PR found → **create** a new one

## Step 2: Determine the base branch

- Existing PR: use its current base branch
- New PR: use `main` unless the user explicitly specified otherwise

## Step 3: Analyze the changes

```bash
git log <base>..HEAD --oneline    # commits on this branch
git diff <base>..HEAD --stat      # files changed
git diff <base>..HEAD             # full diff
```

Also factor in any context the user provided — they often know things the diff alone won't show (e.g. "this fixes the login bug" or "this is for issue #42").

## Step 4: Write the title

- Lowercase except proper nouns and acronyms (API, URL, CDK, AWS, etc.)
- Imperative mood: `add`, `fix`, `update`, `remove`, `migrate`, `replace`, etc.
- Specific — describe the actual change, not a vague intent
- No trailing period

**Good:** `add start/end date filters to transaction list`
**Avoid:** `Update transaction page`, `Fix issue`, `Various improvements`

## Step 5: Write the description

- Focus on *what* and *why* — omit implementation details unless essential for understanding
- Concise and factual — no filler, no vague statements
- Avoid long paragraphs — break prose into short sentences
- Start each sentence on a new line
- Include required sections: `context`, `before`, `after`
- Use lowercase section headlines
- Write as a human developer — no mention of AI authorship
- If the branch addresses a GitHub issue, append `Close #<number>` after the last section (valid keywords: `Close`, `Fix`, `Resolve`)

### Sections

Include the following sections in the description:

```
## context
```

Brief explanation of the problem or need being addressed.

```
## before
```

- Current behavior or limitations in bullet points (ideally 3, max 5 bullet points)
- Use present tense and active voice

```
## after
```

- New behavior or improvements in bullet points (ideally 3, max 5 bullet points)
- Use present tense and active voice

### Examples

```
## context

Users have to manually refresh the page to see updates made by other users,
leading to stale data and confusion.

## before

- Users don't see changes from other users until they refresh
- Users work with outdated information
- Users must manually refresh to sync data

## after

- Users see changes from other users automatically
- Users work with current information
- Users don't need to manually refresh
```

## Step 6: Execute

**Creating a new PR** — draft by default:
```bash
gh pr create --draft --base <base> --title "<title>" --body "$(cat <<'EOF'
<description>
EOF
)"
```

Skip `--draft` only if the user explicitly asked for a non-draft PR.

**Updating an existing PR:**
```bash
gh pr edit <number> --title "<title>" --body "$(cat <<'EOF'
<description>
EOF
)"
```

- Overwrite title and description entirely
- Do not change the draft/ready status unless the user explicitly asked
- Output the PR URL after executing
