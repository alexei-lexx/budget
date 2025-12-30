# API Contracts: Merge CDK Packages

**Feature**: 024-merge-cdk-packages
**Date**: 2025-12-30

## Overview

This feature is an infrastructure consolidation task and does not introduce new API contracts or modify existing API endpoints.

## Existing APIs

The infrastructure defined by this feature exposes the following existing APIs (unchanged):

### GraphQL API

**Endpoint**: Exposed via CloudFront distribution at `/graphql`
**Backend**: AWS API Gateway → Lambda (Apollo Server)
**Schema**: Defined in `backend/src/schema.graphql` (not modified by this feature)
**Contract**: Backend-For-Frontend (BFF) GraphQL API for frontend client

**Infrastructure Changes**:
- Backend infrastructure (API Gateway, Lambda) defined in `infra-cdk/lib/backend-stack.ts`
- Frontend infrastructure (CloudFront routing) defined in `infra-cdk/lib/frontend-stack.ts`
- No changes to API behavior, endpoints, or contracts

## No New Contracts

This feature does not define new API contracts because:
1. It consolidates infrastructure-as-code packages (backend-cdk + frontend-cdk → infra-cdk)
2. It maintains existing CloudFormation stacks without modification
3. It preserves existing API Gateway and Lambda configurations
4. It does not introduce new endpoints or modify GraphQL schema

## Contract Governance

For actual API contract changes, refer to:
- **GraphQL Schema**: `backend/src/schema.graphql` (canonical source)
- **Schema-Driven Development**: See constitution.md for API change process
- **Generated Types**: Backend and frontend both consume generated TypeScript types from schema
