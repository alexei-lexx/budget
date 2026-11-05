# AI Model Experiments: Judge Fix Rerun

## Summary

A bug in agentevals hid the final answer of OpenAI models from the LLM judge.
The judge failed correct GPT-6 Luna trajectories because of it.
With the fix, GPT-6 Luna has a pass rate of 97.8%, against 91.4% before.
GPT-6 Luna and gpt-oss-120b now have about the same pass rate.

Previous experiment: `docs/2026-11-03 ai-model-experiments.md`

## Judge Bug

- agentevals 0.0.7 converts the message content to text with a template string
- OpenAI models return the final message content as an array of blocks
- The judge got `[object Object]` instead of the final answer of GPT-6 Luna and GPT-6.1 Terra
- The judge failed correct trajectories because the final answer was missing
- `backend/patches/agentevals+0.0.7.patch` joins the text blocks before the judge gets them (#774)
- The previous pass rate and trajectory accuracy of GPT-6 Luna and GPT-6.1 Terra are too low

## Setup

- Eval suite: `backend/src/langchain/agents/create-transaction-agent.eval.test.ts`
- Model: GPT-6 Luna (`openai:gpt-6-luna`)
- Judge model: `bedrock:openai.gpt-oss-120b-1:0`
- Commit: `3a575e84`
- 31 tests, 3 runs, 93 test runs
- Results are in LangSmith experiments of the `CreateTransactionAgent` dataset

## Results

| Experiment       | Pass rate | Trajectory accuracy | Trajectory superset match |
| ---------------- | --------- | ------------------- | ------------------------- |
| `formal-mist-90` | 100%      | 100%                | 100%                      |
| `slight-tub-89`  | 96.8%     | 96.7%               | 95.0%                     |
| `cooked-law-98`  | 96.8%     | 100%                | 95.0%                     |
| Mean             | 97.8%     | 98.9%               | 96.7%                     |

Change against the previous experiment:

| Model              | Pass rate | Trajectory accuracy |
| ------------------ | --------- | ------------------- |
| gpt-oss-120b (old) | 95.7%     | 77.8%               |
| GPT-6 Luna (old)   | 91.4%     | 57.8%               |
| GPT-6 Luna (fixed) | 97.8%     | 98.9%               |

- Cost and latency were not measured in the rerun
- The gpt-oss-120b results come from the older commit `ae1f2e67`

## Learnings

- GPT-6 Luna has a pass rate 2.1 points higher than gpt-oss-120b
- The gap is in the run-to-run range, so the two models are about equal
- The only failed test is "prefers explicit amount over HH:MM under voice input", with 1 of 3 runs passed
- The gpt-oss-120b judge gives correct verdicts after the fix, so a judge change is not necessary
- GPT-6.1 Terra as judge gave the same verdicts on the 3 judge tests, but the check had no wrong answers to fail

## Recommendation

- Switch to GPT-6 Luna (`openai:gpt-6-luna`) with no loss in pass rate
- Keep gpt-oss-120b as the judge model

Next steps:

- Fix the prompt for "prefers explicit amount over HH:MM under voice input"
- Report the agentevals bug upstream
