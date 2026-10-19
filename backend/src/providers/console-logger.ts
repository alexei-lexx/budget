import { Logger } from "../ports/logger";

export class ConsoleLogger implements Logger {
  error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.log(message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(message, ...args);
  }
}
