# Feature Specification: Improve Category Inference Using Recent Transaction History

**Feature Branch**: `033-category-inference-history`
**Created**: 2026-03-08
**Status**: Draft
**Input**: GitHub Issue #212 — "improve category inference using recent transaction history"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - History-Informed Category Assignment (Priority: P1)

A user has repeatedly corrected the agent's category assignments for similar transaction descriptions. After establishing a clear pattern of corrections, the agent begins inferring the corrected category for new, similar inputs — without the user needing to correct them again.

**Why this priority**: This is the core problem statement. Repeated manual corrections that have no effect erode user trust and create ongoing friction. Fixing this is the primary value of the feature.

**Independent Test**: Can be fully tested by creating a set of transactions with similar descriptions in one category, then entering a new similar description and verifying the agent selects the historically-preferred category.

**Acceptance Scenarios**:

1. **Given** the user has 3+ transactions with descriptions like "banana & juice for snack", "fruit salad for lunch", "yogurt from corner shop" — all manually assigned to **Eating out**, **When** the user enters "quicksnack: chocolate", **Then** the agent assigns it to **Eating out**, not **Groceries**
2. **Given** a repeated correction pattern exists for a category, **When** the user enters a new description closely matching that pattern, **Then** the agent picks the historically-preferred category
3. **Given** only a single prior correction exists (no repeated pattern), **When** the user enters a similar description, **Then** the agent still applies its semantic understanding rather than blindly following the single data point

---

### User Story 2 - Unambiguous Inputs Remain Unaffected (Priority: P2)

A user enters a transaction description that clearly maps to one category with no ambiguity. The agent assigns the correct category as before, regardless of what the transaction history contains.

**Why this priority**: Introducing history-based inference must not regress accuracy for clear-cut cases. Unambiguous inputs make up the majority of transactions and must remain reliable.

**Independent Test**: Can be fully tested by entering clearly unambiguous descriptions (e.g., "monthly gym membership") and verifying the correct category is selected, even if unrelated history exists.

**Acceptance Scenarios**:

1. **Given** the user has a **Fitness** category and enters "monthly gym membership", **When** the agent infers the category, **Then** it assigns **Fitness** regardless of transaction history
2. **Given** historical data exists pointing toward a different category, **When** the input is semantically unambiguous, **Then** the historical signal does not override the clear semantic match

---

### User Story 3 - New Users with No Transaction History (Priority: P3)

A new user with no prior transaction history enters a natural language transaction. The agent infers the category using semantic understanding alone, with no degradation in quality.

**Why this priority**: New users must have a working experience from day one. The feature should gracefully handle the absence of history.

**Independent Test**: Can be fully tested by clearing all transactions for a test user and verifying category inference still functions correctly using semantic matching.

**Acceptance Scenarios**:

1. **Given** a user has no prior transactions, **When** they enter "dinner at pasta place", **Then** the agent assigns an appropriate category (e.g., **Eating out**) based on semantic understanding
2. **Given** the user has transactions but none with both a description and a category, **When** they enter a new transaction, **Then** the agent infers the category from semantic understanding without errors

---

### Edge Cases

- **Conflicting patterns**: When historical transactions for similar descriptions are split across multiple categories, the system MUST fall back to semantic-only inference, treating the conflict as ambiguous. No category wins by plurality.
- **Generic descriptions**: Very short or generic descriptions (e.g., "food", "misc") receive no special treatment — history-based inference applies normally. A consistent pattern (3+ similar descriptions to the same category) is the most reliable signal for inherently ambiguous inputs.
- **Deleted category**: Transactions referencing a category that no longer exists MUST be excluded from the historical signal, equivalent to having no assigned category (see FR-002).
- **No usable history**: When all recent transactions lack descriptions or categories, no historical signal is produced and the system falls back to semantic-only inference without errors (see FR-006).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST consider the user's recent transaction history as context when inferring the category for a new transaction
- **FR-002**: Only transactions that have both a description and a currently-existing assigned category MUST be used as historical signal — transactions missing either field, or referencing a deleted category, MUST be excluded
- **FR-003**: The system MUST weight repeated patterns in history over single occurrences — a single past correction MUST NOT be sufficient to override semantic inference
- **FR-004**: The transaction retrieval capability MUST support an optional filter to return only transactions that have an assigned category
- **FR-005**: The transaction retrieval capability MUST support an optional filter to return only transactions that have a non-empty description
- **FR-006**: When no relevant transaction history exists, the system MUST fall back to semantic-only category inference without errors or degraded behavior
- **FR-007**: Unambiguous transaction descriptions MUST continue to be categorized correctly regardless of what transaction history is present
- **FR-008**: Category inference MUST function correctly for new users who have no transaction history
- **FR-009**: When historical transactions for similar descriptions are split across multiple categories (conflicting pattern), the system MUST treat the conflict as ambiguous and fall back to semantic-only inference — no category wins by plurality
- **FR-010**: Historical signal MUST only influence category inference when semantic confidence is low or the input is ambiguous — a strong semantic match MUST take precedence over any history pattern

### Key Entities

- **Transaction**: A financial record with optional description and optional category. Transactions with both fields populated carry historical signal for category inference.
- **Category**: A user-defined label for organizing transactions (e.g., Groceries, Eating out). User corrections to categories represent explicit preference signals.
- **Historical Signal**: The aggregate pattern of past user category assignments for similar descriptions, used to inform — but not override — semantic inference. History influences the outcome only when semantic confidence is low or the input is ambiguous; a strong semantic match always takes precedence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After a user has corrected 3 or more similar descriptions to the same category, the agent selects the corrected category for a new similar ambiguous input without requiring another correction (does not apply when the new input has a strong, unambiguous semantic match to a different category)
- **SC-002**: Category accuracy for unambiguous transaction descriptions shows no regression compared to before the feature is introduced
- **SC-003**: Users with no transaction history receive correctly inferred categories at the same quality as the current baseline
- **SC-004**: Ambiguous inputs for which a clear correction pattern exists are assigned the user's preferred category at least 80% of the time

## Assumptions

- "Recent" transaction history means a fixed system-defined lookback window (e.g., last 90 days or last N transactions) — the exact value is an implementation detail and is NOT user-configurable
- The definition of "similar" descriptions is determined by the agent's existing semantic matching capability, not by exact string matching
- A "repeated pattern" means 3 or more transactions with sufficiently similar descriptions all assigned to the same category
- The two new filter parameters (`withCategoryOnly`, `withDescriptionOnly`) are additive and can be combined
- No new data is stored or persisted as a result of this feature — it relies entirely on existing transaction records

## Clarifications

### Session 2026-03-08

- Q: When history shows conflicting patterns (same description type split across multiple categories), what should the system do? → A: Fall back to semantic-only inference (treat as ambiguous)
- Q: When historical transactions reference a deleted category, what should the system do? → A: Exclude those transactions from the signal (deleted categories cannot be assigned to new transactions)
- Q: For very short or generic descriptions ("food", "misc"), should history-based inference still apply? → A: Yes, apply normally — consistent history is the most reliable signal for inherently ambiguous inputs
- Q: When history pattern (3+) and strong semantic signal point to different categories, which takes precedence? → A: Semantic inference wins — history only influences inference when semantic confidence is low or ambiguous
- Q: Should the lookback window be user-configurable or a fixed system constant? → A: Fixed system constant — not user-configurable
