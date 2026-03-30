import path from "path";
import { glob } from "glob";

(async () => {
  const files = await glob("src/**/*.eval.ts");
  let totalFailureCount = 0;
  let totalErrorCount = 0;

  for (const file of files) {
    console.log(`\nEvaluating: ${file}`);

    const { evaluate } = await import(path.resolve(file));
    const { failureCount, errorCount } = await evaluate();

    totalFailureCount += failureCount;
    totalErrorCount += errorCount;
  }

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
