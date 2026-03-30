import path from "path";
import { glob } from "glob";

(async () => {
  const files = await glob("src/**/*.eval.ts");
  for (const file of files) {
    await import(path.resolve(file));
  }
})();
