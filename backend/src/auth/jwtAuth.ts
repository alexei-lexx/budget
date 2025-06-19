import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

/**
 * JWT payload structure from Auth0 tokens
 */
export interface JwtPayload {
  sub: string; // Auth0 user ID
  email?: string; // User email
  iss: string; // Issuer
  aud: string | string[]; // Audience
  exp: number; // Expiration
  iat: number; // Issued at
}

/**
 * Authentication context passed to GraphQL resolvers
 */
export interface AuthContext {
  isAuthenticated: boolean;
  user?: {
    auth0UserId: string;
    email?: string;
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

    // Note: AUTH0_AUDIENCE is optional - if not provided, audience validation is skipped

    // Initialize JWKS client to fetch Auth0 public keys
    this.client = jwksClient({
      jwksUri: `https://${this.domain}/.well-known/jwks.json`,
      requestHeaders: {}, // Optional
      timeout: 30000, // Defaults to 30s
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
    console.log("Fetching signing key for JWT header");
    this.client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        callback(err);
        return;
      }
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
        algorithms: ["RS256"],
      };

      // Only validate audience if provided
      if (this.audience) {
        options.audience = this.audience;
      }

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

      return {
        isAuthenticated: true,
        user: {
          auth0UserId: payload.sub,
          email: payload.email,
        },
      };
    } catch (error) {
      console.error("JWT verification error:", error);
      return { isAuthenticated: false };
    }
  }
}
