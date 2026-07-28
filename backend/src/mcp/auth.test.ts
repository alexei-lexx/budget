import { type Mocked, beforeEach, describe, expect, it } from "vitest";
import { UserRepository } from "../ports/user-repository";
import { fakeUser } from "../utils/test-utils/models/user-fakes";
import { createMockUserRepository } from "../utils/test-utils/repositories/user-repository-mocks";
import { authenticateMcpToken } from "./auth";

describe("authenticateMcpToken", () => {
  let mockUserRepository: Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
  });

  // Happy path

  it("returns user matching token", async () => {
    // Arrange
    const user = fakeUser();
    mockUserRepository.findOneByMcpToken.mockResolvedValue(user);

    // Act
    const result = await authenticateMcpToken(
      "valid-token",
      mockUserRepository,
    );

    // Assert
    expect(result).toBe(user);
    expect(mockUserRepository.findOneByMcpToken).toHaveBeenCalledWith(
      "valid-token",
    );
  });

  // Validation failures

  it("returns null when token is missing", async () => {
    // Act
    const result = await authenticateMcpToken(null, mockUserRepository);

    // Assert
    expect(result).toBeNull();
    expect(mockUserRepository.findOneByMcpToken).not.toHaveBeenCalled();
  });

  it("returns null when token does not match any user", async () => {
    // Arrange
    mockUserRepository.findOneByMcpToken.mockResolvedValue(null);

    // Act
    const result = await authenticateMcpToken(
      "unmatched-token",
      mockUserRepository,
    );

    // Assert
    expect(result).toBeNull();
  });
});
