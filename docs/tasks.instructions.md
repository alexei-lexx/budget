# Development Tasks Instructions

## Prerequisites

Before starting any task:
- `docs/general_spec.md` - Business requirements
- `docs/tech_spec.md` - Technical architecture

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
2. **Repository Layer** - Data access, validation
3. **Service Layer** - Business logic, cross-repository coordination
4. **GraphQL Layer** - Schema, resolvers, validation
5. **Frontend Data Layer** - Queries, mutations, composables
6. **Frontend UI/UX Layer** - Components, forms, validation

**Format:** Markdown checkboxes `[ ]` with hierarchical numbering (max 3 levels)

#### Testing (Optional)
Manual testing steps with specific expected outcomes.
- Integration testing in development
- Production deployment validation
- Use `[M]` prefix for manual steps