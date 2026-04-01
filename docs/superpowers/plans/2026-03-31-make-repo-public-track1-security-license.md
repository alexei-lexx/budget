# Make Repo Public — Track 1: Security & License

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository safe to go public — scan for leaked secrets, add a PolyForm Noncommercial 1.0.0 license, harden the root `.gitignore`, and add a CI status badge.

**Architecture:** Pure file additions/modifications. No application code changes. No tests required.

**Tech Stack:** `trufflehog` (secret scanning), git, GitHub Actions badge markdown.

---

## Files

- Create: `LICENSE`
- Modify: `.gitignore`
- Modify: `README.md` (CI badge only — screenshots are Track 3)

---

### Task 1: Scan git history for secrets

- [x] **Step 1: Install trufflehog**

```bash
pip install trufflehog
```

Or via Docker (no install needed):

```bash
docker run --rm -v "$(pwd):/repo" trufflesecurity/trufflehog:latest git file:///repo --only-verified
```

- [x] **Step 2: Run the scan**

From the repo root:

```bash
trufflehog git file://. --only-verified
```

Expected output: no verified secrets found. If any are found, they will be printed with file path and commit hash.

- [x] **Step 3: If secrets are found — rewrite history**

Only needed if Step 2 reports verified findings. Install `git-filter-repo`:

```bash
pip install git-filter-repo
```

Remove the file containing the secret from all commits:

```bash
git filter-repo --path path/to/file/with/secret --invert-paths
```

Then force-push **before** making the repo public:

```bash
git push origin main --force
```

- [x] **Step 4: If no secrets found — proceed**

No history rewrite needed. Continue to Task 2.

---

### Task 2: Add PolyForm Noncommercial 1.0.0 LICENSE file

- [x] **Step 1: Create the LICENSE file**

Copy the full license text from <https://polyformproject.org/licenses/noncommercial/1.0.0/> into `LICENSE` at the repo root.

- [x] **Step 2: Commit**

```bash
git add LICENSE
git commit -m "add PolyForm Noncommercial 1.0.0 license"
```

---

### Task 3: Harden root `.gitignore`

- [x] **Step 1: Edit `.gitignore`**

Current contents of `/.gitignore`:
```
.playwright
.playwright-cli
```

Replace with:
```
.playwright
.playwright-cli

# Environment files (defense-in-depth — subdirectories have their own .gitignore)
.env*
!**/.env.example
!**/.env.test.example

# Secrets and keys
*.pem
*.key
```

- [x] **Step 2: Verify `.env.example` files are still tracked**

```bash
git status
```

Expected: only `.gitignore` appears as modified. The `.env.example` files in subdirectories should not be affected (they're already tracked and the negation patterns preserve them).

- [x] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "harden root .gitignore"
```

---

### Task 4: Add CI badge to README

- [x] **Step 1: Edit `README.md`**

The current first line of `README.md` is:

```markdown
# Personal Finance Tracker
```

Replace it with:

```markdown
# Personal Finance Tracker

[![CI](https://github.com/alexei-lexx/budget/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/alexei-lexx/budget/actions/workflows/ci.yml)
```

- [x] **Step 2: Commit**

```bash
git add README.md
git commit -m "add CI badge to README"
```

---

### Task 5: Open PR

- [x] **Step 1: Push branch and open PR**

```bash
git push origin <branch-name>
gh pr create --title "Track 1: security & license" --body "$(cat <<'EOF'
## Summary

- Scanned git history for leaked secrets with trufflehog
- Added PolyForm Noncommercial 1.0.0 license (non-commercial use, no expiry)
- Hardened root `.gitignore` with `.env*`, `*.pem`, `*.key`
- Added CI status badge to README

Part of #306 — making the repository public.
EOF
)"
```
