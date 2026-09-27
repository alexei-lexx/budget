import { Failure, Result, Success } from "ts-result";
import { ModelError } from "../models/model-error";
import { User } from "../models/user";
import { UserRepository } from "../ports/user-repository";
import {
  DEFAULT_INTERFACE_LANGUAGE,
  isSupportedInterfaceLanguage,
} from "../types/language";
import {
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
} from "./transaction-service";

export interface UserSettingsData {
  interfaceLanguage: string;
  transactionPatternsLimit: number;
  voiceInputLanguage?: string;
  mcpToken: string;
}

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async ensureUser(email: string): Promise<Result<User>> {
    const existing = await this.userRepository.findOneByEmail(email);

    if (existing) {
      return Success(existing);
    }

    const userResult = Result.fromThrowable(ModelError, () =>
      User.create({ email }),
    );
    if (!userResult.success) return userResult;

    const user = userResult.data;
    await this.userRepository.create(user);
    return Success(user);
  }

  async getSettings(userId: string): Promise<Result<UserSettingsData>> {
    if (!userId) {
      return Failure("User ID is required");
    }

    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return Failure("User not found");
    }

    return Success(this.buildSettingsData(user));
  }

  async updateSettings({
    userId,
    interfaceLanguage,
    transactionPatternsLimit,
    voiceInputLanguage,
  }: {
    userId: string;
    interfaceLanguage?: string;
    transactionPatternsLimit?: number;
    voiceInputLanguage?: string;
  }): Promise<Result<UserSettingsData>> {
    if (!userId) {
      return Failure("User ID is required");
    }

    if (
      transactionPatternsLimit !== undefined &&
      (!Number.isInteger(transactionPatternsLimit) ||
        transactionPatternsLimit < MIN_TRANSACTION_PATTERNS_LIMIT ||
        transactionPatternsLimit > MAX_TRANSACTION_PATTERNS_LIMIT)
    ) {
      return Failure(
        `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      );
    }

    if (
      interfaceLanguage !== undefined &&
      !isSupportedInterfaceLanguage(interfaceLanguage)
    ) {
      return Failure(`Unsupported interface language: ${interfaceLanguage}`);
    }

    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return Failure("User not found");
    }

    const updatedUserResult = Result.fromThrowable(ModelError, () =>
      user.update({
        interfaceLanguage,
        transactionPatternsLimit,
        voiceInputLanguage,
      }),
    );
    if (!updatedUserResult.success) return updatedUserResult;

    const updatedUser = updatedUserResult.data;
    await this.userRepository.update(updatedUser);

    return Success(this.buildSettingsData(updatedUser));
  }

  async regenerateMcpToken(userId: string): Promise<Result<UserSettingsData>> {
    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return Failure("User not found");
    }

    const updatedUserResult = Result.fromThrowable(ModelError, () =>
      user.regenerateMcpToken(),
    );
    if (!updatedUserResult.success) return updatedUserResult;

    const updatedUser = updatedUserResult.data;
    await this.userRepository.update(updatedUser);

    return Success(this.buildSettingsData(updatedUser));
  }

  private buildSettingsData(user: User) {
    return {
      interfaceLanguage: user.interfaceLanguage ?? DEFAULT_INTERFACE_LANGUAGE,
      mcpToken: user.mcpToken,
      transactionPatternsLimit:
        user.transactionPatternsLimit ?? DEFAULT_TRANSACTION_PATTERNS_LIMIT,
      voiceInputLanguage: user.voiceInputLanguage,
    };
  }
}
