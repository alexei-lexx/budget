# Proposal

## Why

The repository pins tool versions for asdf in `.tool-versions`.
The file pins only Node.js and the AWS CLI.
Other tools that the project uses have no pinned version:

- `deploy.sh` needs `jq`, which is a system prerequisite without a version
- The OpenSpec workflow runs `npx prettier --write openspec/` at the repository root
  - The root has no `package.json`, so `npx` downloads the latest Prettier
- The `playwright-cli` skill uses `@playwright/cli`, which is a global npm package under the asdf Node.js

CI does not read `.tool-versions`.
Each CI job sets the Node.js version again in `actions/setup-node`.

mise replaces asdf.
mise installs tools from more sources, such as npm packages, and records the exact versions in a lockfile.
One `mise.toml` and one `mise.lock` then set the tool versions for each developer machine and for CI.

## What Changes

- Add a root `mise.toml` with these tools:
  - `node = "24"`
  - `aws-cli = "2"`
  - `jq = "1"`
  - `"npm:prettier" = "3"`
  - `"npm:@playwright/cli" = "0.1"`
- Add a committed `mise.lock` with the exact tool versions
- Delete `.tool-versions`
- In each CI job (backend, frontend, infra-cdk), replace `actions/setup-node` with `jdx/mise-action` that installs only Node.js
- Keep the npm download cache in CI with a separate `actions/cache` step
- In the README deployment prerequisites, replace the AWS CLI, Node.js, and `jq` items with these steps:
  - Install mise
  - Run `mise install`
  - Configure the AWS credentials
- **BREAKING** (local development only): each developer must install mise and run `mise install`
  - asdf does not read `mise.toml`

Out of scope:

- The OpenSpec CLI, which the user installs manually
- Personal global npm tools of the user
- mise tasks, such as a `mise run check` task
- Changes to the app, the deployment script, or the worktree scripts

## Capabilities

### New Capabilities

None. The change affects only developer tooling and CI.

### Modified Capabilities

None. The change does not change the behavior of the app.
The change sets `skip_specs: true`.

## Impact

- **Repository root**: `mise.toml` (new), `mise.lock` (new), `.tool-versions` (deleted), `README.md`
- **CI**: `.github/workflows/ci.yml` (all 3 jobs)
- **OpenSpec workflow**: `npx prettier --write openspec/` uses the Prettier from mise, if `npx` finds it on `PATH`
- **Local machine of each developer** (manual steps)
  - Install mise and activate it in the shell
  - Run `mise install` in the repository
  - Remove the asdf setup, if no other project uses it
- **Backend, frontend, infra-cdk code**: no change
- **Production**: no impact

## Constitution Compliance

- **Repository Structure**: complies. The 3 npm packages stay the same
- **Deployment**: complies. `deploy.sh` stays the manual deployment method. Only the installation of its prerequisites changes
- **Development environment**: complies. The local services stay the same
- **Vendor Independence**: complies. mise is a local developer tool. It does not affect the portability of the app
- **Code Quality Validation**: complies. CI still runs typecheck, Prettier, lint, and tests on the same Node.js major version
- **Test Strategy**: the change has no backend business logic, so the change adds no tests
- No violations
