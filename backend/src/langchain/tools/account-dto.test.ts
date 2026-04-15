import { describe, expect, it } from "@jest/globals";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { toAccountDto } from "./account-dto";

describe("toAccountDto", () => {
  // Happy path

  it("should map the exposed fields from the account", () => {
    // Arrange
    const account = fakeAccount({
      name: "Checking",
      currency: "USD",
      isArchived: false,
    });

    // Act
    const dto = toAccountDto(account);

    // Assert
    expect(dto).toEqual({
      id: account.id,
      name: "Checking",
      currency: "USD",
      isArchived: false,
    });
  });
});
