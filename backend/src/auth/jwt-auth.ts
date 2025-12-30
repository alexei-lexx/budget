import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { normalizeAndValidateEmail } from "../utils/email";

/**
 * JWT payload structure from Auth0 tokens
 */
export interface JwtPayload {
  sub: string; // Auth0 user ID
  email: string; // User email (required)
  iss: string; // Issuer
  aud: string | string[]; // Audience
  exp: number; // Expiration
  iat: number; // Issued at
  [key: string]: unknown; // Allow custom claims (e.g., namespaced email claim)
}

/**
 * Authentication context passed to GraphQL resolvers
 */
export interface AuthContext {
  isAuthenticated: boolean;
  user?: {
    email: string;
  };
}

/**
 * Service for verifying Auth0 JWT tokens and extracting user context
 *
 * Requires environment variables:
 * - AUTH0_DOMAIN: Auth0 tenant domain (e.g., "your-tenant.auth0.com")
 * - AUTH0_AUDIENCE: API identifier configured in Auth0
 */
export class JwtAuthService {
  private client: jwksClient.JwksClient;
  private domain: string;
  private audience: string;

  /**
   * Initialize JWT authentication service with Auth0 configuration
   * @throws Error if required environment variables are missing
   */
  constructor() {
    // Get Auth0 configuration from environment
    this.domain = process.env.AUTH0_DOMAIN || "";
    this.audience = process.env.AUTH0_AUDIENCE || "";

    if (!this.domain) {
      throw new Error("AUTH0_DOMAIN environment variable is required");
    }

    if (!this.audience) {
      throw new Error("AUTH0_AUDIENCE environment variable is required");
    }

    // Initialize JWKS client to fetch Auth0 public keys with caching
    this.client = jwksClient({
      jwksUri: `https://${this.domain}/.well-known/jwks.json`,

      // Caching configuration - reduces Auth0 API calls by 90%
      cache: true,
      cacheMaxEntries: 5, // Maximum number of signing keys to cache
      cacheMaxAge: 10 * 60 * 60 * 1000, // 10 hours cache duration

      requestHeaders: {}, // Optional
      timeout: 5000, // 5 second timeout for JWKS requests
    });
  }

  /**
   * Callback function to get signing key for JWT verification
   * Fetches the public key from Auth0's JWKS endpoint using the key ID
   */
  private getKey = (
    header: jwt.JwtHeader,
    callback: jwt.SigningKeyCallback,
  ): void => {
    const startTime = Date.now();

    this.client.getSigningKey(header.kid, (err, key) => {
      const duration = Date.now() - startTime;

      if (err) {
        console.error(
          `[JWT-AUTH] Failed to fetch signing key for kid ${header.kid} after ${duration}ms:`,
          err.message,
        );
        callback(err);
        return;
      }

      // Fast response (< 50ms) likely indicates cache hit
      const likelyCached = duration < 50;
      console.log(
        `[JWT-AUTH] Signing key for kid ${header.kid} (${duration}ms) ${likelyCached ? "[LIKELY CACHED]" : "[LIKELY NETWORK]"}`,
      );

      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  };

  /**
   * Verify a JWT token against Auth0's public keys
   * @param token - JWT token string
   * @returns Decoded JWT payload
   * @throws Error if token is invalid or verification fails
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    return new Promise((resolve, reject) => {
      const options: jwt.VerifyOptions = {
        issuer: `https://${this.domain}/`,
        audience: this.audience,
        algorithms: ["RS256"],
      };

      jwt.verify(token, this.getKey, options, (err, decoded) => {
        if (err) {
          reject(new Error(`JWT verification failed: ${err.message}`));
          return;
        }

        if (!decoded || typeof decoded === "string") {
          reject(new Error("Invalid JWT payload"));
          return;
        }

        resolve(decoded as JwtPayload);
      });
    });
  }

  /**
   * Get user info from Auth0 userinfo endpoint
   * @param token - Access token
   * @returns User info including email
   */
  async getUserInfo(token: string): Promise<{ email?: string; sub: string }> {
    const response = await fetch(`https://${this.domain}/userinfo`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch user info");
    }

    return (await response.json()) as { email?: string; sub: string };
  }

  /**
   * Get user info from Auth0 userinfo endpoint using Authorization header
   * @param authHeader - Authorization header (e.g., "Bearer <token>")
   * @returns User info including email
   */
  async getUserInfoFromHeader(
    authHeader?: string,
  ): Promise<{ email?: string; sub: string } | null> {
    if (!authHeader) {
      return null;
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) {
      return null;
    }

    return this.getUserInfo(tokenMatch[1]);
  }

  /**
   * Extract and verify authentication from Authorization header
   * @param authHeader - Authorization header value (e.g., "Bearer <token>")
   * @returns Authentication context with user info if valid, or unauthenticated context
   */
  async getAuthContext(authHeader?: string): Promise<AuthContext> {
    if (!authHeader) {
      return { isAuthenticated: false };
    }

    // Extract token from "Bearer <token>" format
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) {
      return { isAuthenticated: false };
    }

    const token = tokenMatch[1];

    try {
      const payload = await this.verifyToken(token);

      // Read email from custom namespaced claim
      const namespace = process.env.JWT_CLAIM_NAMESPACE;
      if (!namespace) {
        throw new Error(
          "JWT_CLAIM_NAMESPACE environment variable must be configured",
        );
      }

      const namespacedEmail = payload[`${namespace}/email`];
      const email =
        typeof namespacedEmail === "string" ? namespacedEmail : payload.email;

      // Validate email claim exists
      if (!email) {
        throw new Error("Email claim missing in JWT token");
      }

      // Normalize and validate email
      const normalizedEmail = normalizeAndValidateEmail(email);

      return {
        isAuthenticated: true,
        user: {
          email: normalizedEmail,
        },
      };
    } catch (error) {
      console.error("JWT verification error:", error);
      return { isAuthenticated: false };
    }
  }
}
