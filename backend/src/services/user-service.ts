import { User } from "../models/user";
import { UserRepository } from "../ports/user-repository";
import {
  DEFAULT_INTERFACE_LANGUAGE,
  isSupportedInterfaceLanguage,
} from "../types/language";
import { BusinessError } from "./business-error";
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

  async ensureUser(email: string): Promise<User> {
    const existing = await this.userRepository.findOneByEmail(email);

    if (existing) {
      return existing;
    }

    const user = User.create({ email });
    await this.userRepository.create(user);
    return user;
  }

  async getSettings(userId: string): Promise<UserSettingsData> {
    if (!userId) {
      throw new BusinessError("User ID is required");
    }

    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      throw new BusinessError("User not found");
    }

    return this.buildSettingsData(user);
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
  }): Promise<UserSettingsData> {
    if (!userId) {
      throw new BusinessError("User ID is required");
    }

    if (
      transactionPatternsLimit !== undefined &&
      (!Number.isInteger(transactionPatternsLimit) ||
        transactionPatternsLimit < MIN_TRANSACTION_PATTERNS_LIMIT ||
        transactionPatternsLimit > MAX_TRANSACTION_PATTERNS_LIMIT)
    ) {
      throw new BusinessError(
        `Transaction patterns limit must be an integer between ${MIN_TRANSACTION_PATTERNS_LIMIT} and ${MAX_TRANSACTION_PATTERNS_LIMIT}`,
      );
    }

    if (
      interfaceLanguage !== undefined &&
      !isSupportedInterfaceLanguage(interfaceLanguage)
    ) {
      throw new BusinessError(
        `Unsupported interface language: ${interfaceLanguage}`,
      );
    }

    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      throw new BusinessError("User not found");
    }

    const updated = user.update({
      interfaceLanguage,
      transactionPatternsLimit,
      voiceInputLanguage,
    });

    await this.userRepository.update(updated);

    return this.buildSettingsData(updated);
  }

  async regenerateMcpToken(userId: string): Promise<UserSettingsData> {
    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      throw new BusinessError("User not found");
    }

    const updated = user.regenerateMcpToken();

    await this.userRepository.update(updated);

    return this.buildSettingsData(updated);
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
