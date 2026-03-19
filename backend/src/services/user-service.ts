import { Failure, Result, Success } from "../types/result";
import { UpdateUserInput, UserRepository } from "./ports/user-repository";
import {
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
} from "./transaction-service";

export interface UserSettingsData {
  voiceInputLanguage?: string;
  transactionPatternsLimit?: number;
}

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getSettings(userId: string): Promise<Result<UserSettingsData>> {
    if (!userId) {
      return Failure("User ID is required");
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      return Failure("User not found");
    }

    return Success({
      voiceInputLanguage: user.voiceInputLanguage,
      transactionPatternsLimit: user.transactionPatternsLimit,
    });
  }

  async updateSettings({
    userId,
    voiceInputLanguage,
    transactionPatternsLimit,
  }: {
    userId: string;
    voiceInputLanguage?: string;
    transactionPatternsLimit?: number;
  }): Promise<Result<UserSettingsData>> {
    if (!userId) {
      return Failure("User ID is required");
    }

    if (transactionPatternsLimit !== undefined) {
      if (
        !Number.isInteger(transactionPatternsLimit) ||
        transactionPatternsLimit < MIN_TRANSACTION_PATTERNS_LIMIT ||
        transactionPatternsLimit > MAX_TRANSACTION_PATTERNS_LIMIT
      ) {
        return Failure(
          `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
        );
      }
    }

    const updateInput: UpdateUserInput = {};

    if (voiceInputLanguage !== undefined) {
      updateInput.voiceInputLanguage = voiceInputLanguage;
    }

    if (transactionPatternsLimit !== undefined) {
      updateInput.transactionPatternsLimit = transactionPatternsLimit;
    }

    const updated = await this.userRepository.update(userId, updateInput);

    return Success({
      voiceInputLanguage: updated.voiceInputLanguage,
      transactionPatternsLimit: updated.transactionPatternsLimit,
    });
  }
}
