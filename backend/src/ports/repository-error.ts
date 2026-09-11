export class RepositoryError extends Error {
  constructor(
    message: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = "RepositoryError";
  }
}

export class VersionConflictError extends RepositoryError {
  constructor(originalError?: unknown) {
    super("Version conflict", originalError);
    this.name = "VersionConflictError";
  }
}
