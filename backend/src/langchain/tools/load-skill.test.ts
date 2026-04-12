import { describe, expect, it } from "@jest/globals";
import { insightSkill } from "../skills/insight";
import { createLoadSkillTool } from "./load-skill";

describe("createLoadSkillTool", () => {
  // Happy path

  it("should have tool name 'loadSkill'", () => {
    // Act
    const loadSkillTool = createLoadSkillTool([insightSkill]);

    // Assert
    expect(loadSkillTool.name).toBe("loadSkill");
  });

  it("should return the skill prompt when invoked with a valid skill name", async () => {
    // Arrange
    const loadSkillTool = createLoadSkillTool([insightSkill]);

    // Act
    const result = await loadSkillTool.invoke({ skillName: "insight" });

    // Assert
    expect(result).toBe(insightSkill.prompt);
  });

  // Validation failures

  it("should throw when skills list is empty", () => {
    // Act & Assert
    expect(() => createLoadSkillTool([])).toThrow(
      "createLoadSkillTool requires at least one skill",
    );
  });

  it("should throw when invoked with an unknown skill name", async () => {
    // Arrange
    const loadSkillTool = createLoadSkillTool([insightSkill]);

    // Act & Assert
    await expect(
      loadSkillTool.invoke({ skillName: "unknown" }),
    ).rejects.toThrow("Received tool input did not match expected schema");
  });
});
