import { User } from "../models/user";
import { UserRepository } from "../ports/user-repository";
import { Failure, Result, Success } from "../types/result";
import {
  DEFAULT_TRANSACTION_PATTERNS_LIMIT,
  MAX_TRANSACTION_PATTERNS_LIMIT,
  MIN_TRANSACTION_PATTERNS_LIMIT,
} from "./transaction-service";

export interface UserSettingsData {
  interfaceLanguage: string;
  transactionPatternsLimit: number;
  voiceInputLanguage?: string;
  mcpUrl: string;
}

export const SUPPORTED_INTERFACE_LANGUAGES = ["en", "de"] as const;
const DEFAULT_INTERFACE_LANGUAGE = "en";

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly apiBaseUrl: string,
  ) {}

  async ensureUser(email: string): Promise<User> {
    const existing = await this.userRepository.findOneByEmail(email);

    if (existing) {
      return existing;
    }

    const user = User.create({ email });
    await this.userRepository.create(user);
    return user;
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

  getSupportedInterfaceLanguages(userId: string): Result<string[]> {
    if (!userId) {
      return Failure("User ID is required");
    }

    return Success([...SUPPORTED_INTERFACE_LANGUAGES]);
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
      !SUPPORTED_INTERFACE_LANGUAGES.some(
        (supportedLanguage) => supportedLanguage === interfaceLanguage,
      )
    ) {
      return Failure(`Unsupported interface language: ${interfaceLanguage}`);
    }

    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return Failure("User not found");
    }

    const updated = user.update({
      interfaceLanguage,
      transactionPatternsLimit,
      voiceInputLanguage,
    });

    await this.userRepository.update(updated);

    return Success(this.buildSettingsData(updated));
  }

  async regenerateMcpToken(userId: string): Promise<Result<UserSettingsData>> {
    const user = await this.userRepository.findOneById(userId);

    if (!user) {
      return Failure("User not found");
    }

    const updated = user.regenerateMcpToken();

    await this.userRepository.update(updated);

    return Success(this.buildSettingsData(updated));
  }

  private buildSettingsData(user: User) {
    return {
      interfaceLanguage: user.interfaceLanguage ?? DEFAULT_INTERFACE_LANGUAGE,
      mcpUrl: this.buildMcpUrl(user),
      transactionPatternsLimit:
        user.transactionPatternsLimit ?? DEFAULT_TRANSACTION_PATTERNS_LIMIT,
      voiceInputLanguage: user.voiceInputLanguage,
    };
  }

  private buildMcpUrl(user: User): string {
    return `${this.apiBaseUrl}/mcp?token=${user.mcpToken}`;
  }
}
