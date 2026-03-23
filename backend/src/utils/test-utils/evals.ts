const DEFAULT_RUNS = 5;
const DEFAULT_THRESHOLD_GRADE = toGrade(0.8);

type Grade = number & { readonly __brand: unique symbol };

function isGrade(value: number): value is Grade {
  return value >= 0 && value <= 1;
}

function toGrade(value: number): Grade {
  if (!isGrade(value)) {
    throw new Error(
      `Value ${value} is not a valid grade. Must be between 0 and 1.`,
    );
  }

  return value;
}

export interface EvalTask<TInput> {
  name: string;
  run: (iteration: number) => Promise<{
    input: TInput;
    grades: { name: string; value: boolean | Grade }[];
  }>;
}

export async function runEvalTask<TInput>(
  evalTask: EvalTask<TInput>,
  { runs = DEFAULT_RUNS }: { runs?: number } = {},
): Promise<{ avgGrade: Grade; errors: number }> {
  const iterationGrades: number[] = [];
  let errors = 0;
  for (let iteration = 0; iteration < runs; iteration++) {
    try {
      const { grades } = await evalTask.run(iteration);
      const normalizedGrades = grades.map((grade) => Number(grade.value));
      const avgIterationGrade = avg(normalizedGrades);
      iterationGrades.push(avgIterationGrade);
    } catch (error) {
      console.error(
        `Error running iteration ${iteration} of task ${evalTask.name}:`,
        error,
      );
      errors++;
      iterationGrades.push(0); // Treat errors as zero grade
      continue;
    }
  }

  const avgGrade = toGrade(avg(iterationGrades));

  return { avgGrade, errors };
}

export async function runEvalSuite(
  evalTasks: EvalTask<unknown>[],
  {
    runs = DEFAULT_RUNS,
    thresholdGrade = DEFAULT_THRESHOLD_GRADE,
  }: { runs?: number; thresholdGrade?: Grade } = {},
): Promise<
  { evalTaskName: string; avgGrade: Grade; errors: number; success: boolean }[]
> {
  const result: {
    evalTaskName: string;
    avgGrade: Grade;
    errors: number;
    success: boolean;
  }[] = [];

  for (const evalTask of evalTasks) {
    const { avgGrade, errors } = await runEvalTask(evalTask, { runs });
    const success = avgGrade >= thresholdGrade;
    result.push({ evalTaskName: evalTask.name, avgGrade, errors, success });
  }

  return result;
}

function avg(numbers: number[]): number {
  if (numbers.length === 0) return 0;

  return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
}
