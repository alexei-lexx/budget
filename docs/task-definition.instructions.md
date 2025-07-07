# Task Definition Instructions

This document provides comprehensive guidelines for defining new tasks in the Personal Finance Tracker project.

## General Workflow Rules

- Add enhancement ideas and non-MVP features to @docs/future_enhancements.md instead of creating new tasks here
- Keep this roadmap focused on core functionality delivery

## Task Structure Definitions

**Task:** A major user-facing feature or business capability that delivers value. Written from user/product owner perspective describing what functionality will be available. Uses single-digit numbering (e.g., "Task 1", "Task 2").

**Phase:** Major implementation phases within a task following the architectural layers (Database Layer, Repository Layer, etc.). Uses two-digit numbering format `X.Y` (e.g., "1.1", "1.2") where X is the task number and Y is the phase number.

**Sub-item:** Specific work items within a concrete phase implementation. Uses three-digit numbering format `X.Y.Z` (e.g., "1.1.1", "1.1.2") where X is task number, Y is phase number, and Z is the sub-item number.

## Required Task Content Sections

### Objective

Clear, concise description of the main goal and value delivered.

### Current State Analysis

Multi-domain breakdown of what exists vs. what's missing, using ✅/❌ indicators to clearly scope the work.

### Target Architecture

High-level architectural direction including:
- Which application layers/components will be affected (frontend, backend, database)
- General data flow and component interaction patterns
- UI layout concepts and user experience flow (avoid detailed TypeScript interfaces or specific API schemas)
- Navigation structure changes if applicable

### Implementation Plan

Hierarchical numbered phases following a bottom-up, layer-by-layer approach through the application architecture.

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
- Avoid splitting work into items that cannot be implemented independently
- If two tasks cannot be done separately, combine them into a single work item
- Each phase should build upon the previous layer's foundation

### Testing

Final validation phase separate from implementation, containing concrete testing steps with specific expected outcomes.

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
