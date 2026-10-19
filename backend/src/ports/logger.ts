export interface Logger {
  error(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
}
