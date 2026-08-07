import { describe, expect, it, vi } from "vitest";
import { GUIDES, buildGuideTokensField, verifyGuideTokens } from "./guides";

describe("GUIDES", () => {
  it("basics token has form name.HASH8", () => {
    // Act & Assert
    expect(GUIDES.basics.token).toMatch(/^basics\.[0-9A-F]{8}$/);
  });

  describe("token", () => {
    it("returns same token when read twice within same hour", () => {
      // Arrange
      // Freezes clock inside hour bucket 10:00-11:00
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:05:00.000Z"));
      const first = GUIDES.basics.token;

      try {
        // Act
        // Moves clock, still inside same hour bucket
        vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:55:00.000Z"));
        const second = GUIDES.basics.token;

        // Assert
        expect(second).toBe(first);
      } finally {
        // Restores clock even if assertion above fails
        vi.useRealTimers();
      }
    });

    it("returns different tokens when read in different hour buckets", () => {
      // Arrange
      // Freezes clock inside hour bucket 10:00-11:00
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:50:00.000Z"));
      const first = GUIDES.basics.token;

      try {
        // Act
        // Freezes clock inside hour bucket 11:00-12:00
        vi.setSystemTime(new Date("2000-01-02T11:10:00.000Z"));
        const second = GUIDES.basics.token;

        // Assert
        expect(second).not.toBe(first);
      } finally {
        // Restores clock even if assertion above fails
        vi.useRealTimers();
      }
    });
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

  it("accepts token from previous hour bucket", () => {
    // Arrange
    // Issues token in hour bucket 10:00-11:00
    vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:10:00.000Z"));
    const previousToken = GUIDES.basics.token;
    // Crosses into next hour bucket
    vi.setSystemTime(new Date("2000-01-02T11:20:00.000Z"));

    try {
      // Act
      const result = verifyGuideTokens({
        guideTokens: [previousToken],
        requiredGuides: ["basics"],
      });

      // Assert
      expect(result).toEqual({
        success: true,
        data: true,
      });
    } finally {
      // Restores clock even if assertion above fails
      vi.useRealTimers();
    }
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

  it("rejects token issued two or more hours ago", () => {
    // Arrange
    // Issues token in hour bucket 10:00-11:00
    vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:00:00.000Z"));
    const staleToken = GUIDES.basics.token;
    // Crosses into hour bucket 12:00-13:00
    vi.setSystemTime(new Date("2000-01-02T12:00:00.000Z"));

    try {
      // Act
      const result = verifyGuideTokens({
        guideTokens: [staleToken],
        requiredGuides: ["basics"],
      });

      // Assert
      expect(result).toEqual({
        success: false,
        error:
          "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
      });
    } finally {
      // Restores clock even if assertion above fails
      vi.useRealTimers();
    }
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
