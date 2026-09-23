import { faker } from "@faker-js/faker";
import { describe, expect, it, vi } from "vitest";
import { BusinessError } from "../../services/business-error";
import {
  GUIDES,
  Guide,
  assertGuideTokens,
  buildGuideTokensField,
} from "./guides";

describe("Guide", () => {
  describe("token", () => {
    it("has form name.HASH8", () => {
      // Arrange
      const guide = new Guide({
        name: "basics",
        summary: faker.lorem.sentence(),
        instruction: faker.lorem.paragraph(),
      });

      // Act & Assert
      expect(guide.token).toMatch(/^basics\.[0-9A-F]{8}$/);
    });

    it("returns same token when read twice within same hour", () => {
      // Arrange
      const guide = new Guide({
        name: "basics",
        summary: faker.lorem.sentence(),
        instruction: faker.lorem.paragraph(),
      });
      // Freezes clock inside hour bucket 10:00-11:00
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:05:00.000Z"));
      const first = guide.token;

      try {
        // Act
        // Moves clock, still inside same hour bucket
        vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:55:00.000Z"));
        const second = guide.token;

        // Assert
        expect(second).toBe(first);
      } finally {
        // Restores clock even if assertion above fails
        vi.useRealTimers();
      }
    });

    it("returns different tokens when read in different hour buckets", () => {
      // Arrange
      const guide = new Guide({
        name: "basics",
        summary: faker.lorem.sentence(),
        instruction: faker.lorem.paragraph(),
      });
      // Freezes clock inside hour bucket 10:00-11:00
      vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:50:00.000Z"));
      const first = guide.token;

      try {
        // Act
        // Freezes clock inside hour bucket 11:00-12:00
        vi.setSystemTime(new Date("2000-01-02T11:10:00.000Z"));
        const second = guide.token;

        // Assert
        expect(second).not.toBe(first);
      } finally {
        // Restores clock even if assertion above fails
        vi.useRealTimers();
      }
    });
  });
});

describe("assertGuideTokens", () => {
  // Happy path

  it("accepts matching tokens for required guide", () => {
    // Arrange
    const guides = Object.values(GUIDES);

    // Act & Assert
    const validTokens = guides.map((guide) => guide.token);
    expect(() =>
      assertGuideTokens({
        guideTokens: validTokens,
        requiredGuides: guides.map((guide) => guide.name),
      }),
    ).not.toThrow();
  });

  it("ignores tokens for guides that were not required", () => {
    // Act & Assert
    expect(() =>
      assertGuideTokens({
        guideTokens: ["irrelevant.DEADBEEF"],
        requiredGuides: [],
      }),
    ).not.toThrow();
  });

  it("accepts token from previous hour bucket", () => {
    // Arrange
    // Issues token in hour bucket 10:00-11:00
    vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:10:00.000Z"));
    const previousToken = GUIDES.basics.token;
    // Crosses into next hour bucket
    vi.setSystemTime(new Date("2000-01-02T11:20:00.000Z"));

    try {
      // Act & Assert
      expect(() =>
        assertGuideTokens({
          guideTokens: [previousToken],
          requiredGuides: ["basics"],
        }),
      ).not.toThrow();
    } finally {
      // Restores clock even if assertion above fails
      vi.useRealTimers();
    }
  });

  // Validation failures

  it("rejects missing token", () => {
    // Act
    const act = () =>
      assertGuideTokens({
        guideTokens: [],
        requiredGuides: ["basics"],
      });

    // Assert
    expect(act).toThrow(
      new BusinessError(
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
      ),
    );
  });

  it("rejects malformed token", () => {
    // Act
    const act = () =>
      assertGuideTokens({
        guideTokens: ["not-a-token"],
        requiredGuides: ["basics"],
      });

    // Assert
    expect(act).toThrow(
      new BusinessError(
        "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
      ),
    );
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
      const act = () =>
        assertGuideTokens({
          guideTokens: [staleToken],
          requiredGuides: ["basics"],
        });

      // Assert
      expect(act).toThrow(
        new BusinessError(
          "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
        ),
      );
    } finally {
      // Restores clock even if assertion above fails
      vi.useRealTimers();
    }
  });

  it("rejects and names only guide missing its token", () => {
    // Arrange
    const guides = Object.values(GUIDES);
    const missingGuide = guides[0]!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const otherGuides = guides.slice(1);

    // Act
    const act = () =>
      assertGuideTokens({
        guideTokens: otherGuides.map((guide) => guide.token),
        requiredGuides: [missingGuide.name, ...otherGuides.map((g) => g.name)],
      });

    // Assert
    expect(act).toThrow(
      new BusinessError(
        `Missing or invalid guide token for: ${missingGuide.name}. Reload the guide(s) and retry`,
      ),
    );
  });

  it("does not disclose valid token in failure message", () => {
    // Act
    const act = () =>
      assertGuideTokens({ guideTokens: [], requiredGuides: ["basics"] });

    // Assert
    expect(act).toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining(GUIDES.basics.token),
      }),
    );
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
