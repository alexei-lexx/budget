# AI Model Experiments: Baseline With Repetitions

## Summary

The eval suite ran 4 times per test to find flaky tests.
The pass rate is 96.8% (151 of 156 test runs).
3 of the 5 failures come from account selection: the model counts transactions per account incorrectly.
1 failure is a voice amount that the agent did not correct.
1 failure is a judge error, not an agent error.

## Setup

- Eval suite: `backend/src/langchain/agents/create-transaction-agent.eval.test.ts`
- Model: GPT-6 Luna (`openai:gpt-6-luna`)
- Judge model: `bedrock:openai.gpt-oss-120b-1:0`
- Commit: `55f3d946`
- 39 tests, 4 runs, 156 test runs
- LangSmith experiment: `baseline-20261106-4-times` in the `CreateTransactionAgent` dataset

## Results

| Test                                                                   | Passed |
| ---------------------------------------------------------------------- | ------ |
| selects most used account overall                                      | 2/4    |
| selects most used account for category                                 | 3/4    |
| corrects suspiciously high amount from voice input using price history | 3/4    |
| produces description that only lists purchased items                   | 3/4    |
| All other tests (35)                                                   | 4/4    |

## Failure Analysis

### Account selection: incorrect count

"selects most used account overall", 2 failures:

- `get_transactions` returned correct data: account A has 3 transactions, account B has 5
- In date order, the accounts alternate: A, B, A, B, A, B, B, B
- The reasoning summary says: "I'm trying to figure out how to resolve ties in account transactions based on usage"
- The model saw a tie that does not exist
- The model then queried the previous year, got no data, and selected account A, the first account in the list

"selects most used account for category", 1 failure:

- The query for the groceries category returned cash 3 and card 5
- The reasoning summary says: "category accounts, specifically four for each"
- Because of the incorrect tie, the model went to the next rule, overall history
- The model counted correctly at that step ("cash is 8 compared to card at 5") and selected cash

Cause:

- The prompt says "prefer the account most used" (`create-transaction-agent.ts`, Account rules 4 and 5)
- No tool counts transactions per account, so the model counts IDs in a long list
- The rule "MUST use the available calculation tools" applies only to amounts

### Voice amount: price history ignored

"corrects suspiciously high amount from voice input using price history", 1 failure:

- Input: "sandwich 987" from voice input
- The agent did both lookups and got food transactions of 10, 7 and 10 EUR
- The agent created the transaction with amount 987, not 9.87
- The decision step used only 39 reasoning tokens and has no reasoning summary
- The voice subprompt tells the model to look up history, but has no rule for an amount far outside the history range

### Judge error

"produces description that only lists purchased items", 1 failure:

- The agent created a correct transaction
- The judge (`gpt-oss-120b` on Bedrock) returned no tool call
- `@langchain/aws` threw "No tool calls found in the response."
- This failure is noise in the eval setup, not an agent failure

## Recommendation

- Give the create-transaction agent a tool that returns the transaction count per account
- `backend/src/langchain/tools/aggregate-transactions.ts` exists, but the agent does not use it and it groups only by currency
- A prompt change alone ("count per account") will probably stay flaky
- Add a rule to the voice subprompt: if the amount is far outside the range of similar transactions, MUST select the decimal interpretation closest to that range
- Retry the judge call once when the judge returns no tool call
