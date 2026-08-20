---
name: format-github-pr
description: "Formats a GitHub pull request title and description. Use this skill whenever the user is about to create a PR, open a pull request, submit changes for review, or when asked to improve, format, clean up, rewrite, or polish a PR title or description — even if they just say 'make a PR', 'open a PR', 'update the PR desc', or provide a PR number/URL to fix. Produces well-formatted content ready for gh pr create / gh pr edit; does not create or update the PR itself."
---

# format-github-pr

Format a GitHub pull request title and description that communicates _what_ changed and _why_.

## Step 1: Gather context

- If the user provided a PR number or GitHub URL: look up that existing PR
- Otherwise: check whether the current branch already has a PR

## Step 2: Determine the base branch

- Existing PR: use its current base branch
- New PR: use `main` unless the user explicitly specified otherwise

## Step 3: Analyze the changes

- Existing PR: fetch its details and diff
- New PR: get the diff between the current branch and the base branch
- If the diff includes a user-facing specification, treat it as a source of truth alongside the code

Also factor in any context the user provided — they often know things the diff alone won't show (e.g. "this fixes the login bug" or "this is for issue #42").

## Step 4: Write the title

- Describe what changes for the user — not what was technically done
- Length: up to 50 characters or 10 words
- Lowercase except proper nouns and acronyms (API, URL, CDK, AWS, etc.)
- Use imperative mood
- Do not use articles (a, an, the)
- Cut every word that does not change meaning
- No trailing period

**Good:** `filter transactions by date range`
**Bad:** `let users filter transactions by date range`

**Good:** `fix login bug on mobile`
**Bad:** `fixes the login bug that occurs on mobile devices`

## Step 5: Write the description

- Avoid long paragraphs — break prose into short sentences
- Start each sentence on a new line
- Use lowercase section headlines

- If the branch addresses a GitHub issue, place the reference at the very end of the description:
  - Use `Close #<number>` (or `Fix`/`Resolve`) only when the PR fully satisfies the issue requirements
  - Use `Part of #<number>` when the PR only partially addresses the issue
  - When uncertain, ask the user before deciding which to use

- MUST NOT include technical details, implementation notes, or file changes
- MUST NOT mention AI authorship — write on behalf of a human developer

### Sections

Include the following sections in the description:

- **context**
  - Which part of the user experience is affected
  - The pain point or unmet need the user experiences
  - Why the user needs this change
- **before**
  - Describe current behavior and/or limitations
  - Use bullet points (up to 3 most essential)
  - One distinct fact per bullet
- **after**
  - Describe new behavior and/or improvements
  - Use bullet points (up to 3 most essential)
  - One distinct fact per bullet

### Example

**Good:**

```
## context

Users have to manually refresh the page to see updates made by other users, leading to stale data and confusion.

## before

- Users don't see changes from other users until they refresh
- Users work with outdated information
- Users must manually refresh to sync data

## after

- Users see changes from other users automatically
- Users work with current information
- Users don't need to manually refresh
```

**Bad:**

```
## context

The WebSocket subscription handler did not invalidate the Apollo cache on remote mutation events.

## before

- Cache invalidation was not triggered on remote updates
- The component used stale props

## after

- Added subscription listener to Apollo client
- Cache is now invalidated on mutation broadcast
```

## Step 6: Present the result

Return formatted title and body separately and clearly labeled:

```
**Title:**
<formatted title>

**Body:**
<formatted body>
```

Return the formatted content, then proceed to create or update the PR using available tools.
