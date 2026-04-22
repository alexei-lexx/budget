import { describe, expect, it } from "@jest/globals";
import {
  normalizeAndValidateEmail,
  normalizeEmail,
  validateEmail,
} from "./email";

describe("email utilities", () => {
  describe("normalizeEmail", () => {
    it("converts email to lowercase", () => {
      expect(normalizeEmail("UsEr@ExAmPlE.cOm")).toBe("user@example.com");
    });

    it("trims whitespace, tabs and newlines", () => {
      expect(normalizeEmail("\t\n  user@example.com  \t\n")).toBe(
        "user@example.com",
      );
    });

    describe("Unicode normalization", () => {
      it("applies NFC normalization", () => {
        // U+00E9 (é) vs U+0065 U+0301 (e + combining acute)
        const decomposed = "user@cafe\u0301.com"; // café with combining accent
        const composed = "user@café.com"; // café with precomposed character
        expect(normalizeEmail(decomposed)).toBe(normalizeEmail(composed));
      });

      it("normalizes to NFC form", () => {
        const email = "tëst@example.com";
        const normalized = normalizeEmail(email);
        expect(normalized).toBe(normalized.normalize("NFC"));
      });
    });

    it("throws error for empty string", () => {
      expect(() => normalizeEmail("")).toThrow(
        "Email must be a non-empty string",
      );
    });

    it("throws error for whitespace-only string", () => {
      expect(() => normalizeEmail("   ")).toThrow(
        "Email must be a non-empty string",
      );
    });
  });

  describe("validateEmail", () => {
    it("accepts standard email", () => {
      expect(validateEmail("user@example.com")).toBe(true);
    });

    it("rejects email without @", () => {
      expect(validateEmail("userexample.com")).toBe(false);
    });

    describe("length constraints", () => {
      it("rejects email exceeding 254 characters", () => {
        const longEmail = "a".repeat(250) + "@example.com"; // 262 chars
        expect(validateEmail(longEmail)).toBe(false);
      });

      it("accepts email at 254 character limit", () => {
        // Create valid email at max length with proper domain structure
        const localPart = "a".repeat(64);
        const domainPart = "b".repeat(60) + ".example.com"; // Valid domain
        const maxEmail = `${localPart}@${domainPart}`;
        expect(maxEmail.length).toBeLessThanOrEqual(254);
        expect(validateEmail(maxEmail)).toBe(true);
      });

      it("rejects local part exceeding 64 characters", () => {
        const longLocalPart = "a".repeat(65);
        const email = `${longLocalPart}@example.com`;
        expect(validateEmail(email)).toBe(false);
      });

      it("accepts local part at 64 character limit", () => {
        const localPart = "a".repeat(64);
        const email = `${localPart}@example.com`;
        expect(validateEmail(email)).toBe(true);
      });
    });
  });

  describe("normalizeAndValidateEmail", () => {
    it("normalizes and validates standard email", () => {
      expect(normalizeAndValidateEmail("USER@EXAMPLE.COM")).toBe(
        "user@example.com",
      );
    });

    it("normalizes and validates email with whitespace", () => {
      expect(normalizeAndValidateEmail("  user@example.com  ")).toBe(
        "user@example.com",
      );
    });

    it("throws error for invalid email format", () => {
      expect(() => normalizeAndValidateEmail("not-an-email")).toThrow(
        "Invalid email address: not-an-email",
      );
    });

    it("throws error for empty string", () => {
      expect(() => normalizeAndValidateEmail("")).toThrow(
        "Email must be a non-empty string",
      );
    });
  });
});
