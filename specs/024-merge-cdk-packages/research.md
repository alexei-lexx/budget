# Research: Merge CDK Packages

**Feature**: 024-merge-cdk-packages
**Date**: 2025-12-30

## Overview

This document consolidates research findings for merging backend-cdk and frontend-cdk into a single infra-cdk package while maintaining two separate CloudFormation stacks.

## Research Topics

### 1. Multi-Stack CDK App Patterns

**Decision**: Use single CDK App instance with multiple stack instantiations

**Rationale**:
- AWS CDK officially supports multiple stacks in one app via multiple stack instantiations
- All stacks share the same `cdk.App()` instance
- Example pattern:
  ```typescript
  const app = new cdk.App();
  new BackendStack(app, 'BackendCdkStack', { /* props */ });
  new FrontendStack(app, 'FrontendCdkStack', { /* props */ });
  ```
- CDK automatically handles stack dependencies when using cross-stack references

**Alternatives considered**:
- Separate apps with shared code: Rejected due to deployment complexity and inability to share stack references
- Single mega-stack: Rejected because it violates requirement to maintain separate stacks (FR-002)

**References**:
- AWS CDK docs confirm multiple stacks per app is standard practice
- Existing codebase already uses this pattern (one app per stack), so merging is straightforward

---

### 2. Stack Export/Import Patterns

**Decision**: Maintain existing CloudFormation export/import using `cdk.Fn.importValue()`

**Rationale**:
- FrontendStack currently imports `BackendCdkStack-GraphqlApiDomain` via `cdk.Fn.importValue("BackendCdkStack-GraphqlApiDomain")`
- This pattern remains valid even when both stacks are in the same CDK app
- The export name is tied to stack name (`${this.stackName}-GraphqlApiDomain`), which must remain unchanged
- CDK automatically establishes deployment order when using Fn.importValue (FrontendStack deploys after BackendStack)

**Alternatives considered**:
- Direct stack reference using TypeScript: Could use `new FrontendStack(app, 'FrontendCdkStack', { apiDomain: backendStack.apiDomain })` but rejected because:
  - Requires modifying stack constructors to accept new props
  - Changes deployment contract (export names would be removed)
  - Increases migration risk

**Key constraint**: Stack names must remain `BackendCdkStack` and `FrontendCdkStack` to preserve export names and avoid resource recreation (FR-010)

---

### 3. Package.json Merging Strategy

**Decision**: Use backend-cdk's package.json as base, update version to latest

