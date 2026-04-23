import { describe, expect, it } from "@jest/globals";
import {
  RepositoryError,
  VersionConflictError,
} from "../../ports/repository-error";
import { BusinessError } from "../business-error";
import { handleVersionConflict } from "./handle-version-conflict";

describe("handleVersionConflict", () => {
  // Happy path

  it("returns operation result on success", async () => {
    // Act
    const result = await handleVersionConflict("Entity", async () => 42);

    // Assert
    expect(result).toBe(42);
  });

  // Dependency failures

  it("maps VersionConflictError to retry BusinessError", async () => {
    // Act & Assert
    await expect(
      handleVersionConflict("Entity", async () => {
        throw new VersionConflictError();
      }),
    ).rejects.toThrow(
      new BusinessError("Entity was modified, please reload and try again"),
    );
  });

  it("passes through unrelated errors unchanged", async () => {
    // Arrange
    const other = new RepositoryError("boom", "QUERY_FAILED");

    // Act & Assert
    await expect(
      handleVersionConflict("Entity", async () => {
        throw other;
      }),
    ).rejects.toBe(other);
  });
});
