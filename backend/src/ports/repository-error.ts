export class RepositoryError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

export class VersionConflictError extends RepositoryError {
  constructor(originalError?: unknown) {
    super("Version conflict", "VERSION_CONFLICT", originalError);
    this.name = "VersionConflictError";
  }
}
