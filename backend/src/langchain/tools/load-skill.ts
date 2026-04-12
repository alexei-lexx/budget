import { tool } from "langchain";
import { z } from "zod";
import { AgentSkill } from "../../ports/agent-types";

export function createLoadSkillTool(skills: AgentSkill[]) {
  if (skills.length === 0) {
    throw new Error("createLoadSkillTool requires at least one skill");
  }

  const skillList = skills
    .map((skill) => `- "${skill.name}": ${skill.description}`)
    .join("\n");
  const skillNames = skills.map((skill) => skill.name) as [string, ...string[]];

  return tool(
    ({ skillName }: { skillName: string }) => {
      const skill = skills.find((item) => item.name === skillName);
      return skill?.prompt;
    },
    {
      name: "loadSkill",
      description: `Load a skill prompt to get domain-specific instructions before proceeding.\n\nAvailable skills:\n${skillList}`,
      schema: z.object({
        skillName: z.enum(skillNames).describe("The skill to load"),
      }),
    },
  );
}
