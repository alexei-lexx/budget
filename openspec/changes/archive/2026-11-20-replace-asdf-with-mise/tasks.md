# Tasks

Tasks marked **(needs mise)** need mise on the machine.
mise is not on the machine of the agent, and the agent must not install software.
The user does these tasks, or the agent does them after the user installs mise.
The agent does all other tasks.

## 1. mise Configuration

- [x] 1.1 Add `mise.toml` at the repository root with only the `[tools]` table from design.md (`node = "24"`, `aws-cli = "2"`, `jq = "1"`, `"npm:prettier" = "3"`, `"npm:@playwright/cli" = "0.1"`) and no `[settings]` table; verify `python3 -c "import tomllib; print(tomllib.load(open('mise.toml','rb')))"` prints the 5 tools
- [x] 1.2 Delete `.tool-versions`; verify `git grep -n -i -e asdf -e tool-versions -- ':!openspec/changes'` shows no result

## 2. Lockfile and Local Tools

- [x] 2.1 **(needs mise)** Install mise as the mise documentation describes, activate it in the shell, and run `mise install` at the repository root; verify `mise ls --current` shows the 5 tools as installed and `mise.toml` needs no `mise trust`
- [x] 2.2 **(needs mise)** Run `mise lock --platform linux-x64` at the repository root (delete an existing `mise.lock` first, because `--platform` does not remove platforms); verify `mise.lock` has an entry for each of the 5 tools and only `linux-x64` platform entries for `node`, `aws-cli`, and `jq`, and verify `mise lock --check` passes; a later `mise lock` keeps the platforms that the lockfile already has
- [x] 2.3 **(needs mise)** If `mise lock` created the `.mise/locks/` sidecar folder, keep it for the commit; verify `git status --short --untracked-files=all` lists `mise.lock` and the sidecar files, and `git check-ignore mise.lock .mise/locks` shows no result
- [x] 2.4 **(needs mise)** Verify `node --version`, `aws --version`, `jq --version`, `prettier --version`, and `playwright-cli --version` work at the repository root, and `mise which <tool>` shows a path inside the mise installation folder for each tool
- [x] 2.5 **(needs mise)** Verify `npx --no -- prettier --version` at the repository root succeeds and prints the same version as `prettier --version`; if it fails, change `npx prettier --write openspec/` to `prettier --write openspec/` in `openspec/config.yaml` and verify `prettier --check openspec/` runs

## 3. CI

- [x] 3.1 In the `backend` job of `.github/workflows/ci.yml`, replace the "Setup Node.js" step with the "Setup mise" step (`jdx/mise-action@v5`, `install_args: node`) and the "Cache npm downloads" step (`actions/cache@v6`, path `~/.npm`, key on `backend/package-lock.json`) from design.md; verify with `git diff`
- [x] 3.2 Make the same change in the `frontend` job with `frontend/package-lock.json`; verify with `git diff`
- [x] 3.3 Make the same change in the `infra-cdk` job with `infra-cdk/package-lock.json`; verify `git grep -n setup-node -- .github` shows no result and each job has a different cache key
- [x] 3.4 Verify the action tags exist with `gh api repos/jdx/mise-action/git/ref/tags/v5` and `gh api repos/actions/cache/git/ref/tags/v6`; if a tag does not exist, use the latest major tag of that action
- [x] 3.5 Run `npx prettier --check ../.github/workflows/ci.yml` in `backend/` and verify it passes

## 4. README

- [x] 4.1 In `README.md`, replace the 3 deployment prerequisites with these items: install mise (link to the mise installation documentation), run `mise install` at the repository root, and configure the AWS credentials; verify `git grep -n -e "AWS CLI installed" -e "Node.js installed" -e "jq.*installed" -- README.md` shows no result
- [x] 4.2 Run `npx prettier --check ../README.md` in `backend/` and verify it passes

## 5. Integration Check

- [x] 5.1 **(needs mise)** In `backend/`, verify `node --version` matches the Node.js version in `mise.lock`, then run `npm ci` and `npm test` and verify all tests pass
- [x] 5.2 **(needs mise)** Run `scripts/worktree-add.sh` with a test branch; in the new worktree, verify `mise ls --current` shows the 5 tools without a trust prompt and `node --version` matches `mise.lock`; remove the worktree with `scripts/worktree-remove.sh` and delete the test branch
- [x] 5.3 After the user commits and pushes the branch and opens a pull request, verify the 3 CI jobs pass, the "Setup mise" logs show `mise install --locked node`, and the Node.js version in the logs matches `mise.lock`

## Constitution Compliance

- **Repository Structure**: complies. The 3 npm packages and their scripts stay the same
- **Deployment**: complies. `deploy.sh` does not change. Only the README prerequisites change
- **Test Strategy**: the change has no backend business logic, so the tasks add no automated tests and do not use test-driven development. Tasks 2.4, 5.1, 5.2, and 5.3 check the tools with real commands
- **Code Quality Validation**: tasks 3.5, 4.2, 5.1, and 5.3 run Prettier, the backend test suite, and the CI pipeline
- No violations
