import { describe, expect, it } from "vitest";
import { GUIDES, buildGuideTokensField, verifyGuideTokens } from "./guides";

describe("GUIDES", () => {
  it("basics token has form name.HASH8", () => {
    // Act & Assert
    expect(GUIDES.basics.token).toMatch(/^basics\.[0-9A-F]{8}$/);
  });
});

describe("verifyGuideTokens", () => {
  // Happy path

  it("accepts matching token for required guide", () => {
    // Act
    const result = verifyGuideTokens({
      guideTokens: [GUIDES.basics.token],
      requiredGuides: ["basics"],
    });

    // Assert
    expect(result).toEqual({
      success: true,
      data: true,
    });
  });

  it("ignores tokens for guides that were not required", () => {
    // Act
    const result = verifyGuideTokens({
      guideTokens: ["irrelevant.DEADBEEF"],
      requiredGuides: [],
    });

    // Assert
    expect(result).toEqual({
      success: true,
      data: true,
    });
  });

  // Validation failures

  it("rejects missing token", () => {
    // Act
    const result = verifyGuideTokens({
      guideTokens: [],
      requiredGuides: ["basics"],
    });

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    });
  });

  it("rejects malformed token", () => {
    // Act
    const result = verifyGuideTokens({
      guideTokens: ["not-a-token"],
      requiredGuides: ["basics"],
    });

    // Assert
    expect(result).toEqual({
      success: false,
      error:
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    });
  });

  it("does not disclose valid token in failure message", () => {
    // Act
    const result = verifyGuideTokens({
      guideTokens: [],
      requiredGuides: ["basics"],
    });

    // Assert
    expect(result).toEqual({
      success: false,
      error: expect.not.stringContaining(GUIDES.basics.token),
    });
  });
});

describe("buildGuideTokensField", () => {
  // Happy path

  it("describes required guides", () => {
    // Act
    const field = buildGuideTokensField(["basics"]);

    // Assert
    expect(field.description).toBe(
      "Guide tokens for the following guides: basics. IMPORTANT: you MUST follow loaded guides' rules when calling this tool.",
    );
  });

  it("describe duplicated required guides only once", () => {
    // Act
    const field = buildGuideTokensField(["basics", "basics"]);

    // Assert
    expect(field.description).toBe(
      "Guide tokens for the following guides: basics. IMPORTANT: you MUST follow loaded guides' rules when calling this tool.",
    );
  });

  it("accepts non-empty strings", () => {
    // Act
    const field = buildGuideTokensField(["basics"]);

    // Assert
    expect(field.safeParse(["token-1", "token-2"]).success).toBe(true);
  });

  // Validation failures

  it("rejects empty array", () => {
    // Act
    const field = buildGuideTokensField(["basics"]);

    // Assert
    expect(field.safeParse([]).success).toBe(false);
  });

  it("rejects empty string", () => {
    // Act
    const field = buildGuideTokensField(["basics"]);

    // Assert
    expect(field.safeParse([""]).success).toBe(false);
  });
});
