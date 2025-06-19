export interface User {
  id: string; // UUID v4 primary key
  auth0UserId: string; // Auth0 sub claim (unique)
  email: string; // Normalized lowercase email
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CreateUserInput {
  auth0UserId: string;
  email: string;
}

export interface UserRepository {
  findByAuth0UserId(auth0UserId: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  ensureUser(auth0UserId: string, email: string): Promise<User>;
}
