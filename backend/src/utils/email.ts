import validator from "validator";

/**
 * Normalizes an email address for storage and lookup.
 * Applies trimming, lowercasing, and Unicode NFC normalization.
 *
 * @param email - Raw email address
 * @returns Normalized email address
 * @throws Error if email is empty or invalid
 */
export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase().normalize("NFC");

  if (!normalized) {
    throw new Error("Email must be a non-empty string");
  }

  return normalized;
}

/**
 * Validates email format according to RFC 5322 standards.
 * Uses validator.js for RFC-compliant validation.
 *
 * @param email - Email address to validate (should be normalized first)
 * @returns true if valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  // Email length: RFC 5321 allows max 254 characters
  if (email.length > 254) {
    return false;
  }

  // Local part (before @) max 64 characters
  const [localPart] = email.split("@");
  if (localPart && localPart.length > 64) {
    return false;
  }

  // Use validator.js for RFC-compliant validation
  return validator.isEmail(email);
}

/**
 * Normalizes and validates email address.
 * Combines normalization and validation into a single operation.
 *
 * @param email - Raw email address
 * @returns Normalized email address
 * @throws Error if email is invalid format
 */
export function normalizeAndValidateEmail(email: string): string {
  const normalized = normalizeEmail(email);
  if (!validateEmail(normalized)) {
    throw new Error(`Invalid email address: ${email}`);
  }
  return normalized;
}
