# Feature Specification: Merge CDK Packages

**Feature Branch**: `024-merge-cdk-packages`
**Created**: 2025-12-30
**Status**: Draft
**Input**: User description: "Merge backend-cdk and frontend-cdk into one CDK package while keeping two separate stacks"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unified Dependency Management (Priority: P1)

As an infrastructure developer, I want to maintain a single set of dependencies and development tools for all CDK infrastructure, so that I eliminate version drift and reduce maintenance overhead.

**Why this priority**: This is the primary motivation for the merge. Currently, backend-cdk uses aws-cdk-lib@2.233.0 while frontend-cdk uses @2.196.0, creating version inconsistency. Both packages duplicate eslint, prettier, typescript, and jest configurations. With a single-person team where backend and frontend changes typically come in the same pull request, maintaining two separate packages is unnecessary overhead.

**Independent Test**: Can be fully tested by verifying that both stacks share the same package.json, dependencies, and dev tool configurations. Delivers immediate value by eliminating duplicate npm install/update cycles and ensuring consistent tooling.

**Acceptance Scenarios**:

1. **Given** separate backend-cdk and frontend-cdk packages exist, **When** infrastructure is consolidated, **Then** only one package.json exists with unified dependencies
2. **Given** version drift exists between packages (2.233.0 vs 2.196.0), **When** packages are merged, **Then** both stacks use identical aws-cdk-lib version
3. **Given** duplicate eslint/prettier/tsconfig files, **When** packages are merged, **Then** one set of configuration files applies to all stack code
4. **Given** separate node_modules directories, **When** packages are merged, **Then** single node_modules serves both stacks

---

### User Story 2 - Simplified Deployment (Priority: P2)

As an infrastructure developer, I want to deploy both backend and frontend stacks from a single CDK app, so that deployment orchestration is simplified and both stacks can be deployed with one command when changes affect both.

**Why this priority**: Simplifies the deployment workflow for the common case (changes to both stacks). The deploy.sh script currently navigates between backend-cdk and frontend-cdk directories, running npm install and cdk deploy twice. With merged packages, this becomes a single cdk deploy --all command.

**Independent Test**: Can be fully tested by running cdk deploy --all and verifying both stacks deploy successfully. Delivers value by reducing deployment steps and script complexity.

**Acceptance Scenarios**:

1. **Given** a unified CDK app with both stacks, **When** running cdk deploy --all, **Then** both BackendStack and FrontendStack are deployed
2. **Given** both stacks are defined in one app, **When** deploy.sh is updated, **Then** fewer directory changes are required
3. **Given** a single cdk-outputs.json location, **When** deployment completes, **Then** outputs from both stacks are available in one file
4. **Given** migration Lambda invocation occurs after deployment, **When** deploy.sh runs, **Then** migration executes after both stacks are deployed

---

### User Story 3 - Individual Stack Deployment (Priority: P3)

As an infrastructure developer, I want to deploy backend or frontend stacks individually when needed, so that I can quickly iterate on single-stack changes or perform targeted hotfixes without affecting the other stack.

