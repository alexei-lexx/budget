import { UpdateUserInput, UserRepository } from "../ports/user-repository";
import { Failure, Result, Success } from "../types/result";
import {
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
} from "./transaction-service";

export interface UserSettingsData {
  transactionPatternsLimit: number;
  voiceInputLanguage?: string;
}

export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async getSettings(userId: string): Promise<Result<UserSettingsData>> {
    if (!userId) {
      return Failure("User ID is required");
    }

    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return Failure("User not found");
    }

    return Success({
      transactionPatternsLimit:
        user.transactionPatternsLimit ?? DEFAULT_TRANSACTION_PATTERNS_LIMIT,
      voiceInputLanguage: user.voiceInputLanguage,
    });
  }

  async updateSettings({
    userId,
    transactionPatternsLimit,
    voiceInputLanguage,
  }: {
    userId: string;
    transactionPatternsLimit?: number;
    voiceInputLanguage?: string;
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

    if (transactionPatternsLimit !== undefined) {
      updateInput.transactionPatternsLimit = transactionPatternsLimit;
    }

    if (voiceInputLanguage !== undefined) {
      updateInput.voiceInputLanguage = voiceInputLanguage;
    }

    const updated = await this.userRepository.update(userId, updateInput);

    return Success({
      transactionPatternsLimit:
        updated.transactionPatternsLimit ?? DEFAULT_TRANSACTION_PATTERNS_LIMIT,
      voiceInputLanguage: updated.voiceInputLanguage,
    });
  }
}
