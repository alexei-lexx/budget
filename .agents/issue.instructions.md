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

## Standard Sections

All issues use the same core structure (body can be empty for trivial tasks with self-explanatory titles):

**When body is present, use this order:**
1. `## context` - Background, motivation, or reproduction steps (required)
2. `## current` - What exists now or what's broken (optional, skip for new features)
3. `## expected` - What should happen or be built (required)
4. `## acceptance criteria` - Checkboxes to verify completion (required for Features, optional otherwise)
5. `## notes` - Additional details: UI specifics, screenshots, constraints, benefits, etc. (optional)

**Special requirements:**
- **Bug issues:** Add `bug` label

---

## Issue Types

| Type | Description | When to Use |
|------|-------------|-------------|
| **Feature** | New functionality or enhancements | Building something new or extending existing features |
| **Bug** | Defects and unexpected behavior | Something is broken or not working as intended |
| **Technical** | Infrastructure, architecture, or code quality | Internal improvements with no direct user-facing changes |

---

## Examples

### Feature

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

### Bug

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

### Technical

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

### Simple/Minimal

For trivial changes, the body can be brief or even empty if the title is clear:

```
remove unused cdk.CfnOutput entries
```
(empty body - title is self-explanatory)

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

## Writing Style

- Keep content concise and factual
- Use minimal prose
- Prefer bullet points over paragraphs
- Use product-oriented language for Features and Bugs
- Focus on user impact and behavior
- Use technical language as appropriate for Technical issues
- Include code snippets when helpful

---

## Avoid

- Vague titles (`improvements`, `fix bug`)
- Missing acceptance criteria
- Bug reports without reproduction steps (when reproducible)
- Empty body with unclear title
- Single issue covering multiple unrelated changes
