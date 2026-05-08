/* Run with: npx tsx tmp/jest-to-vitest-codemod.ts (from backend/)
 *
 * Mechanically rewrites Jest API usage to Vitest API usage across
 * test files and test-utils helpers in this package.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const find = (cmd: string): string[] =>
  execSync(cmd, { cwd: "src" })
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((p) => `src/${p}`);

const testFiles = find(`find . -name '*.test.ts'`);
const intFiles = find(`find . -name '*.int.test.ts'`);
const utilFiles = (() => {
  try {
    return execSync(`grep -rl '@jest/globals' src/utils/test-utils`)
      .toString()
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
})();

const files = [...new Set([...testFiles, ...intFiles, ...utilFiles])];

let changed = 0;
for (const file of files) {
  const original = readFileSync(file, "utf8");
  if (!original.includes("@jest/globals") && !/\bjest\./.test(original)) {
    continue;
  }

  let content = original;

  // 1. Detect type-name usage BEFORE substitution.
  const usesMockedFunction = /\bjest\.MockedFunction\b/.test(content);
  const usesMocked = /\bjest\.Mocked\b/.test(content);
  const usesMock = /\bjest\.Mock\b/.test(content);

  // 2. Order matters: longest first so \b excludes substrings.
  content = content.replace(/\bjest\.MockedFunction\b/g, "MockedFunction");
  content = content.replace(/\bjest\.Mocked\b/g, "Mocked");
  content = content.replace(/\bjest\.Mock\b/g, "Mock");
  content = content.replace(/\bjest\./g, "vi.");

  // 3. Rewrite the @jest/globals import to vitest.
  content = content.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']@jest\/globals["'];?/g,
    (_match, raw: string) => {
      const names = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((n) => (n === "jest" ? "vi" : n));
      const has = (n: string) =>
        names.some((entry) => entry === n || entry === `type ${n}`);
      if (usesMockedFunction && !has("MockedFunction")) {
        names.push("type MockedFunction");
      }
      if (usesMocked && !has("Mocked")) {
        names.push("type Mocked");
      }
      if (usesMock && !has("Mock")) {
        names.push("type Mock");
      }
      return `import { ${names.join(", ")} } from "vitest";`;
    },
  );

  if (content !== original) {
    writeFileSync(file, content);
    console.log(`migrated: ${file}`);
    changed += 1;
  }
}

console.log(`\n${changed} file(s) migrated of ${files.length} candidate(s).`);
