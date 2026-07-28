import { User } from "../models/user";
import { UserRepository } from "../ports/user-repository";

export async function authenticateMcpToken(
  token: string | null,
  userRepository: UserRepository,
): Promise<User | null> {
  if (!token) return null;
  return userRepository.findOneByMcpToken(token);
}
