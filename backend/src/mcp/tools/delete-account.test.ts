import { faker } from "@faker-js/faker";
import { Failure, Success } from "ts-result";
import {
  type Mocked,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { toAccountDto } from "../../langchain/tools/account-dto";
import { AccountService } from "../../services/account-service";
import { toDateTimeString } from "../../types/date-time-string";
import { fakeAccount } from "../../utils/test-utils/models/account-fakes";
import { createMockAccountService } from "../../utils/test-utils/services/account-service-mocks";
import { deleteAccount } from "./delete-account";
import { GUIDES } from "./guides";

describe("deleteAccount", () => {
  const userId = faker.string.uuid();
  let mockAccountService: Mocked<AccountService>;
  let deps: { accountService: Mocked<AccountService>; userId: string };
  let validGuideToken: string;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date("2000-01-02T10:00:00.000Z"));

    // Guide tokens rotate hourly, so read token after freezing clock
    validGuideToken = GUIDES.basics.token;
    mockAccountService = createMockAccountService();
    deps = { accountService: mockAccountService, userId };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Happy path

  it("deletes account created within last hour and returns it", async () => {
    // Arrange
    const account = fakeAccount({
      createdAt: toDateTimeString("2000-01-02T09:30:00.000Z"),
    });
    // Finds account among user's active accounts
    mockAccountService.getAccountsByUser.mockResolvedValue(
      Success([fakeAccount(), account, fakeAccount()]),
    );
    // Archives and returns account
    const archived = account.archive();
    mockAccountService.deleteAccount.mockResolvedValue(Success(archived));

    // Act
    const result = await deleteAccount(
      { id: account.id, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(result).toBeSuccess(toAccountDto(archived));

    expect(mockAccountService.getAccountsByUser).toHaveBeenCalledWith(
      userId,
      "ACTIVE",
    );

    expect(mockAccountService.deleteAccount).toHaveBeenCalledWith(
      account.id,
      userId,
    );
  });

  // Validation failures

  it("fails without valid basics guide token", async () => {
    // Act
    const result = await deleteAccount(
      { id: faker.string.uuid(), guideTokens: [] },
      deps,
    );

    // Assert
    expect(result).toBeFailure(
      "Missing or invalid guide token for: basics. Reload the guide(s) and retry",
    );
    expect(mockAccountService.getAccountsByUser).not.toHaveBeenCalled();
    expect(mockAccountService.deleteAccount).not.toHaveBeenCalled();
  });

  it("fails when account is not among user's active accounts", async () => {
    // Arrange
    // User has no matching active account
    mockAccountService.getAccountsByUser.mockResolvedValue(
      Success([fakeAccount()]),
    );

    // Act
    const result = await deleteAccount(
      { id: faker.string.uuid(), guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(result).toBeFailure("Account not found");
    expect(mockAccountService.deleteAccount).not.toHaveBeenCalled();
  });

  it("fails when account was created more than one hour ago", async () => {
    // Arrange
    const account = fakeAccount({
      createdAt: toDateTimeString("2000-01-02T08:00:00.000Z"),
    });
    // Finds user's old account
    mockAccountService.getAccountsByUser.mockResolvedValue(Success([account]));

    // Act
    const result = await deleteAccount(
      { id: account.id, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(result).toBeFailure(
      "Only accounts created within the last 1 hour can be deleted by an agent. Delete older accounts in the app.",
    );
    expect(mockAccountService.deleteAccount).not.toHaveBeenCalled();
  });

  // Dependency failures

  it("fails when service rejects deletion", async () => {
    // Arrange
    const account = fakeAccount();
    // Finds user's recent account
    mockAccountService.getAccountsByUser.mockResolvedValue(Success([account]));
    // Rejects deletion
    mockAccountService.deleteAccount.mockResolvedValue(
      Failure("Something went wrong"),
    );

    // Act
    const result = await deleteAccount(
      { id: account.id, guideTokens: [validGuideToken] },
      deps,
    );

    // Assert
    expect(result).toBeFailure("Something went wrong");
  });
});
