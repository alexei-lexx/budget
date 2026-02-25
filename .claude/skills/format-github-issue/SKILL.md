---
name: format-github-issue
description: "Formats and beautifies GitHub issue titles and descriptions. Use this skill whenever you are about to create a GitHub issue, update an existing issue, or when asked to improve, format, clean up, rewrite, or polish an issue title or description — even if the user just says 'fix the issue wording' or 'make this look better'. Produces well-formatted content ready for gh issue create / gh issue edit; does not create or update issues itself."
---

# format-github-issue

Format and beautify a GitHub issue title and/or body to match project conventions.

## When to use

- Before calling `gh issue create` — format the content first, then create
- Before calling `gh issue edit` — format the content first, then update
- When asked to "improve", "clean up", "rewrite", "fix", or "beautify" an issue

## Workflow

### 1. Classify the issue type

| Type | When to use |
|------|------------|
| **Feature** | New functionality or enhancements |
| **Bug** | Defects and unexpected behavior |
| **Technical/Refactoring** | Infrastructure, architecture, code quality |
| **Simple Task** | Trivial change where title is self-explanatory |

If the type is ambiguous, ask before continuing.

### 2. Format the title

- Lowercase except proper nouns and acronyms (API, URL, CDK, AWS, etc.)
- Non-bug issues: start with an action verb: `add`, `fix`, `show`, `move`, `rename`, `update`, `remove`, `enable`, `migrate`, `replace`, `merge`, `support`
- Bug issues: use `[bug]` prefix and describe the symptom (not an action verb)
- 5–10 words, specific — describe the exact change or problem, not vague goals

**Examples:**
- `show top 5 transactions per category in monthly report`
- `fix npm audit issues`
- `[bug] pagination fails when using date filters`
- `migrate user lookup from Auth0 ID to email`

### 3. Format the body

Use the section structure for the classified type:

#### Feature

Mandatory sections:
- `## context` — explain why this feature is needed
- `## solution` — describe the high-level approach
- `## acceptance criteria` — checkboxes

Optional sections:
- `## user flow` — step-by-step interaction
- `## UI behavior` — interface details
- `## notes` — constraints, edge cases

```markdown
## context

Users cannot track spending patterns by day of week.

## solution

Add a weekday breakdown chart to the monthly reports page.

## acceptance criteria

- [ ] Chart displays expenses grouped by weekday (Mon-Sun)
- [ ] Shows both total and average per weekday
- [ ] Integrates with existing month navigation

## UI behavior

- Bar chart with 7 columns
- Tooltip shows amount on hover
```

#### Bug

Mandatory sections:
- `## steps to reproduce` — clear, numbered steps (if reproducible)
- `## current behavior` — what happens now
- `## expected behavior` — what should happen instead

Optional sections:
- `## screenshots` — images to illustrate
- `## additional context` — any other relevant info

Indicate the bug label in the output (see Output section).

```markdown
## steps to reproduce

1. Navigate to transactions page
2. Apply date filter for last month
3. Click "Next page"

## current behavior

Page 2 fails to load with validation error.

## expected behavior

Page 2 displays remaining transactions.
```

#### Technical/Refactoring

Mandatory sections:
- `## context` — background and motivation
- `## current state` — what exists now
- `## required changes` — what needs to change
- `## benefits` — why this matters

```markdown
## context

Lambda logs have no retention policy, causing unnecessary storage costs.

## current state

- API Gateway logs: 1 week retention
- Lambda logs: infinite (no policy)

## required changes

Set one-week retention for all Lambda functions.

## benefits

- Reduced CloudWatch costs
- Consistent retention across all logs
```

#### Simple Task

Body is brief or empty if the title is self-explanatory.

```
remove unused cdk.CfnOutput entries
```
(empty body)

```
rename transaction filter buttons
```
Body: `Rename "Apply filters" to "Apply" and "Clear filters" to "Clear"`

### 4. Writing guidelines

- Concise and factual — no filler
- Use minimal prose
- Bullet points over paragraphs
- Avoid long paragraphs — break prose into short sentences
- Each sentence on its own line
- Feature/Bug: product-oriented language, focus on user impact, avoid implementation details unless necessary
- Technical: technical language is fine, include code snippets when helpful

**Avoid:**
- Vague titles (`improvements`, `fix bug`)
- Missing acceptance criteria on features
- Bug reports without reproduction steps (when reproducible)
- Empty body with unclear title
- Single issue covering multiple unrelated changes

### 5. Editing an existing issue

When the user is editing an existing issue, append an update note at the bottom:

```markdown
---

**Updated [date]:** [description of what changed]
```

### 6. Output

Return formatted title and body separately and clearly labeled:

```
**Title:**
<formatted title>

**Body:**
<formatted body>
```

For bug issues, also include:

```
**Label:** bug
```

Return the formatted content, then proceed to create or update the issue using available tools.
