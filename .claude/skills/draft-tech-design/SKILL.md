---
name: draft-tech-design
description: "Draft a Technical Design Document for a mid-size or large feature. Guides through requirements gathering, outline creation, stakeholder feedback, and layer-by-layer implementation analysis. Use when the user wants to design a feature, plan a significant change, create a Technical Design Document, or think through the architecture of something new — even if they just say 'let's design X' or 'how should we build Y'."
---

# draft-tech-design

Produce a Technical Design Document through a structured, interactive process: load context → gather requirements via quiz → draft outline → get feedback → save document → check constitution compliance.

Every interactive step requires asking the user a question and waiting for their answer before proceeding. Never batch questions — one at a time, always.

**Challenge throughout.** Don't agree by default. Push back on vague answers, challenge stated goals if the framing seems wrong, research any factual claims before accepting them, and flag failure modes in proposed approaches. Concede only when the argument actually holds.

---

## Step 1 — Load context

**1a. Find and read the constitution**

Locate the project constitution by globbing for common names (`**/constitution.md`, `**/CONSTITUTION.md`) and variations. If multiple matches are found, pick the one that reads as a project-wide standards document (defines architecture, coding rules, or constraints) — not a library file or unrelated document.

Read it in full. Let it drive every design decision made in subsequent steps.

**1b. Explore the codebase**

Discover the project structure and explore the parts relevant to the feature being designed. Look for:

- API schema or contract definitions (e.g. GraphQL schema, OpenAPI spec)
- Domain models and entities
- Data access / repository layer
- Business logic / service layer
- API handlers or resolvers
- Frontend components, pages, and routes
- Infrastructure definitions, deployment config, migrations
- Tests — to understand what's already covered and how the project tests
- Anything else the project structure reveals

Note what already exists, what would be affected, and any constraints or limitations in the current implementation that will shape design decisions.

**1c. Research**

Based on what the codebase reveals, research anything relevant to the feature. Use web search or official documentation to understand:

- External APIs, protocols, or third-party libraries: how they work, request/response format, authentication, limits, quotas, failure modes
- Best practices and common approaches for this type of feature
- Known pitfalls, trade-offs, or design patterns used in similar systems

This grounds design decisions in Step 3 in how things actually work in practice, and prevents asking the user about things that can be researched directly.

---

## Step 2 — Requirements quiz

Tell the user:

> "I've read the constitution and explored the codebase. I'll ask you ~10 questions one by one to clarify requirements. Answer each before I move on."

Ask questions **one by one**. Wait for the answer before asking the next. Adapt as you go — skip questions made irrelevant by earlier answers, add follow-ups where needed.

**Challenge each answer** before moving on. If it's vague, contradicts prior context, or makes a factual claim — push back or research it before asking the next question.

The total number of questions should reflect what the feature actually needs: fewer for straightforward changes, more for complex ones.

**Scope**: Cover functional requirements (what the system does), non-functional requirements (performance, security, reliability), and domain requirements (business or industry constraints). Do not ask about technical implementation decisions — protocols, data structures, algorithms, or architecture choices belong in Step 3. Skip any question whose answer is already clear from the issue or prior context.

Cover these areas (adapt wording to the feature):

1. **Goal** — What problem does this solve? What's the core user need?
2. **Users & roles** — Who uses this? Are there different permissions or access levels?
3. **Happy path** — Walk me through the main user flow step by step.
4. **Edge cases** — What can go wrong? What are the boundary conditions?
5. **Data scope** — What new data needs to be stored? What existing data is affected?
6. **Volume & performance** — How many records might be involved? Any pagination needs?
7. **Integration points** — Which existing features or modules does this interact with?
8. **Security** — Any authorization concerns beyond what's standard in this project?
9. **Rollback / reversibility** — Should this support undo, archiving, or soft-deletion?
10. **Out of scope** — What are we explicitly NOT building in this iteration?
11. **Observability** — How would we detect failures in production? What events must be logged? What metrics would indicate success or failure? Do we need alerts?
    - Push hard on observability answers
    - If the user cannot explain how failure would be detected, treat it as a gap and follow up

After all questions, summarise the collected requirements and confirm with the user:

> "Here's what I understood: [summary]. Does this look correct, or anything to adjust?"

---

## Step 3 — Draft the outline

Based on the requirements and codebase context, draft an outline with these sections:

### Vision

One paragraph. What this feature achieves, why it matters, and what success looks like.

### User Perspective

How the feature feels from the user's point of view:

- User stories: "As a user, I can…"
- UI flow description (prose, no wireframes needed)
- Key screens or interactions

### Architecture Overview

List the main components involved in this feature.

For each component, include:

- **Owns**: what data, logic, or responsibility it owns
- **Relations**: other components or systems it interacts with or relies on

**What counts as a component**:

- API / entry point
- Service (business logic)
- Database / storage
- Cache
- External system
- Background worker / job

**Do NOT include**:

- functions, classes, helpers
- generic layers ("service layer", "utils")

A component must have a clear responsibility and ownership.
If you can't state what it owns, don't include it.

### Sequence Diagrams

Mermaid sequence diagrams covering the main flows.
Use the actual components from the stack — both existing ones discovered in Step 1 and any new ones introduced by this feature.

Include at minimum:

- The primary happy-path flow end to end
- Any authentication or authorization steps
- Any async or multi-step operations if relevant

### Key Design Decisions

For each significant decision (data model choice, pagination strategy, service decomposition, etc.):

- **Decision**: what was chosen
- **Rationale**: why, referencing the relevant constitution principle where applicable
- **Alternative considered**: what was rejected and why
- **Trade-offs / downsides**: what this decision makes harder, riskier, or less flexible

### Observability

Define how this feature will be monitored in production:

- Key events to log
- Metrics to track (e.g. volume, latency, error rate)
- Alert conditions if applicable

---

## Step 4 — Outline feedback quiz

Present each major idea from the outline to the user **one by one**. Frame each as an agree/disagree question with space for comments.

After each answer, note any changes needed.

Once all ideas have been reviewed, apply the feedback and show the revised outline. Then ask:

> "Here's the updated outline. Happy to proceed, or any final changes?"

Wait for approval before continuing.

---

## Step 5 — Save the document

Find or create an appropriate directory for design documents by looking at the project's existing structure and naming conventions.

Save the document as:

```
<docs-dir>/<kebab-case-feature-name>.md
```

Document structure at this point:

```markdown
# Technical Design: <Feature Name>

## Vision

## User Perspective

## Architecture Overview

## Sequence Diagrams

## Key Design Decisions

## Observability
```

Confirm the file path to the user.

---

## Step 6 — Constitution compliance check

Re-read the constitution. Review the design document against every relevant principle it defines — architecture rules, coding standards, naming conventions, data model constraints, test strategy, and anything else it mandates.

For each violation or concern found:

- Quote the relevant constitution principle
- Describe how the design conflicts with or risks violating it
- Propose a concrete adjustment to bring it into compliance

If no issues are found, state that explicitly.

Report the findings to the user. Ask for their feedback on each concern raised. Once they respond, ask:

> "Should I update the document to reflect these adjustments?"

Wait for confirmation before making any changes to the saved document.
