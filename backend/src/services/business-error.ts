/**
 * Business error class for service-layer error handling
 * Used for domain-specific validation failures and business rule violations
 */
export class BusinessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}
