/**
 * Validation utilities for form components and date/year validation
 */

export type CheckRule<T = string> = (value: T) => boolean | string;

/**
 * Helper function to check if validation rules pass
 * @param value The value to validate
 * @param rules Array of validation rules to apply
 * @returns true if all rules pass, false otherwise
 */
export const checkRules = <T>(value: T, rules: CheckRule<T>[]): boolean => {
  return rules.every((rule) => rule(value) === true);
};
