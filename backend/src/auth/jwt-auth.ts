import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { normalizeAndValidateEmail } from "../utils/email";

/**
 * JWT payload structure
 */
export interface JwtPayload {
  sub: string; // User ID
  email?: string; // User email (standard claim)
  iss: string; // Issuer
  aud?: string | string[]; // Audience (Auth0 access tokens have this, Cognito does not)
  client_id?: string; // Client ID (Cognito access tokens have this)
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
 * Service for verifying JWT tokens and extracting user context
 *
 * Supports both Auth0 and Cognito identity providers with backward compatibility:
 *
 * Required environment variables:
 * - AUTH_ISSUER: Identity Provider URL (e.g., "https://cognito-idp.region.amazonaws.com/poolId")
 *
 * Provider-specific configuration:
 * - AUTH_AUDIENCE: API identifier for Auth0 (validates `aud` claim) - required for Auth0
 * - AUTH_CLIENT_ID: Client ID for Cognito (validates `client_id` claim) - required for Cognito
 *
 * Optional:
 * - AUTH_CLAIM_NAMESPACE: Custom namespace for email claim (Auth0 only, e.g., "https://myapp.com")
 *   If not set, uses standard `email` claim (Cognito default behavior)
 *
 * At least one of AUTH_AUDIENCE or AUTH_CLIENT_ID must be configured.
 */
export class JwtAuthService {
  private client: jwksClient.JwksClient;
  private issuer: string;
  private audience?: string;
  private clientId?: string;

  /**
   * Initialize JWT authentication service
   * @throws Error if required environment variables are missing
   */
  constructor() {
    this.issuer = process.env.AUTH_ISSUER || "";
    this.audience = process.env.AUTH_AUDIENCE;
    this.clientId = process.env.AUTH_CLIENT_ID;

    if (!this.issuer) {
      throw new Error("AUTH_ISSUER environment variable is required");
    }

    // At least one of audience (Auth0) or clientId (Cognito) must be configured
    if (!this.audience && !this.clientId) {
      throw new Error(
        "At least one of AUTH_AUDIENCE (Auth0) or AUTH_CLIENT_ID (Cognito) must be configured",
      );
    }

    // Initialize JWKS client to fetch public keys with caching
    this.client = jwksClient({
      jwksUri: `${this.issuer}/.well-known/jwks.json`,

      // Caching configuration - reduces Identity Provider API calls by 90%
      cache: true,
      cacheMaxEntries: 5, // Maximum number of signing keys to cache
      cacheMaxAge: 10 * 60 * 60 * 1000, // 10 hours cache duration

      requestHeaders: {}, // Optional
      timeout: 5000, // 5 second timeout for JWKS requests
    });
  }

  /**
   * Callback function to get signing key for JWT verification
   * Fetches the public key from JWKS endpoint using the key ID
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
   * Verify a JWT token against public keys
   *
   * Validation strategy for backward compatibility:
   * - If AUTH_AUDIENCE is set: validates `aud` claim (Auth0 mode)
   * - If AUTH_CLIENT_ID is set: validates `client_id` claim after JWT verification (Cognito mode)
   *
   * @param token - JWT token string
   * @returns Decoded JWT payload
   * @throws Error if token is invalid or verification fails
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    return new Promise((resolve, reject) => {
      const options: jwt.VerifyOptions = {
        issuer: this.issuer,
        algorithms: ["RS256"],
        // Only validate audience if configured (Auth0 mode)
        ...(this.audience && { audience: this.audience }),
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

        const payload = decoded as JwtPayload;

        // If clientId is configured (Cognito mode), validate the client_id claim
        if (this.clientId && this.clientId !== payload.client_id) {
          reject(
            new Error(
              `JWT client_id validation failed: expected ${this.clientId}, got ${payload.client_id}`,
            ),
          );
          return;
        }

        resolve(payload);
      });
    });
  }

  /**
   * Get user info from Identity Provider userinfo endpoint
   * @param token - Access token
   * @returns User info including email
   */
  async getUserInfo(token: string): Promise<{ email?: string; sub: string }> {
    const response = await fetch(`${this.issuer}/userinfo`, {
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
   * Get user info from Identity Provider userinfo endpoint using Authorization header
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
      const namespace = process.env.AUTH_CLAIM_NAMESPACE;
      if (!namespace) {
        throw new Error(
          "AUTH_CLAIM_NAMESPACE environment variable must be configured",
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
