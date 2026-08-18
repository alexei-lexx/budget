import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { Result, Success } from "../../types/result";
import { GUIDES, GUIDE_NAMES, Guide, GuideName } from "./guides";
import { toToolResult } from "./to-tool-result";

export async function loadGuides({
  names,
}: {
  names: GuideName[];
}): Promise<Result<Pick<Guide, "name" | "instruction" | "token">[]>> {
  const guides = [];

  for (const name of new Set(names)) {
    const guide = GUIDES[name];

    guides.push({
      name: guide.name,
      instruction: guide.instruction,
      token: guide.token,
    });
  }

  return Success(guides);
}

const inputSchema = z.object({
  names: z.array(z.enum(GUIDE_NAMES)).describe("Names of the guides to load"),
});

const guideList = Object.entries(GUIDES)
  .map(([name, guide]) => `- ${name}: ${guide.summary}`)
  .join("\n");

const description = `
Load domain knowledge guides needed to use the other tools correctly.

Certain actions depend on this knowledge
and will not proceed until the relevant guide has been loaded.

IMPORTANT: you MUST follow loaded guides' rules whenever they apply.

Available guides:
${guideList}
`.trim();

export function registerLoadGuidesTool(server: McpServer): void {
  server.registerTool(
    "load_guides",
    { description, inputSchema },
    async ({ names }) => toToolResult(await loadGuides({ names })),
  );
}
