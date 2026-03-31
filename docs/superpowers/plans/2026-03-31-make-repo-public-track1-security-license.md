# Make Repo Public — Track 1: Security & License

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository safe to go public — scan for leaked secrets, add a BUSL 1.1 license, harden the root `.gitignore`, and add a CI status badge.

**Architecture:** Pure file additions/modifications. No application code changes. No tests required.

**Tech Stack:** `trufflehog` (secret scanning), git, GitHub Actions badge markdown.

---

## Files

- Create: `LICENSE`
- Modify: `.gitignore`
- Modify: `README.md` (CI badge only — screenshots are Track 3)

---

### Task 1: Scan git history for secrets

- [ ] **Step 1: Install trufflehog**

```bash
pip install trufflehog
```

Or via Docker (no install needed):

```bash
docker run --rm -v "$(pwd):/repo" trufflesecurity/trufflehog:latest git file:///repo --only-verified
```

- [ ] **Step 2: Run the scan**

From the repo root:

```bash
trufflehog git file://. --only-verified
```

Expected output: no verified secrets found. If any are found, they will be printed with file path and commit hash.

- [ ] **Step 3: If secrets are found — rewrite history**

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

- [ ] **Step 4: If no secrets found — proceed**

No history rewrite needed. Continue to Task 2.

---

### Task 2: Add BUSL 1.1 LICENSE file

- [ ] **Step 1: Create the LICENSE file**

Create `LICENSE` at the repo root with the following content. Replace `2026-03-31` with the actual commit date:

```
Business Source License 1.1

Parameters

Licensor:             alexei-lexx
Licensed Work:        Personal Finance Tracker
                      The Licensed Work is (c) 2026 alexei-lexx
Additional Use Grant: You may use, copy, modify, and distribute the Licensed
                      Work for personal and non-commercial purposes, free of
                      charge, without restriction.

---

Business Source License 1.1

License text copyright (c) 2017 MariaDB Corporation Ab, All Rights Reserved.
"Business Source License" is a trademark of MariaDB Corporation Ab.

-----------------------------------------------------------------------------

Parameters

Licensor:             [see above]
Licensed Work:        [see above]
Additional Use Grant: [see above]
Change Date:          None — this license does not convert to an open source license.
Change License:       N/A

For information about alternative licensing arrangements for the Licensed Work,
please contact the Licensor.

-----------------------------------------------------------------------------

Notice

The Business Source License (this document, or the "License") is not an Open
Source license. However, the Licensed Work will eventually be made available
under an Open Source License, as stated in this License.

License Grant. Subject to the terms and conditions of this License and to
the Additional Use Grant, the Licensor hereby grants to each recipient of
the Licensed Work a non-exclusive, worldwide license to copy, distribute,
make available, and prepare derivative works of the Licensed Work, in each
case subject to the limitations for the Specific License Date and Additional
Use Grant stated above.

Covenants of Licensor. In consideration of the right to use this License's
text and the "Business Source License" name and trademark, Licensor covenants
to MariaDB, and to all recipients of the Licensed Work to be provided this
License by the Licensor:

1. To specify as the Change License the GPL Version 2.0 or any later version,
   or a license that is compatible with GPL Version 2.0 or a later version,
   where "compatible" means that software provided under the Change License can
   be included in a program with software provided under GPL Version 2.0 or a
   later version. Licensor may specify additional Change Licenses as an
   exception to this requirement only if the use of the additional Change
   Licenses is approved by MariaDB Corporation Ab.

2. To either: (a) specify an Additional Use Grant that does not impose any
   additional restriction on the right granted in License Grant, above, or (b)
   insert the text "None" in the space of the Additional Use Grant.

3. To specify a Change Date.

4. Not to modify this License in any other way.

-----------------------------------------------------------------------------

Notice

THE LICENSED WORK IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
LICENSED WORK OR THE USE OR OTHER DEALINGS IN THE LICENSED WORK.
```

> Note: This is the standard BUSL 1.1 template. The Change Date is explicitly "None" to indicate the restriction is permanent.

- [ ] **Step 2: Commit**

```bash
git add LICENSE
git commit -m "add BUSL 1.1 license"
```

---

### Task 3: Harden root `.gitignore`

- [ ] **Step 1: Edit `.gitignore`**

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

# CDK deployment outputs (contain infrastructure details)
cdk-outputs*.json
```

- [ ] **Step 2: Verify `.env.example` files are still tracked**

```bash
git status
```

Expected: only `.gitignore` appears as modified. The `.env.example` files in subdirectories should not be affected (they're already tracked and the negation patterns preserve them).

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "harden root .gitignore"
```

---

### Task 4: Add CI badge to README

- [ ] **Step 1: Edit `README.md`**

The current first line of `README.md` is:

```markdown
# Personal Finance Tracker
```

Replace it with:

```markdown
# Personal Finance Tracker

[![CI](https://github.com/alexei-lexx/budget/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/alexei-lexx/budget/actions/workflows/ci.yml)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "add CI badge to README"
```

---

### Task 5: Open PR

- [ ] **Step 1: Push branch and open PR**

```bash
git push origin <branch-name>
gh pr create --title "Track 1: security & license" --body "$(cat <<'EOF'
## Summary

- Scanned git history for leaked secrets with trufflehog
- Added BUSL 1.1 license (non-commercial use, no expiry)
- Hardened root `.gitignore` with `.env*`, `*.pem`, `*.key`, `cdk-outputs*.json`
- Added CI status badge to README

Part of #306 — making the repository public.
EOF
)"
```
