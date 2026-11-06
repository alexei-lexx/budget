# Spec Delta

## ADDED Requirements

### Requirement: Amount Breakdown in the Create-Transaction Guide

The `create-transaction` guide SHALL tell the agent how to record a transaction when the input gives an amount breakdown and no total. The amount breakdown SHALL be summed into one transaction amount. Multiple amounts that are not an amount breakdown (for example, "10 or 20") SHALL be reported as an error, and no transaction SHALL be recorded.

#### Scenario: Guide states the rule for an amount breakdown

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `load_guides` with `names` = `["create-transaction"]`
- **THEN** the guide text states that an amount breakdown without a total is summed into one transaction amount

#### Scenario: Guide states the rule for alternative amounts

- **GIVEN** an authenticated MCP connection
- **WHEN** the agent invokes `load_guides` with `names` = `["create-transaction"]`
- **THEN** the guide text states that multiple amounts that are not an amount breakdown are an error
