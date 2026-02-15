# Implementation Plan: Passkey Authentication Support

**Branch**: `029-passkeys` | **Date**: 2026-02-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/029-passkeys/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable passkey authentication (WebAuthn/FIDO2) for users through AWS Cognito User Pool configuration. This is an infrastructure-only change requiring no backend or frontend code modifications. Passkeys will be managed through Cognito's hosted UI, providing users with a more secure, passwordless authentication option alongside existing password-based authentication.

## Technical Context

**Language/Version**: TypeScript 5.x (for AWS CDK infrastructure code)
**Primary Dependencies**: AWS CDK, AWS Cognito User Pools
**Storage**: AWS Cognito (passkey credentials stored by Cognito)
**Testing**: Jest (for CDK infrastructure tests)
**Target Platform**: AWS Cloud (production), AWS Cognito (both dev and prod)
**Project Type**: Infrastructure - modifies existing infra-cdk package
**Performance Goals**: Zero latency impact (passkey auth is handled by Cognito, no backend involvement)
**Constraints**:
- Must work in both development (local backend/frontend, AWS Cognito) and production (full AWS deployment)
- Must not require backend or frontend code changes
- Must use Cognito hosted UI for passkey management
- Must maintain backward compatibility with existing password authentication
**Scale/Scope**: Single infrastructure stack modification (AuthCdkStack), zero code changes to backend/frontend

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Repository Structure ✅
- **Status**: PASS
- **Assessment**: Changes are confined to infra-cdk package, which is already established. No new packages or structural changes required.

### Vendor Independence ⚠️
- **Status**: ACCEPTABLE WITH JUSTIFICATION
- **Assessment**: Passkeys are implemented through AWS Cognito, which is already the authentication provider. However:
  - **Mitigation**: WebAuthn/FIDO2 is an industry standard protocol, not AWS-specific
  - **Portability**: Passkey credentials can be exported/migrated if switching authentication providers
  - **Risk Level**: Low - leveraging existing vendor (Cognito) with standards-based approach
- **Justification**: No new vendor lock-in; extending existing Cognito usage with standard WebAuthn protocol

### Schema-Driven Development ✅
- **Status**: NOT APPLICABLE
- **Assessment**: No GraphQL schema changes required (infrastructure-only change)

### Backend Layer Structure ✅
- **Status**: NOT APPLICABLE
- **Assessment**: No backend code changes required

### Test Strategy ✅
- **Status**: PASS
- **Assessment**: Will update existing CDK infrastructure tests to verify passkey configuration

### TypeScript Code Generation ✅
- **Status**: PASS
- **Assessment**: CDK infrastructure code will follow TypeScript standards (descriptive names, type safety, ESLint compliance)

### Input Validation ✅
- **Status**: NOT APPLICABLE
- **Assessment**: No validation logic changes (Cognito handles passkey validation)

### Authentication & Authorization ✅
- **Status**: PASS
- **Assessment**: Extends existing Cognito authentication with additional authentication method. No changes to authorization model. Backend continues to verify JWT tokens from Cognito regardless of authentication method used.

**GATE RESULT**: ✅ PASS - Proceed to Phase 0 research

---

### Post-Design Re-Evaluation (After Phase 1)

**Date**: 2026-02-15

All principles re-evaluated after completing research.md, data-model.md, contracts/, and quickstart.md:

- **Repository Structure**: ✅ PASS - Confirmed changes confined to infra-cdk
- **Vendor Independence**: ✅ PASS - WebAuthn standard protocol, no additional vendor lock-in
- **Schema-Driven Development**: ✅ NOT APPLICABLE - No schema changes confirmed
- **Backend Layer Structure**: ✅ NOT APPLICABLE - No backend code changes confirmed
- **Test Strategy**: ✅ PASS - Infrastructure test updates planned
- **TypeScript Code Generation**: ✅ PASS - CDK code follows standards
- **Input Validation**: ✅ NOT APPLICABLE - No validation changes
- **Authentication & Authorization**: ✅ PASS - Extends existing Cognito auth, JWT verification unchanged

**Design Decisions Made**:
1. Set RP ID to match Cognito domain (avoids custom domain complexity)
   - RP ID constructed from AUTH_DOMAIN_PREFIX: `${prefix}.auth.<region>.amazoncognito.com`
   - Dev: AUTH_DOMAIN_PREFIX="dev-budget-auth" (.env) → RP ID matches Cognito domain
   - Prod: AUTH_DOMAIN_PREFIX from SSM → RP ID matches Cognito domain
   - Separate environments = separate User Pools = proper environment isolation
2. User verification set to PREFERRED (better device compatibility)
3. Keep MFA disabled (required for passkey support)
4. Rely entirely on Cognito Hosted UI (no custom UI development)

**POST-DESIGN GATE RESULT**: ✅ PASS - All principles compliant, ready for Phase 2 (tasks generation)

## Project Structure

### Documentation (this feature)

```text
specs/029-passkeys/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command) - minimal for this feature
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command) - empty for this feature
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
infra-cdk/
├── lib/
│   ├── auth-cdk-stack.ts        # MODIFY: Add passkey configuration to User Pool
│   └── pre-token-generation.ts  # NO CHANGE: Token customization remains unchanged
├── test/
│   └── auth-cdk.test.ts         # MODIFY: Add test coverage for passkey settings
└── bin/
    └── app.ts                   # NO CHANGE: Stack instantiation unchanged

backend/                         # NO CHANGES: Backend unaware of passkey vs password auth
frontend/                        # NO CHANGES: Frontend continues using Cognito hosted UI
```

**Structure Decision**: This is a pure infrastructure feature confined to the infra-cdk package. The existing web application structure (backend/, frontend/, infra-cdk/) remains unchanged. Only the AuthCdkStack in infra-cdk will be modified to enable passkey support in the Cognito User Pool configuration.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - this section intentionally left empty.
