const DEFAULT_RUNS = 5;
const DEFAULT_THRESHOLD_GRADE = toGrade(0.8);

type Grade = number & { readonly __brand: unique symbol };

function isGrade(value: number): value is Grade {
  return value >= 0 && value <= 1;
}

export function toGrade(value: boolean | number): Grade {
  if (typeof value === "boolean") {
    return value ? PASS : FAIL;
  }

  if (!isGrade(value)) {
    throw new Error(
      `Value ${value} is not a valid grade. Must be between 0 and 1.`,
    );
  }

  return value;
}

export const PASS = toGrade(1);
export const FAIL = toGrade(0);

export interface EvalTask<TInput> {
  name: string;
  run: (iteration: number) => Promise<{
    input: TInput;
    grades: { name: string; value: Grade }[];
  }>;
}

export interface EvalTrialResult<TInput> {
  input: TInput;
  grades: { name: string; value: Grade }[];
  avgGrade: Grade;
}

export interface EvalTaskResult<TInput> {
  evalTaskName: string;
  avgGrade: Grade;
  errors: number;
  success: boolean;
  trials: EvalTrialResult<TInput>[];
}

export async function runEvalTask<TInput>(
  evalTask: EvalTask<TInput>,
  { runs = DEFAULT_RUNS }: { runs?: number } = {},
): Promise<{
  avgGrade: Grade;
  errors: number;
  trials: EvalTrialResult<TInput>[];
}> {
  const gradeList: number[] = [];
  let errors = 0;
  const trials: EvalTrialResult<TInput>[] = [];

  for (let iteration = 0; iteration < runs; iteration++) {
    try {
      const { input, grades } = await evalTask.run(iteration);
      const avgGrade = toGrade(avg(grades.map((item) => item.value)));
      gradeList.push(avgGrade);
      trials.push({ input, grades, avgGrade });
    } catch (error) {
      console.error(
        `Error running iteration ${iteration} of task ${evalTask.name}:`,
        error,
      );
      errors++;
      gradeList.push(FAIL); // Treat errors as zero grade
      continue;
    }
  }

  const avgGrade = toGrade(avg(gradeList));

  return { avgGrade, errors, trials };
}

export async function runEvalSuite(
  evalTasks: EvalTask<unknown>[],
  {
    runs = DEFAULT_RUNS,
    thresholdGrade = DEFAULT_THRESHOLD_GRADE,
  }: { runs?: number; thresholdGrade?: Grade } = {},
): Promise<EvalTaskResult<unknown>[]> {
  const result: EvalTaskResult<unknown>[] = [];

  for (const evalTask of evalTasks) {
    const { avgGrade, errors, trials } = await runEvalTask(evalTask, { runs });
    const success = avgGrade >= thresholdGrade;
    result.push({
      evalTaskName: evalTask.name,
      avgGrade,
      errors,
      success,
      trials,
    });
  }

  return result;
}

function avg(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}
