# AI Model Experiments: Create Transaction Agent

## Summary

5 AI models were compared on the create transaction agent evals.
GPT-6 Luna has a pass rate 4.3 points lower than gpt-oss-120b and costs 70% less per test.
The recommendation is to switch to GPT-6 Luna.

## Hypothesis

- A cheaper model can keep the pass rate close to gpt-oss-120b
- Primary metric: pass rate
- Guardrail metrics: cost per test, test latency, trajectory accuracy

## Setup

- Eval suite: `backend/src/langchain/agents/create-transaction-agent.eval.test.ts`
- 31 tests, 3 runs per model, 93 test runs per model
- Judge model: `bedrock:openai.gpt-oss-120b-1:0` for all runs
- Baseline: gpt-oss-120b, the current model
- Results are in LangSmith experiments of the `CreateTransactionAgent` dataset

| Model         | Model ID                             | Input price | Output price |
| ------------- | ------------------------------------ | ----------- | ------------ |
| gpt-oss-120b  | `bedrock:openai.gpt-oss-120b-1:0`    | $0.15       | $0.60        |
| GPT-6 Luna    | `openai:gpt-6-luna`                  | $0.10       | $0.50        |
| GPT-6.1 Terra | `openai:gpt-6.1-terra`               | $1.00       | $5.00        |
| Nova Micro    | `bedrock:amazon.nova-micro-v1:0`     | $0.046      | $0.184       |
| Nova 2 Lite   | `bedrock:us.amazon.nova-2-lite-v1:0` | $0.429      | $3.597       |

Prices are USD per 1M tokens.

## Results

Mean of 3 runs, change against gpt-oss-120b in brackets:

| Model         | Pass rate        | Pass rate range | Trajectory accuracy | Cost per test    | Cold-cache cost per test | Test latency (median) |
| ------------- | ---------------- | --------------- | ------------------- | ---------------- | ------------------------ | --------------------- |
| gpt-oss-120b  | 95.7%            | 90.3–100%       | 77.8%               | $0.00134         | $0.00134                 | 6.0 s                 |
| GPT-6 Luna    | 91.4% (−4.3 pt)  | 87.1–96.8%      | 57.8% (−20.0 pt)    | $0.00040 (−70%)  | $0.00063 (−53%)          | 7.8 s (+1.8 s)        |
| GPT-6.1 Terra | 90.3% (−5.4 pt)  | 90.3–90.3%      | 45.0% (−32.8 pt)    | $0.00290 (+116%) | $0.00551 (+311%)         | 7.9 s (+1.9 s)        |
| Nova Micro    | 57.0% (−38.7 pt) | 51.6–64.5%      | 30.0% (−47.8 pt)    | $0.00059 (−56%)  | $0.00059 (−56%)          | 4.9 s (−1.1 s)        |
| Nova 2 Lite   | 65.6% (−30.1 pt) | 64.5–67.7%      | 33.3% (−44.5 pt)    | $0.00594 (+343%) | $0.00594 (+343%)         | 5.3 s (−0.7 s)        |

- Cost per test is the measured cost and includes prompt caching
- Cold-cache cost per test assumes no cache hits between tests, as in production
- Trajectory accuracy covers only 3 tests, so one failed test changes it by about 11 points
- The pass rate ranges of gpt-oss-120b and GPT-6 Luna overlap, so the 4.3-point gap is not certain

## Learnings

- GPT-6 Luna and GPT-6.1 Terra fail the same tests, so the cause is probably the prompt, not the model
- GPT-6.1 Terra is not better than GPT-6 Luna and costs about 7 times more
- Nova models are fast but fail too many tests: Nova Micro fails 19 of 31 tests at least once, Nova 2 Lite fails 13
- Nova 2 Lite costs more than gpt-oss-120b because of its output price and large prompts
- Nova models use 50–65% more prompt tokens than gpt-oss-120b for the same tests
- About 72% of GPT-6 Luna cache reads come from calls in the same test, so caching helps also in production
- Bedrock does not support prompt caching for gpt-oss-120b
- The dynamic parts of the system prompt (`{VOICE_INPUT_SUBPROMPT}`, `{TODAY}`) break the cache between requests
- OpenAI models are about 2 seconds slower per test

## Recommendation

- Switch to GPT-6 Luna (`openai:gpt-6-luna`)
- Accept the lower pass rate for the lower cost
- GPT-6 Luna accepts images, which a future receipt scan feature needs

Next steps:

- Fix the prompt for the tests that GPT-6 models fail, then run the evals again
- Run the evals with GPT-6 Luna as the judge model to check the judge effect

## Appendix

### Failed Tests

Passed runs out of 3, for tests that gpt-oss-120b, GPT-6 Luna, or GPT-6.1 Terra failed at least once:

| Test                                                                   | gpt-oss-120b | GPT-6 Luna | GPT-6.1 Terra |
| ---------------------------------------------------------------------- | ------------ | ---------- | ------------- |
| skips description that equals category name                            | 3            | 0          | 0             |
| skips description that equals translated category name                 | 1            | 1          | 1             |
| prefers explicit amount over HH:MM under voice input                   | 3            | 1          | 0             |
| corrects suspiciously high amount from voice input using price history | 2            | 3          | 3             |
| creates income transaction                                             | 2            | 3          | 3             |
| selects most used account overall                                      | 3            | 2          | 3             |
| produces description that only lists purchased items                   | 3            | 3          | 2             |

### Prompt Caching

Cache tokens per test, split by the first LLM call of a test and the later calls of the same test:

| Model         | Call  | Prompt | Cache read | Cache write |
| ------------- | ----- | ------ | ---------- | ----------- |
| GPT-6 Luna    | First | 2,042  | 1,991      | 48          |
| GPT-6 Luna    | Later | 5,783  | 5,160      | 616         |
| GPT-6.1 Terra | First | 2,042  | 1,991      | 48          |
| GPT-6.1 Terra | Later | 4,895  | 4,344      | 546         |

- Cache reads in the first call come from earlier tests
- Cache reads in later calls come from earlier calls of the same test

### LangSmith Experiments

| Model         | Experiments                                                             |
| ------------- | ----------------------------------------------------------------------- |
| gpt-oss-120b  | `ample-measure-59`, `damp-underwear-22`, `earnest-paste-30`             |
| GPT-6 Luna    | `fresh-mitten-16`, `dear-condition-98`, `glossy-wine-47`                |
| GPT-6.1 Terra | `kind-appointment-45`, `excellent-government-58`, `memorable-crayon-57` |
| Nova Micro    | `only-touch-9`, `roasted-scale-72`, `monthly-look-26`                   |
| Nova 2 Lite   | `fresh-poison-13`, `fixed-backpack-29`, `pertinent-power-90`            |
