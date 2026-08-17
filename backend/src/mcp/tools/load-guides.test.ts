import { describe, expect, it } from "vitest";
import { GUIDES } from "./guides";
import { loadGuides } from "./load-guides";

describe("loadGuides", () => {
  // Happy path

  it("returns guide objects without the summary", async () => {
    // Act
    const result = await loadGuides({
      names: ["basics", "create-transaction"],
    });

    // Assert
    expect(result).toEqual({
      success: true,
      data: [
        {
          name: GUIDES.basics.name,
          instruction: GUIDES.basics.instruction,
          token: GUIDES.basics.token,
        },
        {
          name: GUIDES["create-transaction"].name,
          instruction: GUIDES["create-transaction"].instruction,
          token: GUIDES["create-transaction"].token,
        },
      ],
    });
  });

  it("deduplicates repeated guides", async () => {
    // Act
    const result = await loadGuides({ names: ["basics", "basics"] });

    // Assert
    expect(result).toEqual({
      success: true,
      data: [expect.objectContaining({ name: "basics" })],
    });
  });
});
