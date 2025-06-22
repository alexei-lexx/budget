import { ApolloServer } from "@apollo/server";
import { typeDefs } from "./schema";
import { resolvers } from "./resolvers";
import { JwtAuthService, AuthContext } from "./auth/jwtAuth";
import { UserRepository } from "./repositories/UserRepository";
import { AccountRepository } from "./repositories/AccountRepository";
import { IUserRepository } from "./models/User";
import { IAccountRepository } from "./models/Account";

export interface GraphQLContext {
  auth: AuthContext;
  userRepository: IUserRepository;
  accountRepository: IAccountRepository;
  jwtAuthService: JwtAuthService;
  authHeader?: string;
}

let jwtAuthService: JwtAuthService;
let userRepository: UserRepository;
let accountRepository: AccountRepository;

export const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV === "development", // Enable introspection for development
});

/**
 * Create GraphQL context with JWT authentication
 * Extracts and verifies JWT token from Authorization header
 */
export async function createContext(req: {
  headers: Record<string, string | string[] | undefined>;
}): Promise<GraphQLContext> {
  // Initialize services on first use (after env vars are loaded)
  if (!jwtAuthService) {
    jwtAuthService = new JwtAuthService();
  }

  if (!userRepository) {
    userRepository = new UserRepository();
  }

  if (!accountRepository) {
    accountRepository = new AccountRepository();
  }

  const authHeader = req.headers.authorization;
  // Handle both string and string[] types from different contexts
  const authHeaderString = Array.isArray(authHeader)
    ? authHeader[0]
    : authHeader;

  const auth = await jwtAuthService.getAuthContext(authHeaderString);

  return {
    auth,
    userRepository,
    accountRepository,
    jwtAuthService,
    authHeader: authHeaderString,
  };
}
