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
- `## context` - explain why this feature is needed
- `## expected` - describe what should be built
- `## acceptance criteria` - add checkboxes (mandatory)

**Optionally include:**
- `## current` - describe what exists now (if relevant)
- `## notes` - add UI specifics, user flows, constraints, edge cases

**Example:**
```markdown
## context

Users cannot track spending patterns by day of week.

## expected

Add a weekday breakdown chart to the monthly reports page showing:
- Expenses grouped by weekday (Mon-Sun)
- Both total and average per weekday

## acceptance criteria

- [ ] Chart displays expenses grouped by weekday
- [ ] Shows both total and average per weekday
- [ ] Integrates with existing month navigation

## notes

Bar chart with 7 columns, tooltip shows amount on hover
```

---

### 2. Bug

Use for defects and unexpected behavior.

**Do:**
- Add `bug` label (mandatory)
- Include `## context` - provide background or reproduction steps
- Include `## current` - describe what's broken
- Include `## expected` - describe what should happen instead

**Optionally include:**
- `## notes` - add screenshots, additional context

**Example:**
```markdown
## context

To reproduce:
1. Navigate to transactions page
2. Apply date filter for last month
3. Click "Next page"

## current

Page 2 fails to load with "Invalid cursor" validation error.

## expected

Page 2 should load successfully and display the remaining filtered transactions.
```

---

### 3. Technical/Refactoring

Use for infrastructure, architecture, or code quality improvements.

**Include these sections:**
- `## context` - provide background and motivation
- `## current` - describe what exists now
- `## expected` - describe the desired improved state

**Optionally include:**
- `## notes` - add benefits, technical constraints

**Example:**
```markdown
## context

Lambda logs have no retention policy, causing unnecessary storage costs.

## current

- API Gateway logs: 1 week retention
- Lambda logs: infinite (no policy)

## expected

All Lambda function logs should have consistent 1-week retention policy matching API Gateway logs.

## notes

Benefits: Reduced CloudWatch costs, consistent retention across all logs
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
