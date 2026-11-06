# Design

## Context

See proposal.md - Why.

Current state relevant to this design:

- One agent, `create-transaction-agent` (`backend/src/langchain/agents/create-transaction-agent.ts`), serves both the quick text input (`CreateTransactionFromTextService`) and the assistant chat (through the `create_transaction_subagent` tool)
- The agent has 4 tools: `get_accounts`, `get_categories`, `get_transactions`, `create_transaction`
- `toolCallLimitMiddleware` limits `create_transaction` to 1 run per invocation
- The Amount section of the agent prompt says: "If multiple amounts are present, MUST stop and report an error"
- The MCP `create-transaction` guide (`backend/src/mcp/tools/guides.ts`) has the same line
- `backend/src/langchain/tools/math.ts` has `sumTool`; only the assistant agent uses it today
- The eval file has 3 helpers: `testToolCalls` (superset trajectory match on listed args), `testWithJudge` (LLM judge), and `testNoTransactionCreated`

## Goals / Non-Goals

**Goals:**

- Change prompt text, the agent tool list, and the `sumTool` calculation; no code path changes in services, GraphQL, or frontend
- Keep the in-app agent and the MCP guide consistent on item prices and alternative amounts

**Non-Goals:**

- No change to category, account, date, or description inference rules
- No compound transaction tool for the in-app agent

## Decisions

### Replace the "multiple amounts" rule in the Amount section

The agent prompt and the MCP guide replace the single rule with 2 rules:

- Item prices of one purchase: sum them into one amount
- Alternative amounts (for example, "10 or 20"): stop and report an error

In the MCP guide, the first rule applies to item prices of one category.
The MCP guide adds a rule in domain terms: items of different categories are recorded as a compound transaction.
The guide does not name tools; the `create_compound_transaction` tool description maps the rule to the tool.
The in-app agent does not get this rule, because it does not have the compound tool.

Alternative considered: a separate "Items" section in the prompt.
Rejected, because the rule is about how to resolve the amount, and the Amount section is where the agent looks for it.

### Add `sumTool` to the agent

The agent gets the existing `sumTool`.
The prompt tells the agent to sum the item prices; the `sumTool` description maps the rule to the tool.
The tool call limit stays on `create_transaction` only, so one sum call does not use the creation budget.

Alternative considered: let the model add the numbers.
Rejected, because model arithmetic fails on decimals more often than a tool call.

The MCP guide cannot give the external agent a tool.
It only tells the agent to sum the item prices.

### Exact decimal sum in `sumTool`

`sumTool` uses floating-point addition: `sum([0.1, 0.2])` returns `0.30000000000000004`.
`sumTool` adds the numbers as mathjs BigNumbers and returns the result as a number.
The sum of decimal inputs is then exact, and the agent does not round.
A unit test checks that `sumTool` with `[0.1, 0.2]` returns `0.3`.

Alternative considered: the prompt tells the agent to round the sum.
Rejected, because rounding by the model is model arithmetic, which the sum tool exists to avoid.

Alternative considered: round the sum to a fixed number of decimals.
Rejected, because the backend has no currency precision, and a fixed precision can cut valid decimals.

The assistant agent also uses `sumTool`; its report totals lose the floating-point error too.

### Description lists the items

The existing description rules already say "describe the item or service".
No new description rule is added; an eval checks that the description lists the items.

### Evals

New cases in `create-transaction-agent.eval.test.ts`, with the existing helpers:

| Case                  | Input                                        | Helper                     | Check                                            |
| --------------------- | -------------------------------------------- | -------------------------- | ------------------------------------------------ |
| Same category         | "meat 2 and milk 3 euro"                     | `testToolCalls`            | `amount: 5`, `categoryId: groceries`             |
| Different categories  | "meat 2 and shampoo 3 euro"                  | `testToolCalls`            | `amount: 5` only; the run log shows the category |
| Decimals              | "bread 1.29, cheese 3.45, butter 2.19 euro"  | `testToolCalls`            | `amount: 6.93`                                   |
| Float drift           | "gum 0.1 and candy 0.2 euro"                 | `testToolCalls`            | `amount: 0.3`                                    |
| Written amounts       | "coffee two euros and croissant three fifty" | `testToolCalls`            | `amount: 5.5`                                    |
| Quantity is not price | "2 kg of apples for 5 euro"                  | `testToolCalls`            | `amount: 5`                                      |
| Description           | "meat 2 and milk 3 euro"                     | `testWithJudge`            | description lists only the items                 |
| Alternatives          | "paid 10 or 20 euros"                        | `testNoTransactionCreated` | no `create_transaction` call                     |

The "different categories" case is for observation: `testToolCalls` uses superset match, so an unlisted `categoryId` is not compared.

## Risks / Trade-offs

- [The agent reads a quantity as a price, for example "2 kg of apples for 5 euro" as 2 + 5] → The prompt defines an item price as a money amount; the "quantity is not price" eval checks it
- [The agent reads item prices as alternatives, or alternatives as item prices] → Evals for both cases
- [External MCP agents add numbers without a tool and can make arithmetic errors] → Accepted; the guide can only state the rule
- [The guide text change invalidates guide tokens issued before the deploy] → Expected behavior; agents load the guide again

## Migration Plan

None. Prompt, guide text, agent tool list, and `sumTool` changes only. Rollback is a revert of the commit.

## Constitution Compliance

- **Backend Hexagonal Architecture**: the agent gets a pure calculation tool; transaction creation still goes through `TransactionService`. Compliant
- **Schema-Driven Development**: no GraphQL change. Not applicable
- **Result Pattern**: `sumTool` already returns a Result. Compliant
- **Test Strategy**: no service or repository change; agent behavior is checked with evals in the co-located `create-transaction-agent.eval.test.ts`. Compliant
