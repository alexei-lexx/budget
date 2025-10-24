# Development Tasks Instructions

## Prerequisites

Before starting any task:
- `docs/general-spec.md` - Business requirements
- `docs/tech-spec.md` - Technical architecture

## CRITICAL: Task Completion Tracking

**ALWAYS mark tasks completed immediately: `[ ]` → `[x]`**

This prevents duplicate work and maintains project visibility.

## Task Structure

**Naming:** `task-N-feature-name.md` in `docs/tasks/` folder

**Hierarchy:**
- **Task** (N): Major user-facing feature - single digit numbering
- **Phase** (N.N): Implementation phases by architectural layer
- **Sub-item** (N.N.N): Specific work items within phases

## Task Definition Guidelines

### Rules
1. **Result in code changes** (except testing/deployment)
2. **Be specific** - avoid vague descriptions like "improve" or "update"
3. **Use concrete notation** - `ClassName.methodName`, `ComponentName.handlerFunction`
4. **Combine coupled work** - don't artificially split interdependent tasks
5. **Focus on MVP** - add enhancements to `docs/future_enhancements.md`

### Required Sections

**Order:** Objective → Use Cases → UI Layout → Acceptance Criteria → Implementation Plan

#### Objective
Clear description of main goal and value delivered.

#### Use Cases
Behavioral scenarios describing user interactions, including edge cases.

#### UI Layout (Optional)
For user-facing features only:
- UI element placement and relationships
- User interaction flows
- Visual mockups using ASCII diagrams
- Tab/button/form layouts

#### Acceptance Criteria
Testable requirements defining completion.

**Guidelines:**
- Group under logical subsections (Core Functionality, User Experience, Data Integrity)
- 8-15 total criteria maximum
- Each criterion independently testable
- Avoid redundancy

#### Implementation Plan
Bottom-up, layer-by-layer phases:

1. **Database Layer** - Tables, schema, migrations
2. **Repository Layer** - Data access, validation, **unit tests required**
3. **Service Layer** - Business logic, cross-repository coordination
4. **GraphQL Layer** - Schema, resolvers, validation
5. **Frontend Data Layer** - Queries, mutations, composables
6. **Frontend UI/UX Layer** - Components, forms, validation

**Format:** Markdown checkboxes `[ ]` with hierarchical numbering (max 3 levels)

**Numbering Format:**
- **Phase:** `X.Y` (where X = task number, Y = sequential phase number)
- **Sub-item:** `X.Y.Z` (specific work items within phase, max 3 levels)

**Example:**
```
### 5.1 Repository Layer
- [ ] 5.1.1 Add new repository methods
- [ ] 5.1.2 Create unit tests for repository

### 5.2 Service Layer
- [ ] 5.2.1 Implement business logic service
- [ ] 5.2.2 Add validation methods
- [ ] 5.2.3 Handle error scenarios
```

**Important:**
- Only include layers that require actual code changes. Skip layers with no changes needed and renumber remaining layers sequentially (e.g., if Database Layer requires no schema changes, start with "5.1 Repository Layer").
- **Repository Layer Requirements:** Any repository method additions or modifications MUST include corresponding unit tests. Repository layer implementation is not complete without unit test coverage for both success scenarios and error handling.

#### Testing (Optional)
Final validation phase with concrete manual testing steps and specific expected outcomes.

**Format:** Markdown checkboxes `[ ]` with hierarchical numbering, `[M]` prefix for manual steps

**Integration Testing (Development Environment)**

*Test 1: Core Functionality*
- Navigate to main feature entry point
- Perform primary user action with specific data
- Click save/submit button
- Verify success feedback appears
- Verify data persists correctly
- Verify related data updates (balances, counts, etc.)

*Test 2: Data Variations*
- Test with different data types (currencies, categories, etc.)
- Test with different user scenarios
- Verify each variation saves and displays correctly
- Verify calculations update properly across variations

*Test 3: Edge Cases*
- Test with boundary values (zero, empty, maximum)
- Test error scenarios and validation
- Verify appropriate error messages shown
- Verify data integrity maintained after errors

**Production Deployment**
- Deploy to production environment
- Validate only core user workflows (not edge cases or complex scenarios)
- Use real but safe test data
