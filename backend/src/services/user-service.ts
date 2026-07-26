import { ModelError } from "../models/model-error";
import { DEFAULT_TRANSACTION_PATTERNS_LIMIT, User } from "../models/user";
import { UserRepository } from "../ports/user-repository";
import { Failure, Result, Success } from "../types/result";

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

  async ensureUser(email: string): Promise<User> {
    const existing = await this.userRepository.findOneByEmail(email);

    if (existing) {
      return existing;
    }

    const user = User.create({ email });
    await this.userRepository.create(user);
    return user;
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

    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return Failure("User not found");
    }

    try {
      const updated = user.update({
        transactionPatternsLimit,
        voiceInputLanguage,
      });

      await this.userRepository.update(updated);

      return Success({
        transactionPatternsLimit:
          updated.transactionPatternsLimit ??
          DEFAULT_TRANSACTION_PATTERNS_LIMIT,
        voiceInputLanguage: updated.voiceInputLanguage,
      });
    } catch (error) {
      if (error instanceof ModelError) {
        return Failure(error.message);
      }
      throw error;
    }
  }
}
