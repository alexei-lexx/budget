# GitHub Issue Instructions

Guidelines for creating and editing GitHub issues in this repository.

---

## Title Conventions

- Use lowercase except for proper nouns and acronyms (API, URL, CDK, AWS, etc.)
- Start with an action verb: `add`, `fix`, `show`, `move`, `rename`, `update`, `remove`, `enable`, `migrate`, `replace`, `merge`, `support`
- Keep titles concise (5-10 words)
- Be specific - describe the exact change, not vague goals
- Optionally use `[bug]` prefix for defects

**Examples:**
- show top 5 transactions per category in monthly report
- fix npm audit issues
- [bug] pagination fails when using date filters
- migrate user lookup from Auth0 ID to email

---

## Issue Types

### 1. Feature

Use for new functionality or enhancements.

**Include these sections:**
- `## Problem` - explain why this feature is needed
- `## Solution` - describe high-level approach
- `## Acceptance Criteria` - add checkboxes (mandatory)

**Optionally include:**
- `## User Flow` - describe step-by-step interaction
- `## UI Behavior` - specify interface details
- `## Notes` - add constraints, edge cases

**Example:**
```markdown
## Problem

Users cannot track spending patterns by day of week.

## Solution

Add a weekday breakdown chart to the monthly reports page.

## Acceptance Criteria

- [ ] Chart displays expenses grouped by weekday (Mon-Sun)
- [ ] Shows both total and average per weekday
- [ ] Integrates with existing month navigation

## UI Behavior

- Bar chart with 7 columns
- Tooltip shows amount on hover
```

---

### 2. Bug

Use for defects and unexpected behavior.

**Do:**
- Add `bug` label (mandatory)
- Include `## Steps to Reproduce` (if reproducible)
- Include `## Current Behavior`
- Include `## Expected Behavior`

**Optionally include:**
- `## Screenshots`
- `## Additional Context`

**Example:**
```markdown
## Steps to Reproduce

1. Navigate to transactions page
2. Apply date filter for last month
3. Click "Next page"

## Current Behavior

Page 2 fails to load with validation error.

## Expected Behavior

Page 2 displays remaining transactions.
```

---

### 3. Technical/Refactoring

Use for infrastructure, architecture, or code quality improvements.

**Include these sections:**
- `## Context` - provide background and motivation
- `## Current State` - describe what exists now
- `## Required Changes` - specify what needs to change
- `## Benefits` - explain why this matters

**Example:**
```markdown
## Context

Lambda logs have no retention policy, causing unnecessary storage costs.

## Current State

- API Gateway logs: 1 week retention
- Lambda logs: infinite (no policy)

## Required Changes

Set `logRetention: logs.RetentionDays.ONE_WEEK` for all Lambda functions.

## Benefits

- Reduced CloudWatch costs
- Consistent retention across all logs
```

---

### 4. Simple Task

Use for trivial changes where the title is self-explanatory.

Keep body brief or empty.

**Examples:**
```
remove unused cdk.CfnOutput entries
```
(empty body - title is clear)

```
rename transaction filter buttons
```
Body: `Rename "Apply filters" to "Apply" and "Clear filters" to "Clear"`

---

## Editing Issues

Append an update note when modifying an existing issue:

```markdown
---

**Updated [date]:** [description of what changed]
```

**Example:**
```markdown
## Acceptance Criteria

- [x] User can select time period
- [x] AI returns insight based on transactions
- [ ] ~~Conversation history persists~~ (removed - see update)

---

**Updated 2025-01-15:** Removed conversation history requirement per discussion in #95
```

---

## Labels

| Label | When to use |
|-------|-------------|
| `bug` | Add to all bug issues |

Other labels are optional.

---

## Writing Style

- Keep content concise and factual
- Use minimal prose
- Prefer bullet points over paragraphs

**For Feature and Bug issues:**
- Use product-oriented language
- Focus on user impact and behavior
- Avoid implementation details unless necessary

**For Technical issues:**
- Use technical language as appropriate
- Include code snippets when helpful

---

## Avoid

- Vague titles (`improvements`, `fix bug`)
- Missing acceptance criteria on features
- Bug reports without reproduction steps (when reproducible)
- Empty body with unclear title
- Single issue covering multiple unrelated changes
