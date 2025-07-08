# Development Tasks Instructions

This document combines all task-related instructions and the complete task index for the
Personal Finance Tracker project.

## Prerequisites

**Before starting any task, analyze requirements and instructions in:**
- `docs/general_spec.md` - Business requirements and feature specifications
- `docs/tech_spec.md` - Technical architecture and implementation guidelines

## ⚠️ CRITICAL: Task Completion Tracking

**ALWAYS mark tasks as completed immediately after finishing them by changing `[ ]` to `[x]`
in the appropriate task file**

This is mandatory for:
- Tracking progress accurately in permanent documentation
- Avoiding duplicate work across different development sessions
- Maintaining project visibility for all team members
- Ensuring accountability and progress transparency
- Keeping the permanent roadmap synchronized with current work

**When all sub-task items under a parent task are completed and marked, mark the parent task
item as completed as well**

**Example workflow:**
1. Start working on task
2. Complete implementation
3. **IMMEDIATELY** update the task file: change `[ ]` to `[x]`

## Task File Organization

Each task is stored in a separate file in the `docs/tasks/` folder:
- `task-1-cloudfront-infrastructure.md`
- `task-2-auth0-authentication.md`
- `task-3-user-onboarding.md`
- etc.

This organization improves:
- File manageability and load times
- Focused work on individual features
- Better git history and change tracking
- Easier navigation and reference

## Task Definition Guidelines

### General Task Definition Rules

1. **Tasks must result in code changes** - Each task should cause tangible changes to the
   codebase (manual tasks like testing and deployment are exceptions)

2. **Avoid check/verification tasks** - Don't create tasks that only check or verify something
   unless changes are explicitly planned as part of the task

3. **Provide specific, detailed descriptions** - Avoid vague descriptions like "make it better,"
   "improve," or "update something" without concrete details about what exactly needs to be changed

4. **Use concrete notation for code changes** - When planning changes to specific types, classes,
   interfaces, or methods, use concrete notation like `ClassName.methodName`, 
   `InterfaceName.propertyName`, or `ComponentName.handlerFunction` to clearly identify what 
   code elements will be modified

5. **Keep logically coupled work together** - If implementing task A automatically implements 
   task B, or if tasks cannot be done independently, combine them into a single work item rather 
   than creating artificial splits

### General Workflow Rules

- Add enhancement ideas and non-MVP features to docs/future_enhancements.md instead of
  creating new tasks here
- Keep this roadmap focused on core functionality delivery

### Task Structure Definitions

**Task:** A major user-facing feature or business capability that delivers value. Written from
user/product owner perspective describing what functionality will be available. Uses single-digit
numbering (e.g., "Task 1", "Task 2").

**Phase:** Major implementation phases within a task following the architectural layers
(Database Layer, Repository Layer, etc.). Uses two-digit numbering format `X.Y` (e.g., "1.1",
"1.2") where X is the task number and Y is the phase number.

**Sub-item:** Specific work items within a concrete phase implementation. Uses three-digit
numbering format `X.Y.Z` (e.g., "1.1.1", "1.1.2") where X is task number, Y is phase number,
and Z is the sub-item number.

### Required Task Content Sections

#### Objective

Clear, concise description of the main goal and value delivered.

#### Current State Analysis

Multi-domain breakdown of what exists vs. what's missing, using ✅/❌ indicators to clearly
scope the work.

#### Target Architecture

High-level architectural direction including:
- Which application layers/components will be affected (frontend, backend, database)
- General data flow and component interaction patterns
- UI layout concepts and user experience flow (avoid detailed TypeScript interfaces or
  specific API schemas)
- Navigation structure changes if applicable

#### Implementation Plan

Hierarchical numbered phases following a bottom-up, layer-by-layer approach through the
application architecture.

**Formatting:**

- Use GitHub markdown ordered lists with checkboxes `[ ]`
- Use hierarchical numbering format `1.2.3` (maximum 3 levels)

**Recommended Structure:**

**1. Database Layer**

- Development database setup (table creation, schema changes)
- Production infrastructure updates (CDK stack modifications for new tables/indexes)
- Data migrations if existing data needs to be transformed

**2. Repository Layer**

- Data access operations (CRUD methods, query implementations)
- Error handling and validation at data layer

**3. Service Layer**

- Business logic implementation
- Cross-repository coordination and validation
- Service error handling and business rules

**4. GraphQL Layer**

- Schema definitions (types, inputs, queries, mutations)
- Resolver implementations with input validation
- Integration with service layer

**5. Frontend Data Layer**

- GraphQL client queries and mutations
- Data composables and state management
- Error handling for API operations

**6. Frontend UI/UX Layer**

- Component implementation
- User interface and user experience
- Form validation and user feedback

**Guidelines:**
- Each phase should build upon the previous layer's foundation

#### Testing

Final validation phase separate from implementation, containing concrete testing steps with
specific expected outcomes.

**Formatting:**

- Use GitHub markdown ordered lists with checkboxes `[ ]`
- Use hierarchical numbering format continuing from Implementation Plan
- Add `[M]` prefix to all testing items requiring manual execution

**Recommended Structure:**

**Code Quality Validation**

- Linting and type checking
- Fix any code quality issues

**Integration Testing**

- Concrete manual testing steps with specific expected outcomes
- Test core functionality workflows
- Test edge cases and error scenarios
- Test multiple data scenarios (different currencies, balance states, transaction types)

**Production Deployment**

- Deploy to production environment
- Validate core functionality in production

**Guidelines:**

- Provide specific test steps with exact expected results (e.g., "verify shows $1,500.00")
- Test both happy path and edge cases in development environment
- Include multiple data scenarios (different currencies, balance states, transaction types)
- Production testing should only validate core user workflows, not edge cases or complex scenarios


## Navigation

- [📚 General Specification](general_spec.md)
- [⚙️ Technical Specification](tech_spec.md)
