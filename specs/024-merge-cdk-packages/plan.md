# Implementation Plan: Merge CDK Packages

**Branch**: `024-merge-cdk-packages` | **Date**: 2025-12-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/024-merge-cdk-packages/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Consolidate backend-cdk and frontend-cdk into a single npm package (infra-cdk) while maintaining two separate CloudFormation stacks (BackendStack and FrontendStack). This eliminates dependency version drift, reduces maintenance overhead, and simplifies deployment orchestration while preserving the ability to deploy stacks individually.

## Technical Context

**Language/Version**: TypeScript (same version as existing backend-cdk and frontend-cdk packages)
**Primary Dependencies**: AWS CDK (aws-cdk-lib@2.233.0), constructs, dotenvx
**Storage**: N/A (infrastructure-as-code feature)
**Testing**: Jest (per constitution for CDK packages)
**Target Platform**: AWS (CloudFormation deployment)
**Project Type**: Infrastructure (AWS CDK infrastructure-as-code)
**Performance Goals**: N/A (infrastructure code, deployment time not critical)
**Constraints**: Must maintain existing stack names (BackendCdkStack, FrontendCdkStack) to avoid resource recreation; must preserve CloudFormation export/import relationship (FrontendStack imports BackendStack's GraphqlApiDomain)
**Scale/Scope**: 2 CloudFormation stacks in 1 CDK app, ~10-15 infrastructure construct definitions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Repository Structure Gate

**Current State**: Constitution documents four independent packages:
- backend/
- frontend/
- backend-cdk/
- frontend-cdk/

**Proposed Change**: Merge backend-cdk/ and frontend-cdk/ into infra-cdk/, reducing to three packages:
- backend/
- frontend/
- infra-cdk/

**Violation**: Yes - this feature modifies the documented repository structure

**Justification**:
- Eliminates version drift (currently aws-cdk-lib@2.233.0 vs @2.196.0)
- Reduces maintenance overhead (single package.json, node_modules, tooling config)
- Simplifies deployment for single-developer team where frontend/backend changes typically come together
- Constitution already acknowledges CDK is AWS-specific, so consolidation doesn't affect portability concerns
- Stacks remain separate at CloudFormation level, preserving deployment flexibility

**Action Required**: Constitution must be updated after feature completion to reflect new three-package structure

### Other Constitution Checks

- **Vendor Independence**: ✅ No change - CDK remains AWS-specific as documented
- **Test Strategy**: ✅ Will maintain Jest tests for infrastructure code (merge test/ directories from both packages)
- **General Requirements**: ✅ No impact on free-tier usage, PWA, or vendor independence goals

---

### Post-Design Re-Evaluation

**After completing Phase 1 design (research.md, data-model.md, quickstart.md):**

✅ **Repository Structure Gate**: Violation remains justified
- Design confirms: 3-package structure (backend/, frontend/, infra-cdk/)
- Constitution update required after implementation
- No new concerns identified

✅ **Test Strategy Gate**: PASS
- Design confirms: Test directories from backend-cdk/test/ and frontend-cdk/test/ will be merged into infra-cdk/test/
- Jest configuration will be maintained (jest.config.json from backend-cdk used as base)
- Test execution via `npm test` preserved

✅ **Vendor Independence Gate**: PASS
- Design confirms: No changes to backend/ or frontend/ packages
- Infrastructure consolidation doesn't affect application portability

✅ **General Requirements Gate**: PASS
- Design confirms: No impact on free-tier usage, PWA capability, or vendor independence goals

**Overall Assessment**: Design is constitutional with one justified violation (repository structure change requiring constitution amendment)

## Project Structure

### Documentation (this feature)

```text
specs/024-merge-cdk-packages/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

**Before (Current State)**:
```text
backend/                 # Backend application package
frontend/                # Frontend application package
backend-cdk/             # Backend infrastructure package
├── bin/
│   └── backend-cdk.ts   # CDK app for backend stack
├── lib/
│   └── backend-cdk-stack.ts  # Backend stack definition
├── package.json         # aws-cdk-lib@2.233.0
└── test/
frontend-cdk/            # Frontend infrastructure package
├── bin/
│   └── frontend-cdk.ts  # CDK app for frontend stack
├── lib/
│   └── frontend-cdk-stack.ts # Frontend stack definition
├── package.json         # aws-cdk-lib@2.196.0
└── test/
```

**After (Target State)**:
```text
backend/                 # Backend application package (unchanged)
frontend/                # Frontend application package (unchanged)
infra-cdk/               # Unified infrastructure package
├── bin/
│   └── app.ts           # Unified CDK app (instantiates both stacks)
├── lib/
│   ├── backend-stack.ts # Backend stack definition (from backend-cdk-stack.ts)
│   └── frontend-stack.ts # Frontend stack definition (from frontend-cdk-stack.ts)
├── package.json         # Unified dependencies (aws-cdk-lib@2.233.0)
├── cdk-outputs.json     # Single outputs file for both stacks
└── test/                # Merged test files
```

**Structure Decision**: Infrastructure consolidation - merge two CDK packages into one while preserving two CloudFormation stacks. The bin/app.ts file will be the single entry point that instantiates both BackendStack (from lib/backend-stack.ts) and FrontendStack (from lib/frontend-stack.ts).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Repository structure change (4 packages → 3 packages) | Eliminates version drift (aws-cdk-lib@2.233.0 vs @2.196.0) and reduces maintenance overhead for single-developer team | Keeping 4 packages requires duplicate dependency management, tooling configs, and deployment scripts despite backend/frontend changes typically coming together |
