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

### 1. Database Layer
*No database changes required*

### 2. Repository Layer
*No repository changes required*

### 3. Service Layer
*No service changes required*

### 4. GraphQL Layer
*No GraphQL layer changes required*

### 5. Frontend Data Layer

#### 5.1 Schema Synchronization Infrastructure
- [ ] Add `codegen:sync-schema` npm script using simple `cp` command
- [ ] Test schema sync functionality

#### 5.2 CodeGen Package Installation
- [ ] Install GraphQL CodeGen packages: `@graphql-codegen/cli`, `@graphql-codegen/typescript`, `@graphql-codegen/typescript-operations`, `@graphql-codegen/typescript-vue-apollo`

#### 5.3 CodeGen Configuration
- [ ] Create `frontend/codegen.ts` with local schema file source
- [ ] Configure TypeScript types generation from schema
- [ ] Configure Vue Apollo composables generation from operations
- [ ] Add proper TypeScript config for generated types

#### 5.4 Build Integration
- [ ] Add `codegen:sync-schema` and `codegen` scripts to `frontend/package.json`
- [ ] Integrate schema sync and codegen into `dev` and `build` scripts
- [ ] Create root-level convenience scripts for development workflow

#### 5.5 Initial Type Generation
- [ ] Run schema sync to copy to frontend directory
- [ ] Execute initial codegen to generate types
- [ ] Verify generated types match existing GraphQL operations

### 6. Frontend UI/UX Layer

#### 6.1 Operation Migration
- [ ] Update account-related components to use generated composables
- [ ] Update transaction-related components to use generated composables  
- [ ] Update category-related components to use generated composables
- [ ] Remove manual type annotations replaced by generated types

#### 6.2 Developer Experience Enhancement
- [ ] Update import statements to use generated composables
- [ ] Verify TypeScript autocomplete and validation
- [ ] Test error handling with typed operations

### 7. Documentation and Workflow
- [ ] Document new development workflow in `CLAUDE.md`
- [ ] Create team guidelines for schema change process
- [ ] Update build/deployment documentation

## Testing

### 8. Integration Testing

#### 8.1 Type Generation Validation
- [ ] **[M]** Verify schema sync creates identical file in `frontend/src/schema.graphql`
- [ ] **[M]** Run `npm run codegen` in frontend, verify no TypeScript errors
- [ ] **[M]** Verify generated types in `frontend/src/__generated__/` contain expected interfaces
- [ ] **[M]** Test autocomplete works in IDE for generated composables

#### 8.2 Operation Type Safety
- [ ] **[M]** Verify account queries return properly typed account objects
- [ ] **[M]** Verify transaction mutations accept properly typed input variables
- [ ] **[M]** Test GraphQL operation variables get TypeScript validation
- [ ] **[M]** Verify compilation fails for operations mismatched to schema

#### 8.3 Development Workflow
- [ ] **[M]** Make schema change in backend, verify frontend codegen picks up changes
- [ ] **[M]** Test full development workflow: backend dev → schema sync → frontend codegen
- [ ] **[M]** Verify build process works with codegen integration

### 9. Production Deployment
- [ ] **[M]** Deploy with new build process including schema sync and codegen
- [ ] **[M]** Verify frontend application functions identically with typed operations
- [ ] **[M]** Confirm no runtime GraphQL operation errors in production