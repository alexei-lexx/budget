import { EvalTaskResult } from "./evals";

const MAX_TASK_NAME_LENGTH = 40;

function truncate(str: string, max: number): string {
  return str.length <= max ? str : `${str.slice(0, max - 1)}…`;
}

function formatInput(input: unknown): string {
  return typeof input === "string" ? input : JSON.stringify(input);
}

export function reportToConsole(evalTaskResults: EvalTaskResult<unknown>[]): {
  failed: number;
  totalErrors: number;
} {
  const failed = evalTaskResults.filter((result) => !result.success).length;
  const totalErrors = evalTaskResults.reduce(
    (sum, result) => sum + result.errors,
    0,
  );

  console.table(
    evalTaskResults.map(({ evalTaskName, success, avgGrade, errors }) => ({
      task: truncate(evalTaskName, MAX_TASK_NAME_LENGTH),
      status: success ? "PASS" : "FAIL",
      avgGrade,
      errors,
    })),
  );

  for (const { evalTaskName, success, trials } of evalTaskResults) {
    if (success) continue;

    const failedTrials = trials.map((trial) => ({
      input: formatInput(trial.input),
      ...Object.fromEntries(
        trial.grades.map(({ name, value }) => [name, value]),
      ),
    }));

    if (failedTrials.length > 0) {
      console.error(`\nFailed trials — ${evalTaskName}`);
      console.table(failedTrials);
    }
  }

  return { failed, totalErrors };
}