**Why this priority**: Maintains deployment flexibility for edge cases like debugging, rollbacks, or frontend-only changes (S3/CloudFront updates are slow and shouldn't block backend iterations). Lower priority because most changes affect both stacks.

**Independent Test**: Can be fully tested by running cdk deploy BackendStack and cdk deploy FrontendStack separately and verifying each deploys without errors. Delivers value by preserving granular deployment control.

**Acceptance Scenarios**:

1. **Given** a unified CDK app, **When** running cdk deploy BackendStack, **Then** only the backend stack deploys
2. **Given** a unified CDK app, **When** running cdk deploy FrontendStack, **Then** only the frontend stack deploys (assuming backend already exists)
3. **Given** backend stack exports API Gateway domain, **When** frontend stack is deployed alone, **Then** it successfully imports the export
4. **Given** convenience npm scripts, **When** developer runs npm run deploy:backend, **Then** only BackendStack is deployed

---

### Edge Cases

- **First-time deployment**: What happens if FrontendStack is deployed before BackendStack on initial setup? (CloudFormation import will fail since export doesn't exist yet)
- **Migration timing**: How does migration Lambda invocation integrate with the new single-package deployment flow? (Must run after both stacks deploy but before frontend S3 upload)
- **Existing outputs**: Old backend-cdk/cdk-outputs.json and frontend-cdk/cdk-outputs.json files must be deleted once new infra-cdk/cdk-outputs.json is successfully created to prevent confusion about which outputs are current
- **Environment variables**: How does dotenvx integration work when only backend needs .env.production? (Backend scripts use dotenvx, frontend scripts don't - still works)
- **Stack naming**: Do stack names remain BackendCdkStack and FrontendCdkStack? (Yes, to avoid resource recreation)
- **Rollback on failure**: If package merge or deployment fails mid-process, rollback by restoring from version control (git revert), ensuring all changes are committed so deployment can be re-run from scratch
- **Old directory cleanup**: Old backend-cdk/ and frontend-cdk/ directories must be deleted in the same commit as the merge to keep repository clean; git history preserves them for rollback via git revert

## Clarifications

### Session 2025-12-30

- Q: If the package merge or first deployment fails mid-process, what is the recovery strategy? → A: Rollback by restoring from version control (git revert) - assumes all changes are committed and deployment can be re-run from scratch
- Q: What should happen to existing backend-cdk/cdk-outputs.json and frontend-cdk/cdk-outputs.json files after the merge? → A: Delete old output files once new infra-cdk/cdk-outputs.json is successfully created
- Q: What should happen to the old backend-cdk/ and frontend-cdk/ directories after the merge is complete and verified? → A: Delete old directories in the same commit as the merge (repository stays clean, git history preserves them)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST consolidate backend-cdk and frontend-cdk into a single npm package named "infra-cdk"
- **FR-002**: System MUST maintain two separate CloudFormation stacks (BackendStack and FrontendStack) within the unified app
- **FR-003**: System MUST preserve the CloudFormation export/import relationship where FrontendStack imports BackendStack's GraphqlApiDomain export
- **FR-004**: System MUST unify aws-cdk-lib to a single version for both stacks (use latest: 2.233.0)
- **FR-005**: System MUST consolidate dev dependencies (eslint, prettier, typescript, jest) into one package.json
- **FR-006**: System MUST support deploying both stacks together via cdk deploy --all
- **FR-007**: System MUST support deploying individual stacks via cdk deploy BackendStack or cdk deploy FrontendStack
- **FR-008**: System MUST maintain dotenvx for backend environment variable management
- **FR-009**: System MUST update deploy.sh to use the unified package structure
- **FR-010**: System MUST maintain existing stack names to prevent resource recreation
- **FR-011**: System MUST use a single bin/app.ts entry point that instantiates both stacks
- **FR-012**: System MUST place backend stack definition in lib/backend-stack.ts
- **FR-013**: System MUST place frontend stack definition in lib/frontend-stack.ts
- **FR-014**: System MUST output cdk-outputs.json to a single location accessible by deploy.sh
- **FR-015**: System MUST delete old backend-cdk/cdk-outputs.json and frontend-cdk/cdk-outputs.json files after successful creation of infra-cdk/cdk-outputs.json
- **FR-016**: System MUST delete backend-cdk/ and frontend-cdk/ directories in the same commit as creating infra-cdk/

### Key Entities

- **Unified CDK Package (infra-cdk)**: Single npm package containing both BackendStack and FrontendStack definitions, with unified dependencies and tooling
- **BackendStack**: CloudFormation stack defining DynamoDB tables, Lambda functions, and API Gateway (previously in backend-cdk package)
- **FrontendStack**: CloudFormation stack defining S3 bucket and CloudFront distribution (previously in frontend-cdk package)
- **CDK App**: Single AWS CDK application instance that instantiates both stacks and manages their deployment lifecycle

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Infrastructure developer maintains only one package.json for all CDK code (reduced from two)
- **SC-002**: Both stacks use identical aws-cdk-lib version with no version drift
- **SC-003**: Deployment script navigates to one CDK directory instead of two, reducing directory changes by 50%
- **SC-004**: Individual stack deployment remains functional (cdk deploy BackendStack and cdk deploy FrontendStack both succeed)
- **SC-005**: Full deployment (both stacks) completes with same success rate as current two-package approach
- **SC-006**: Migration Lambda invocation integrates seamlessly into updated deploy.sh workflow

## Assumptions

- Stack names (BackendCdkStack, FrontendCdkStack) will remain unchanged to avoid triggering resource recreation
- Existing backend and frontend codebases (in backend/ and frontend/ directories) are not affected by this change
- deploy.sh script will be updated as part of this feature to reflect new package structure
- dotenvx will continue to be used for backend environment variable management, with frontend scripts optionally running through dotenvx (harmless if no .env.production exists)
- The new unified package will be named "infra-cdk" and placed in the infra-cdk/ directory at repository root
- Migration from old structure to new structure is a one-time manual process, not automated

## Dependencies

- Existing backend-cdk and frontend-cdk packages must be functional before migration
- CloudFormation stacks must be in a stable state (no in-progress deployments)
- deploy.sh script must be tested after migration to ensure deployment workflow works correctly

## Out of Scope

- Merging BackendStack and FrontendStack into a single CloudFormation stack (they remain separate)
- Changing stack names or resource names
- Automating the migration process (this is a manual restructuring task)
- Changes to backend or frontend application code
- Changes to CI/CD pipeline configuration (to be handled separately if needed)