**Rationale**:
- Backend-cdk uses aws-cdk-lib@2.233.0 (newer than frontend-cdk's 2.196.0)
- All other devDependencies are identical between packages
- Backend-cdk includes @dotenvx/dotenvx which frontend doesn't need but is harmless to include
- Merged package name: "infra-cdk"
- Merged bin entry: `"infra-cdk": "bin/app.js"` (or `"app": "bin/app.js"`)

**Script merging**:
- Keep backend-cdk's dotenvx-wrapped scripts for deployment (deploy, synth, diff)
- Frontend scripts can run through dotenvx without issue (it's a no-op if .env.production doesn't exist)
- Add convenience scripts: `deploy:backend`, `deploy:frontend`, `deploy:all`

**Alternatives considered**:
- Use frontend-cdk as base: Rejected due to older aws-cdk-lib version
- Remove dotenvx: Rejected because backend deployment requires environment variables from .env.production

---

### 4. dotenvx Integration

**Decision**: Apply dotenvx to all CDK commands, making .env.production optional

**Rationale**:
- Backend stack requires .env.production for environment variables (table names, Auth0 config)
- Frontend stack has no environment variable dependencies
- dotenvx behavior: If .env.production doesn't exist, it's a harmless no-op
- Running `dotenvx run -f .env.production -- cdk deploy FrontendStack` works even without .env.production
- Simplifies script maintenance (no conditional logic needed)

**Implementation**:
- All npm scripts use: `dotenvx run -f .env.production --verbose -- <command>`
- .env.production file remains in infra-cdk/ directory
- .env.example documents all required backend environment variables

**Alternatives considered**:
- Conditional dotenvx usage per stack: Rejected due to script complexity
- Remove dotenvx entirely: Rejected because backend requires it

---

### 5. CDK Outputs Consolidation

**Decision**: Use single cdk-outputs.json file in infra-cdk/ directory

**Rationale**:
- `cdk deploy --all --outputs-file cdk-outputs.json` writes all stack outputs to one file
- Output format groups by stack name:
  ```json
  {
    "BackendCdkStack": { "MigrationFunctionName": "..." },
    "FrontendCdkStack": { "S3BucketName": "...", "CloudFrontDistributionId": "..." }
  }
  ```
- deploy.sh script can parse outputs from single file
- Old backend-cdk/cdk-outputs.json and frontend-cdk/cdk-outputs.json must be deleted after successful migration (FR-015)

**Alternatives considered**:
- Separate output files per stack: Not supported by CDK when using --all
- Manual output file generation: Rejected due to maintenance overhead

---

### 6. Stack Deployment Order

**Decision**: CDK automatically enforces deployment order via CloudFormation import dependency

**Rationale**:
- FrontendStack uses `cdk.Fn.importValue("BackendCdkStack-GraphqlApiDomain")`
- CloudFormation automatically creates dependency relationship
- When running `cdk deploy --all`, BackendStack deploys first, then FrontendStack
- No explicit dependency declaration needed in CDK code

**Deployment commands**:
- `cdk deploy --all`: Deploys both stacks in dependency order
- `cdk deploy BackendStack`: Deploys only backend
- `cdk deploy FrontendStack`: Deploys only frontend (requires backend export to exist)

**Alternatives considered**:
- Explicit `stack.addDependency()`: Not needed, CloudFormation handles it
- Sequential deployment scripts: Not needed, CDK handles it

---

### 7. Stack Naming

**Decision**: Maintain existing stack names exactly as-is

**Rationale**:
- BackendCdkStack (logical ID in code) → BackendCdkStack (CloudFormation stack name)
- FrontendCdkStack (logical ID in code) → FrontendCdkStack (CloudFormation stack name)
- Changing stack names would trigger CloudFormation stack recreation (all resources destroyed and recreated)
- Export names are derived from stack name: `${this.stackName}-GraphqlApiDomain`
- Changing export names would break FrontendStack's import

**Implementation**:
- Stack instantiation: `new BackendStack(app, 'BackendCdkStack', {})`
- Stack instantiation: `new FrontendStack(app, 'FrontendCdkStack', {})`
- File naming can differ from stack class names (backend-stack.ts vs BackendStack class)

**Alternatives considered**:
- Rename to InfraBackendStack/InfraFrontendStack: Rejected due to resource recreation risk
- Use stackName prop override: Not needed, default behavior is correct

---

## Implementation Notes

### File Migration Plan

**From backend-cdk:**
- bin/backend-cdk.ts → infra-cdk/bin/app.ts (merge both bin files)
- lib/backend-cdk-stack.ts → infra-cdk/lib/backend-stack.ts
- package.json → infra-cdk/package.json (base)
- .env.production → infra-cdk/.env.production
- .env.example → infra-cdk/.env.example
- tsconfig.json → infra-cdk/tsconfig.json
- jest.config.json → infra-cdk/jest.config.json
- eslint.config.mjs → infra-cdk/eslint.config.mjs
- .prettierrc.json → infra-cdk/.prettierrc.json
- test/ → infra-cdk/test/ (merge)

**From frontend-cdk:**
- bin/frontend-cdk.ts → infra-cdk/bin/app.ts (merge, extract FrontendStack instantiation)
- lib/frontend-cdk-stack.ts → infra-cdk/lib/frontend-stack.ts
- test/ → infra-cdk/test/ (merge)

### Code Changes Required

**bin/app.ts**:
```typescript
#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { BackendStack } from "../lib/backend-stack";
import { FrontendStack } from "../lib/frontend-stack";

const app = new cdk.App();
new BackendStack(app, "BackendCdkStack", {});
new FrontendStack(app, "FrontendCdkStack", {});
```

**lib/backend-stack.ts**:
- Rename class from `BackendCdkStack` to `BackendStack`
- No other changes needed

**lib/frontend-stack.ts**:
- Rename class from `FrontendCdkStack` to `FrontendStack`
- Keep existing `cdk.Fn.importValue("BackendCdkStack-GraphqlApiDomain")` unchanged

**package.json**:
- name: "infra-cdk"
- bin: { "infra-cdk": "bin/app.js" }
- dependencies: aws-cdk-lib@2.233.0 (use backend's version)
- scripts: add deploy:backend, deploy:frontend, deploy:all

### Deployment Script Changes

**deploy.sh** must be updated to:
- Navigate to `infra-cdk/` instead of `backend-cdk/` and `frontend-cdk/`
- Run `npm install` once instead of twice
- Run `cdk deploy --all --outputs-file cdk-outputs.json` instead of separate deploys
- Read outputs from `infra-cdk/cdk-outputs.json` instead of two separate files
- Invoke migration Lambda using output from `BackendCdkStack.MigrationFunctionName`

---

## Risk Assessment

**Low Risk**:
- Multi-stack CDK apps are standard practice
- No CloudFormation stack recreation if names stay the same
- Export/import pattern remains unchanged

**Medium Risk**:
- First deployment after merge requires careful validation
- deploy.sh changes must be tested thoroughly
- Old cdk-outputs.json files must be cleaned up to avoid confusion

**Mitigation**:
- Test deployment in non-production environment first (if available)
- Git commit all changes before first deployment (enables easy rollback via `git revert`)
- Verify both stacks deploy successfully with `cdk deploy --all`
- Verify individual stack deployment works with `cdk deploy BackendStack` and `cdk deploy FrontendStack`

---

## Open Questions

**Resolved**:
- ✅ How to handle version drift? → Use latest version (2.233.0)
- ✅ How to handle dotenvx? → Apply to all commands, harmless if .env.production missing
- ✅ How to handle outputs? → Single file, grouped by stack name
- ✅ How to maintain deployment order? → CloudFormation import creates automatic dependency

**No outstanding questions**
