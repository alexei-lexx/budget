# Design

## Context

See `proposal.md` - Why.

Current state:

- `.tool-versions` pins `nodejs 24.12.0` and `awscli 2.36.10` for asdf
- No other file refers to asdf
- `deploy.sh` calls `aws` and `jq`
- `openspec/config.yaml` runs `npx prettier --write openspec/` at the repository root
  - The root has no `package.json`
- `.github/workflows/ci.yml` has 3 jobs: `backend`, `frontend`, and `infra-cdk`
  - Each job uses `actions/setup-node@v4` with `node-version: "24"`, `cache: "npm"`, and the `package-lock.json` of its package as `cache-dependency-path`
  - The workflow pins each action to a major version tag, for example `actions/checkout@v4`
  - The workflow does not ignore changes to `mise.toml` or `mise.lock`, so a change to them starts CI
- `scripts/worktree-add.sh` runs `npm ci` in each new worktree
  - A new worktree gets `mise.toml` and `mise.lock` from git
- mise is not installed on the machine of the agent
  - The agent must not install software

Facts from the mise documentation:

- A `mise.toml` with only `[tools]` and plain versions does not need `mise trust`
- Trust of the main checkout also applies to its git worktrees
- `mise lock` writes `mise.lock` without an installation of the tools
- When `mise.lock` exists, mise keeps it up to date
  - The `lockfile = true` setting is necessary only for automatic creation of a new lockfile by `mise install`
- For npm tools, mise can write a dependency graph to a sidecar folder (`.mise/locks/` by default)
  - The documentation says to commit the sidecar folder with `mise.lock`
- `jdx/mise-action` adds `--locked` to `mise install` when the repository has a `mise.lock`
- `jdx/mise-action` caches the mise tools by default, but not the npm download cache

## Goals / Non-Goals

**Goals:**

- Make `mise.toml` the only place that sets tool versions, also for CI
- Make each machine and CI use the same exact versions through `mise.lock`
- Keep the CI duration about the same with the npm download cache

**Non-Goals:**

- Pin the version of mise itself in CI
- Lock the tools for platforms that the project does not use
- Remove asdf from the machine of a developer
- Change `scripts/worktree-add.sh` or `deploy.sh`

## Decisions

### Tools and version prefixes

`mise.toml` at the repository root:

```toml
[tools]
node = "24"
aws-cli = "2"
jq = "1"
"npm:prettier" = "3"
"npm:@playwright/cli" = "0.1"
```

- Each version is a prefix, so a `mise upgrade` stays in the same major version (minor version for `@playwright/cli`, which is below `1.0`)
- `mise.lock` keeps the exact versions, so the prefix does not let versions drift between machines
- The registry short names `aws-cli` and `jq` select the aqua backend, which downloads release binaries with checksums
- Alternative: exact versions in `mise.toml`, such as `node = "24.12.0"`
  - Rejected, because the lockfile already pins exact versions, and an update then needs a change in two files

### No `[settings]` entry for the lockfile

- `mise lock` creates `mise.lock` without the `lockfile = true` setting
- When `mise.lock` exists, mise keeps it up to date without the setting
- `mise.toml` then contains only `[tools]`, so it does not need `mise trust`
- Alternative: `[settings] lockfile = true`
  - Rejected, because it is necessary only to create a new lockfile automatically, and the change creates the lockfile with `mise lock`

### Lockfile generation needs mise

- mise is not on the machine of the agent, and the agent must not install it
- The tasks mark the lockfile generation as a manual step for a person with mise
  - Run `mise install`, then `mise lock --platform linux-x64`
- Commit `mise.lock` and, if `mise lock` creates it, the `.mise/locks/` sidecar folder
- The lockfile must contain entries only for `linux-x64`, because the developer machine (WSL) and the CI runners (`ubuntu-latest`) use it
  - The default `mise lock` writes entries for all common platforms, and `mise lock --check` then fails for platforms without a download URL
  - `--platform` does not remove platforms from an existing lockfile, so delete `mise.lock` before the first generation
  - A later `mise lock` without `--platform` keeps the platforms that the lockfile already has

