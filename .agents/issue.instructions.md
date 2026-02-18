# GitHub Issue Instructions

Guidelines for creating and editing GitHub issues in this repository.

---

## Title Conventions

- Use lowercase except for proper nouns and acronyms (API, URL, CDK, AWS, etc.)
- Start with an action verb: `add`, `fix`, `show`, `move`, `rename`, `update`, `remove`, `enable`, `migrate`, `replace`, `merge`, `support`
- Keep titles concise (5-10 words)
- Be specific - describe the exact change, not vague goals
- Optionally use `[bug]` prefix for bugs

**Examples:**
- show top 5 transactions per category in monthly report
- fix npm audit issues
- [bug] pagination fails when using date filters
- migrate user lookup from Auth0 ID to email

---

## Issue Types

| Type | Description | Required Sections | Optional Sections |
|------|-------------|-------------------|-------------------|
| **Feature** | New functionality or enhancements | `problem`, `solution`, `acceptance criteria` | `user flow`, `UI behavior`, `notes` |
| **Bug** | Defects and unexpected behavior | `steps to reproduce`, `current behavior`, `expected behavior` | `screenshots`, `additional context` |
| **Technical/Refactoring** | Infrastructure, architecture, or code quality improvements | `context`, `current state`, `required changes`, `benefits` | — |
| **Simple Task** | Trivial changes where title is self-explanatory | — | — |

### 1. Feature

Use for new functionality or enhancements.

**Include these sections:**
- `## problem` - explain why this feature is needed
- `## solution` - describe high-level approach
- `## acceptance criteria` - add checkboxes (mandatory)

**Optionally include:**
- `## user flow` - describe step-by-step interaction
- `## UI behavior` - specify interface details
- `## notes` - add constraints, edge cases

**Example:**
```markdown
## problem

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

---

### 2. Bug

Use for defects and unexpected behavior.
Mark all bug issues with the `bug` label.

**Include these sections:**
- `## steps to reproduce` - provide clear, reproducible steps (if reproducible)
- `## current behavior` - describe what happens currently
- `## expected behavior` - describe the expected outcome

**Optionally include:**
- `## screenshots` - add images to illustrate the issue
- `## additional context` - provide any other relevant information

**Example:**
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

---

### 3. Technical/Refactoring

Use for infrastructure, architecture, or code quality improvements.

**Include these sections:**
- `## context` - provide background and motivation
- `## current state` - describe what exists now
- `## required changes` - specify what needs to change
- `## benefits` - explain why this matters

**Example:**
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
## acceptance criteria

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
