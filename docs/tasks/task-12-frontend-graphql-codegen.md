# Task 12: Frontend GraphQL Type Generation

## Objective

Implement comprehensive TypeScript type generation for frontend GraphQL operations using schema file sharing, providing the same type safety and developer experience as the existing backend codegen setup.

## Current State Analysis

### Backend GraphQL Type Generation
✅ GraphQL CodeGen configured with TypeScript resolver types
✅ Schema file at `backend/src/schema.graphql`
✅ Generated types at `backend/src/__generated__/resolvers-types.ts`
✅ Build integration with `npm run codegen`

### Frontend GraphQL Operations
✅ Apollo Client integration with Vue composables
✅ Organized GraphQL operations in `frontend/src/graphql/{queries,mutations,fragments}.ts`
✅ Manual GraphQL operations using `gql` template literals
❌ No TypeScript type generation for operations
❌ No type safety for GraphQL queries and mutations
❌ No autocomplete for GraphQL response data
❌ No compile-time validation of operations against schema

### Schema Synchronization
❌ No mechanism to share schema between backend and frontend
❌ No automated schema sync process
❌ No build integration for schema changes

## Target Architecture

### Schema Sharing Strategy
- **Frontend-Controlled Sync**: Frontend pulls `backend/src/schema.graphql` when needed
- **Frontend Schema Sync**: Copy during frontend dev/build workflow
- **Frontend Schema Consumption**: CodeGen reads from local `frontend/src/schema.graphql`
- **Package Independence**: Frontend controls when to update schema, backend unaware of frontend

### Generated Code Structure
```
frontend/src/__generated__/
├── graphql-types.ts      # Base TypeScript types from schema
└── vue-apollo.ts         # Typed Vue Apollo composables for operations
```

### Type Generation Flow
1. Backend development updates `backend/src/schema.graphql`
2. Frontend dev/build pulls latest schema to `frontend/src/schema.graphql`
3. Frontend codegen reads local schema + operation documents
4. Generated typed composables replace manual `useQuery`/`useMutation`

## Implementation Plan

### 12.1 Database Layer
*No database changes required*

### 12.2 Repository Layer
*No repository changes required*

### 12.3 Service Layer
*No service changes required*

### 12.4 GraphQL Layer
*No GraphQL layer changes required*

### 12.5 Frontend Data Layer

#### 12.5.1 Schema Synchronization Infrastructure
- [x] 12.5.1.1 Add `codegen:sync-schema` npm script using simple `cp` command
- [x] 12.5.1.2 Test schema sync functionality

#### 12.5.2 CodeGen Package Installation
- [x] 12.5.2.1 Install GraphQL CodeGen packages: `@graphql-codegen/cli`, `@graphql-codegen/typescript`, `@graphql-codegen/typescript-operations`, `@graphql-codegen/typescript-vue-apollo`

#### 12.5.3 CodeGen Configuration
- [x] 12.5.3.1 Create `frontend/codegen.ts` with local schema file source
- [x] 12.5.3.2 Configure TypeScript types generation from schema
- [x] 12.5.3.3 Configure Vue Apollo composables generation from operations
- [x] 12.5.3.4 Add proper TypeScript config for generated types

#### 12.5.4 Build Integration
- [x] 12.5.4.1 Add `codegen:sync-schema` and `codegen` scripts to `frontend/package.json`
- [x] 12.5.4.2 Integrate schema sync and codegen into `dev` and `build` scripts
- [x] 12.5.4.3 Create root-level convenience scripts for development workflow

#### 12.5.5 Initial Type Generation
- [x] 12.5.5.1 Run schema sync to copy to frontend directory
- [x] 12.5.5.2 Execute initial codegen to generate types
- [x] 12.5.5.3 Verify generated types match existing GraphQL operations

### 12.6 Frontend UI/UX Layer

#### 12.6.1 Operation Migration
- [x] 12.6.1.1 Update account-related components to use generated composables
- [x] 12.6.1.2 Update transaction-related components to use generated composables
- [x] 12.6.1.3 Update category-related components to use generated composables
- [x] 12.6.1.4 Remove manual type annotations replaced by generated types

#### 12.6.2 Developer Experience Enhancement
- [x] 12.6.2.1 Update import statements to use generated composables
- [x] 12.6.2.2 Verify TypeScript autocomplete and validation
- [x] 12.6.2.3 Test error handling with typed operations

### 12.7 Documentation and Workflow
- [x] 12.7.1 Document new development workflow in `CLAUDE.md`
- [x] 12.7.2 Create team guidelines for schema change process
- [x] 12.7.3 Update build/deployment documentation
