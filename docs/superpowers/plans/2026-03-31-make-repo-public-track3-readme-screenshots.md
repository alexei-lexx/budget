# Make Repo Public — Track 3: README & Screenshots

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add screenshots of the running app to the README so visitors immediately see what the app looks like. Restructure the README to put the screenshots at the bottom with an inline jump link after the feature list.

**Architecture:** Screenshots captured from a staging environment, stored under `docs/screenshots/`, referenced from `README.md`. Also add a brief context note to `docs/requirements.md`.

**Tech Stack:** Playwright CLI (already configured in the repo at `.playwright-cli`), or manual browser screenshots. Images stored as PNG.

---

## Files

- Create: `docs/screenshots/` — directory for screenshots (PNG files)
- Modify: `README.md` — add Screenshots section at bottom, add jump link after feature list
- Modify: `docs/requirements.md` — add one-line context note at top

---

### Task 1: Take screenshots from the staging environment

Screenshots must be taken from a live staging environment with real-looking sample data.

**Sample data spec:** [`docs/superpowers/plans/2026-04-01-screenshot-data.md`](2026-04-01-screenshot-data.md)

- [ ] **Step 1: Set up staging environment**

Deploy to staging (migrations run automatically as part of deployment):

```bash
ENV=staging ./deploy.sh
```

Get the staging URL from `infra-cdk/cdk-outputs.staging.json` (the CloudFront URL).

Retrieve staging credentials from the `pass` vault:

```bash
pass budget/staging/user/email
pass budget/staging/user/password
```

Sign in and manually enter realistic sample data across all screens (accounts, categories, transactions, etc.) before taking screenshots. There is no seed script for staging.

- [ ] **Step 2: Prepare Telegram screenshot**

In Telegram, send the following to the bot and capture its reply:

- "coffee 4.50"

Show the bot's response creating the transaction in the conversation.

- [ ] **Step 3: Take screenshots of each screen**

Use browser DevTools to set viewport to 390×844 (iPhone 14 Pro) for mobile-first presentation. Save each as PNG to `docs/screenshots/`:

| Screen                     | File                                     | How to reach it                                                                                                      |
| -------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Accounts list              | `docs/screenshots/accounts.png`          | Home screen — shows all accounts with balances                                                                       |
| Categories list            | `docs/screenshots/categories.png`        | Categories section — shows both income and expense tabs                                                              |
| Transaction entry (manual) | `docs/screenshots/transaction-entry.png` | Open the "Add transaction" form, fill in Food / $62.30 / Groceries — capture before submitting                       |
| Quick entry (AI)           | `docs/screenshots/quick-entry.png`       | Open AI quick entry, type "coffee 4.50" — capture after the AI fills in the form                                     |
| Monthly report             | `docs/screenshots/monthly-report.png`    | Reports section for current month — shows income/expense totals and category breakdown                               |
| Insights                   | `docs/screenshots/insights.png`          | Insights/AI section — ask "What did I spend most on this month?" and capture the answer                              |
| Telegram                   | `docs/screenshots/telegram.png`          | In Telegram Web (web.telegram.org), open the bot chat — capture a conversation showing a command and the bot's reply |

- [ ] **Step 4: Verify image quality**

Each image should be:

- 390px wide (mobile viewport)
- Clear and not blurry
- Showing realistic sample data (not empty states)
- Free of personal information (fictional names/amounts only)

---

### Task 2: Update `README.md`

The current README structure is:

1. `# Personal Finance Tracker`
2. `## Core Features`
3. `## Technologies`
4. `## Repository Structure`
5. `## Deployment`

Target structure after this task:

1. `# Personal Finance Tracker` + CI badge (added in Track 1)
2. `## Core Features` + jump link to screenshots
3. `## Technologies`
4. `## Repository Structure`
5. `## Deployment`
6. `## Screenshots` (new, at the bottom)

- [ ] **Step 1: Add jump link after the Core Features list**

Find the end of the `## Core Features` section in `README.md`. The last bullet is currently:

```markdown
- **Telegram Integration** - Chat with the app directly from Telegram
```

Add a jump link on the next line:

```markdown
- **Telegram Integration** - Chat with the app directly from Telegram

[→ See screenshots](#screenshots)
```

- [ ] **Step 2: Add Screenshots section at the bottom of `README.md`**

Append the following to the end of `README.md`:

```markdown
## Screenshots

### Accounts

![Accounts list](docs/screenshots/accounts.png)

### Categories

![Categories list](docs/screenshots/categories.png)

### Transaction Entry

![Transaction entry](docs/screenshots/transaction-entry.png)

### Quick Entry (AI)

![AI quick entry](docs/screenshots/quick-entry.png)

### Monthly Report

![Monthly report](docs/screenshots/monthly-report.png)

### Insights

![Insights](docs/screenshots/insights.png)

### Telegram Integration

![Telegram integration](docs/screenshots/telegram.png)
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/screenshots/
git commit -m "add screenshots to README"
```

---

### Task 3: Add context note to `docs/requirements.md`

- [ ] **Step 1: Edit `docs/requirements.md`**

Add the following line at the very top of the file, before any existing content:

```markdown
> This is the living business requirements document for the Personal Finance Tracker. It describes features, user stories, and product constraints.
```

(Leave one blank line after the note before the existing content.)

- [ ] **Step 2: Commit**

```bash
git add docs/requirements.md
git commit -m "add context note to requirements doc"
```

---

### Task 4: Open PR

- [ ] **Step 1: Push branch and open PR**

```bash
git push origin <branch-name>
gh pr create --title "Track 3: README screenshots and polish" --body "$(cat <<'EOF'
## Summary

- Added screenshots of all key screens (accounts, categories, transaction entry, AI quick entry, monthly report, insights, Telegram)
- Added `## Screenshots` section at bottom of README with jump link from the feature list
- Added context note to `docs/requirements.md` for public visitors

Part of #306 — making the repository public.
EOF
)"
```
