import { faker } from "@faker-js/faker";
import { fakeAccount } from "../../utils/test-utils/factories";
import { createMockAccountRepository } from "../../utils/test-utils/mock-repositories";
import { AccountRepository } from "../ports/account-repository";
import { EntityScope, createGetAccountsTool } from "./get-accounts-tool";

describe("createGetAccountsTool", () => {
  let mockAccountRepository: jest.Mocked<AccountRepository>;
  const userId = faker.string.uuid();

  beforeEach(() => {
    mockAccountRepository = createMockAccountRepository();
  });

  it("should return tool with correct name", () => {
    const tool = createGetAccountsTool(mockAccountRepository, userId);

    expect(tool.name).toBe("getAccounts");
  });

  it("should call repository", async () => {
    mockAccountRepository.findAllByUserId.mockResolvedValue([]);

    const tool = createGetAccountsTool(mockAccountRepository, userId);
    await tool.func({ scope: EntityScope.ALL });

    expect(mockAccountRepository.findAllByUserId).toHaveBeenCalledWith(userId);
  });

  it("should return all accounts when scope is all", async () => {
    const mockAccounts = [
      fakeAccount({ isArchived: true }),
      fakeAccount({ isArchived: false }),
    ];
    mockAccountRepository.findAllByUserId.mockResolvedValue(mockAccounts);

    const tool = createGetAccountsTool(mockAccountRepository, userId);
    const result = await tool.func({ scope: EntityScope.ALL });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].isArchived).toBe(true);
    expect(parsed[1].isArchived).toBe(false);
  });

  it("should return only active accounts when scope is active", async () => {
    const mockAccounts = [
      fakeAccount({ isArchived: true }),
      fakeAccount({ isArchived: false }),
    ];
    mockAccountRepository.findAllByUserId.mockResolvedValue(mockAccounts);

    const tool = createGetAccountsTool(mockAccountRepository, userId);
    const result = await tool.func({ scope: EntityScope.ACTIVE });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].isArchived).toBe(false);
  });

  it("should return only archived accounts when scope is archived", async () => {
    const mockAccounts = [
      fakeAccount({ isArchived: true }),
      fakeAccount({ isArchived: false }),
    ];
    mockAccountRepository.findAllByUserId.mockResolvedValue(mockAccounts);

    const tool = createGetAccountsTool(mockAccountRepository, userId);
    const result = await tool.func({ scope: EntityScope.ARCHIVED });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].isArchived).toBe(true);
  });

  it("should return accounts as JSON string", async () => {
    const mockAccounts = [fakeAccount(), fakeAccount()];
    mockAccountRepository.findAllByUserId.mockResolvedValue(mockAccounts);

    const tool = createGetAccountsTool(mockAccountRepository, userId);
    const result = await tool.func({ scope: EntityScope.ALL });

    expect(typeof result).toBe("string");
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("should return required fields only", async () => {
    const mockAccounts = [
      fakeAccount({
        userId,
        name: "Checking Account",
        currency: "USD",
        isArchived: false,
      }),
      fakeAccount({
        userId,
        name: "Savings Account",
        currency: "EUR",
        isArchived: true,
      }),
    ];
    mockAccountRepository.findAllByUserId.mockResolvedValue(mockAccounts);

    const tool = createGetAccountsTool(mockAccountRepository, userId);
    const result = await tool.func({ scope: EntityScope.ALL });

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);

    expect(parsed[0]).toEqual({
      id: mockAccounts[0].id,
      name: "Checking Account",
      currency: "USD",
      isArchived: false,
    });

    expect(parsed[1]).toEqual({
      id: mockAccounts[1].id,
      name: "Savings Account",
      currency: "EUR",
      isArchived: true,
    });
  });

  it("should return empty array when user has no accounts", async () => {
    mockAccountRepository.findAllByUserId.mockResolvedValue([]);

    const tool = createGetAccountsTool(mockAccountRepository, userId);
    const result = await tool.func({ scope: EntityScope.ALL });

    expect(result).toBe("[]");
  });
});
