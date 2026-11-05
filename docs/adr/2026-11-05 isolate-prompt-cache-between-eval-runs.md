# Isolate Prompt Cache Between Eval Runs

## Context and Problem Statement

Evals of the create-transaction agent send requests to the model provider.
The provider caches the start of the prompt for about 30 minutes.
An eval run reads the cache that earlier runs filled, also runs of unrelated experiments.
Thus, the cached tokens of a run depend on what ran before it.
This makes it impossible to see if a prompt change gives more cache reads.

How can each eval run start with an empty prompt cache?

## Decision Drivers

- Reduce the cost of evals
- Make each eval run independent of prompt caching

## Considered Options

- Unique prefix in system prompt, one per eval run
- Unique prefix in system prompt, one per test
- Wait for cache to expire before each eval run

## Decision Outcome

Chosen option: "Unique prefix in system prompt, one per eval run", because it is the only option that meets all decision drivers.

The agent factory gets the `testOnlyPromptCacheIsolationPrefix` option.
The agent puts this text at the start of the system prompt.
The eval sets it to `Request ID: <random UUID>` once per run.

### Consequences

- Good, because the first model call of each run starts with an empty cache
- Good, because tests in the same run share the cache
- Bad, because the agent factory has an option for tests only
- Bad, because the eval system prompt has one line that the production system prompt does not have

### Confirmation

Two eval runs, one after the other.
Run 2 started 5 minutes after run 1 started, within the 30-minute cache lifetime.

| Run                                               | First call                            | Second call       |
| ------------------------------------------------- | ------------------------------------- | ----------------- |
| run1 (`cache-isolation-check-20261105-2256-run1`) | `cache_read` 0, `cache_creation` 1965 | `cache_read` 1954 |
| run2 (`cache-isolation-check-20261105-2256-run2`) | `cache_read` 0, `cache_creation` 1968 | `cache_read` 1957 |

## Pros and Cons of the Options

### Unique prefix in system prompt, one per eval run

- Good, because each run starts with an empty cache
- Good, because tests in the same run read the cache, which costs less
- Bad, because the agent factory has an option for tests only

### Unique prefix in system prompt, one per test

- Good, because each test starts with an empty cache
- Bad, because the first model call of each test does not read the cache, which costs more
- Bad, because the agent factory has an option for tests only

### Wait for cache to expire before each eval run

- Good, because no code change is necessary
- Bad, because each run must wait about 30 minutes
- Bad, because other experiments can fill the cache during the wait
