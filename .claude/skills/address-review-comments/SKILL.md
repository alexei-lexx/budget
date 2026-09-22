---
name: address-review-comments
description: "Process incoming PR review comments one by one: classify concerns, analyze code, present pros/cons and a suggested fix, let the user decide to fix or skip, and optionally post a reply to GitHub. Use when the user wants to work through review feedback, address Copilot or human reviewer comments, or triage PR concerns — even if they just say 'address the review', 'go through the comments', or 'process the PR feedback'."
---

# address-review-comments

Work through all review comments on a PR one concern at a time: classify, analyze, decide, act, reply.

---

## Step 1 — Resolve the PR

Parse the user's argument:

- **PR number** (e.g. `123`) — use directly
- **GitHub URL** (e.g. `https://github.com/owner/repo/pull/123`) — extract the number and repo
- **No argument** — detect the PR open for the current branch; if none exists, tell the user and stop.

Load the PR title, base branch, head branch, and URL.

---

## Step 2 — Fetch all comments

Collect three types of comments. For each, record: author login, author type (Bot/User), comment body, creation timestamp, and any line/file metadata.

**Inline review comments** (line-level, attached to specific code in the diff)

**Review-level summary comments** (the body text a reviewer writes when submitting a review; skip reviews with an empty body)

**General PR conversation comments** (posted in the PR thread outside of a formal review)

For every comment, determine whether the author is the **GitHub Copilot bot** (a bot whose login contains "copilot").

---

## Step 3 — Handle resolved and outdated comments

Identify comments that are resolved or outdated:

- Inline comments where `position` is `null` (the line no longer exists in the diff) are **outdated**
- Review threads that have been marked resolved (check `pull_request_review_thread` events if available)

If any such comments exist, inform the user:

> "I found N resolved/outdated comments (comments on code that has since changed or been explicitly resolved). Would you like to include them or skip them?"

Wait for the user's answer before proceeding.

---

## Step 4 — Classify concerns

For each collected comment (after applying the resolved/outdated decision), classify it:

- **Concern** — actionable feedback: a bug report, code quality issue, suggestion, question about correctness, or anything requiring a decision
- **Noise** — not actionable: acknowledgments, praise, "LGTM", already-answered questions, or bot notifications without substance

Discard noise silently. Only concerns proceed to Step 5.

Sort concerns in file/line order (top to bottom through the diff). Review-level summary comments come after all inline comments for the files they reference.

Report to the user:

> "Found N concerns (X from Copilot, Y from human reviewers) and M noise comments filtered out. Working through them in file order."

---

## Step 5 — Process concerns one by one

For each concern, repeat this loop:

### 5a. Present the concern

Show a header indicating progress:

```
─── Concern 1 of N ───────────────────────────────────────────
Author: @login [Copilot] | File: src/foo.ts:42 | Type: inline
```

Include `[Copilot]` label when the author is the Copilot bot.

Then show:

1. **Comment**: the reviewer's exact text
2. **Context**: read the relevant file/lines and show the code being discussed
3. **Analysis**:
   - What the reviewer is concerned about (plain language)
   - **Pros of fixing**: why this concern is valid
   - **Cons of fixing / reasons to skip**: counterarguments, cost, risk, or why it may not apply
4. **Suggested fix**: a concrete description of what the change would look like

### 5b. Ask for a decision

> "Fix, skip, or do you want to discuss? (f/s/d)"

Wait for the user's answer.

### 5c. If Fix

1. Apply the fix — edit the relevant file(s) to implement the suggested change.
2. Show the user what was changed (file and a brief description of the edit).
3. Ask: "Post a reply comment to the PR? (y/n)"
4. If yes, post a reply to the comment thread explaining what was fixed and why.

### 5d. If Skip

1. Ask: "Post a reply comment explaining why it's being skipped? (y/n)"
2. If yes, post a reply to the comment thread explaining the reasoning.

### 5e. If Discuss

Engage with the user's question or objection, then return to step 5b when ready.

### 5f. Advance

> "Move to the next concern? (y/n)"

Wait for confirmation before proceeding.

---

## Step 6 — Summary

After all concerns have been processed, output a final summary:

```
─── Done ──────────────────────────────────────────────────────
Processed N concerns:
  ✅ Fixed:   X
  ⏭  Skipped: Y
  🔕 Noise filtered out: Z
```

If any fixes were applied, remind the user to review the changes, run tests, and commit.
