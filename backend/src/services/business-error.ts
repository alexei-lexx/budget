/**
 * Business error class for service-layer error handling
 * Used for domain-specific validation failures and business rule violations
 */
export class BusinessError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "BusinessError";
  }
}

/**
 * Common business error codes for standardized error handling
 */
export const BusinessErrorCodes = {
  ACCOUNT_CURRENCY_CHANGE_BLOCKED: "ACCOUNT_CURRENCY_CHANGE_BLOCKED",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
  CURRENCY_MISMATCH: "CURRENCY_MISMATCH",
  INVALID_AMOUNT: "INVALID_AMOUNT",
  INVALID_CATEGORY_TYPE: "INVALID_CATEGORY_TYPE",
  INVALID_DATE: "INVALID_DATE",
  INVALID_DESCRIPTION: "INVALID_DESCRIPTION",
  INVALID_PARAMETERS: "INVALID_PARAMETERS",
  INVALID_TRANSFER_STATE: "INVALID_TRANSFER_STATE",
  SELF_TRANSFER_NOT_ALLOWED: "SELF_TRANSFER_NOT_ALLOWED",
  TRANSACTION_NOT_FOUND: "TRANSACTION_NOT_FOUND",
  TRANSFER_DELETION_FAILED: "TRANSFER_DELETION_FAILED",
  TRANSFER_NOT_FOUND: "TRANSFER_NOT_FOUND",
  TRANSFER_UPDATE_FAILED: "TRANSFER_UPDATE_FAILED",
} as const;
