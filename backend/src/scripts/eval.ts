import path from "path";
import { glob } from "glob";
import {
  EvalTaskResult,
  collectAndResetTasks,
  runEvalSuite,
} from "../utils/test-utils/evals";
import { reportToConsole } from "../utils/test-utils/evals-console-reporter";

(async () => {
  const singleEvalFile = process.argv[2];
  const files = singleEvalFile
    ? [singleEvalFile]
    : await glob("src/**/*.eval.ts");

  if (files.length === 0) {
    console.error("No eval files found.");
    process.exit(1);
  }

  const allResults: EvalTaskResult<unknown>[] = [];

  for (const file of files) {
    console.log(`\nEvaluating: ${file}`);

    await import(path.resolve(file));
    const evalTasks = collectAndResetTasks();
    const fileResults = await runEvalSuite(evalTasks);

    allResults.push(
      ...fileResults.map((result) => ({
        ...result,
        evalTaskName: `${path.basename(file, ".eval.ts")}: ${result.evalTaskName}`,
      })),
    );
  }

  console.log("\nEval report:");
  const { failureCount: totalFailureCount, errorCount: totalErrorCount } =
    reportToConsole(allResults);

  if (totalFailureCount > 0 || totalErrorCount > 0) {
    console.error(
      `${totalFailureCount} eval task(s) failed. ${totalErrorCount} error(s) occurred.`,
    );
    process.exit(1);
  } else {
    console.log("All eval tasks passed successfully.");
    process.exit(0);
  }
})();