### CI installs Node.js with mise

Each job replaces the "Setup Node.js" step with these steps, after "Checkout code":

```yaml
- name: Setup mise
  uses: jdx/mise-action@v5
  with:
    install_args: node

- name: Cache npm downloads
  uses: actions/cache@v6
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-<package>-${{ hashFiles('<package>/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-<package>-
```

- `install_args: node` installs only Node.js
  - CI does not need the AWS CLI, `jq`, Prettier from mise, or `@playwright/cli`
  - The packages use their own Prettier from `node_modules`
- `mise.toml` is then the only place that sets the Node.js version
- With `mise.lock` in the repository, the action runs `mise install --locked node`
  - CI fails if `mise.lock` has no Node.js entry for `linux-x64`, which shows a stale lockfile early
- The action keeps its default cache of the mise tools
- `actions/cache` keeps the npm download cache that `setup-node` gave with `cache: "npm"`
  - The key contains the package name and the hash of its `package-lock.json`, as with `cache-dependency-path`
- Pin both actions to a major version tag, as the rest of the workflow does
- Alternative: keep `actions/setup-node` with `node-version-file`
  - Rejected, because `setup-node` does not read `mise.toml`, so the version stays in two places
- Alternative: no npm cache
  - Rejected, because each `npm ci` then downloads all packages again

### `npx prettier` at the repository root

- With mise, `prettier` is on `PATH` at the repository root
- The implementation verifies that `npx prettier --write openspec/` uses the Prettier from mise and does not download a package
  - Check with `npx --no -- prettier --version`, which fails if `npx` needs a download, and compare the version with `prettier --version`
- If `npx` does not use the Prettier from `PATH`, change the command in `openspec/config.yaml` to `prettier --write openspec/`

### README

- Replace the deployment prerequisites with 3 steps: install mise, run `mise install` at the repository root, and configure the AWS credentials
- Link to the mise installation documentation, and do not copy the installation commands

## Risks / Trade-offs

- [The agent cannot generate `mise.lock`] → A manual task for a person with mise generates and commits it. Until then CI works without `--locked`, because the action adds `--locked` only when `mise.lock` exists
- [`node = "24"` with a new lockfile can select a later `24.x` than `24.12.0`] → The same major version, which CI already used. `mise.lock` pins the selected version
- [A developer without mise gets no tools] → The README describes the setup, and the proposal marks it as a breaking change for local development
- [`jdx/mise-action` downloads the latest mise release in each run without a cache] → The action caches the mise binary by default. A mise version pin is a non-goal
- [Each `npm:` tool needs Node.js to install] → Node.js is in the same `mise.toml`, so `mise install` installs it first
- [`npx` can still download Prettier] → The implementation checks it, and the fallback changes the command in `openspec/config.yaml`

## Migration Plan

1. A person with mise installs mise, activates it in the shell, and runs `mise install` and `mise lock --platform linux-x64` in the repository
2. Commit `mise.toml`, `mise.lock`, the sidecar folder if it exists, the deletion of `.tool-versions`, the CI changes, and the README change in one commit
3. Each developer installs mise and runs `mise install`
4. Rollback: revert the commit. asdf then reads `.tool-versions` again

## Constitution Compliance

- **Repository Structure**: complies. The 3 npm packages and their scripts stay the same
- **Deployment**: complies. `deploy.sh` stays the manual deployment method and does not change
- **Development environment**: complies. The local services stay the same
- **Vendor Independence**: complies. mise is a local developer tool. The app does not depend on it
- **Code Quality Validation**: complies. CI runs typecheck, Prettier, lint, and tests as before
- **Test Strategy**: the change has no backend business logic, so the change adds no tests
- No violations
