import { faker } from "@faker-js/faker";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConsoleLogger } from "./console-logger";

describe("ConsoleLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("error", () => {
    // Happy path

    it("passes all arguments to console.error", () => {
      // Arrange

      // Captures console output
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      const logger = new ConsoleLogger();
      const message = faker.lorem.sentence();
      const firstDetail = new Error(faker.lorem.sentence());
      const secondDetail = { id: faker.string.uuid() };

      // Act
      logger.error(message, firstDetail, secondDetail);

      // Assert
      expect(consoleError).toHaveBeenCalledWith(
        message,
        firstDetail,
        secondDetail,
      );
    });
  });

  describe("info", () => {
    // Happy path

    it("passes all arguments to console.log", () => {
      // Arrange

      // Captures console output
      const consoleLog = vi
        .spyOn(console, "log")
        .mockImplementation(() => undefined);

      const logger = new ConsoleLogger();
      const message = faker.lorem.sentence();
      const firstDetail = { id: faker.string.uuid() };
      const secondDetail = faker.number.int();

      // Act
      logger.info(message, firstDetail, secondDetail);

      // Assert
      expect(consoleLog).toHaveBeenCalledWith(
        message,
        firstDetail,
        secondDetail,
      );
    });
  });
});
