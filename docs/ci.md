# Continuous Integration (CI)

This repository uses GitHub Actions to run automated checks on every push and pull request.

## CI Workflow

The CI workflow (`.github/workflows/ci.yml`) runs the following checks for each package:

### Backend (`backend/`)
- **Type Check**: `npm run typecheck` - Verifies TypeScript types
- **Format Check**: `npm run prettier` - Ensures code formatting consistency
- **Lint**: `npm run lint` - Checks for code quality issues with ESLint
- **Tests**: `npm run test` - Runs Jest test suite

### Frontend (`frontend/`)
- **Type Check**: `npm run typecheck` - Verifies TypeScript and Vue types
- **Format Check**: `npm run prettier` - Ensures code formatting consistency
- **Lint**: `npm run lint` - Checks for code quality issues with ESLint
- **Tests**: `npm run test` - Runs Jest test suite

### Infrastructure CDK (`infra-cdk/`)
- **Type Check**: `npm run typecheck` - Verifies TypeScript types
- **Format Check**: `npm run prettier` - Ensures code formatting consistency
- **Lint**: `npm run lint` - Checks for code quality issues with ESLint
- **Tests**: `npm run test` - Runs Jest test suite for CDK stacks

## Running Checks Locally

Before pushing your changes, you can run the same checks locally:

```bash
# For backend
cd backend
npm run typecheck
npm run prettier
npm run lint
npm run test

# For frontend
cd frontend
npm run typecheck
npm run prettier
npm run lint
npm run test

# For infra-cdk
cd infra-cdk
npm run typecheck
npm run prettier
npm run lint
npm run test
```

## Making CI Checks Required for Pull Requests

To ensure all CI checks pass before merging pull requests, follow these steps:

### 1. Navigate to Repository Settings

1. Go to your repository on GitHub: `https://github.com/alexei-lexx/budget`
2. Click on **Settings** (you need admin permissions)

### 2. Configure Branch Protection Rules

1. In the left sidebar, click on **Branches**
2. Under "Branch protection rules", click **Add rule** (or edit an existing rule for your main branch)
3. In "Branch name pattern", enter your main branch name (e.g., `main` or `master`)

### 3. Enable Status Checks

1. Check the box **Require status checks to pass before merging**
2. Check the box **Require branches to be up to date before merging** (optional but recommended)
3. In the search box that appears, search for and select the following status checks:
   - `Backend`
   - `Frontend`
   - `Infrastructure CDK`
   
   Note: These status checks will only appear after the CI workflow has run at least once on a pull request.

### 4. Additional Recommended Settings

Consider enabling these additional protections:

- **Require a pull request before merging**: Forces code review before merge
  - **Require approvals**: Set the number of required reviews (e.g., 1)
- **Require conversation resolution before merging**: Ensures all PR comments are resolved
- **Do not allow bypassing the above settings**: Applies rules even to administrators

### 5. Save Changes

Click **Create** or **Save changes** at the bottom of the page.

## Troubleshooting

### CI Checks Not Appearing

If the CI check status doesn't appear in your pull request:

1. Ensure the workflow file exists at `.github/workflows/ci.yml`
2. Check the **Actions** tab in your repository to see if workflows are enabled
3. The checks will appear after the workflow runs for the first time on a PR
4. Verify the workflow syntax is correct

### Workflow Failures

If a CI check fails:

1. Click on the failed check in your pull request
2. Click **Details** to see the workflow logs
3. Review the error messages to understand what failed
4. Fix the issues locally and push again
5. The CI will automatically re-run on the new push

### Local vs CI Differences

If checks pass locally but fail in CI:

1. Ensure you're using `npm ci` instead of `npm install` locally (matches CI behavior)
2. Check that all your changes are committed (CI only sees committed changes)
3. Verify your Node.js version matches the CI (Node.js 22)
4. Review the CI logs for environment-specific issues
