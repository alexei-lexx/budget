import { generateKeyPairSync } from "crypto";
import { faker } from "@faker-js/faker";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import {
  type Mocked,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Logger } from "../ports/logger";
import { createMockLogger } from "../utils/test-utils/providers/logger-mocks";
import { JwtAuthService } from "./jwt-auth";

type GetSigningKeyCallback = (
  error: Error | null,
  key?: jwksClient.SigningKey,
) => void;

const mockGetSigningKey = vi.hoisted(() =>
  vi.fn<
    (kid: string | null | undefined, callback: GetSigningKeyCallback) => void
  >(),
);

vi.mock("jwks-rsa", () => ({
  default: vi.fn(() => ({ getSigningKey: mockGetSigningKey })),
}));

const ISSUER = "https://identity-provider.example.com";
const CLIENT_ID = "client-123";
const AUDIENCE = "https://api.example.com";
const CLAIM_NAMESPACE = "https://budget.example.com";
const KEY_ID = "key-1";

const keyPairOptions = {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
} as const;

const { publicKey, privateKey } = generateKeyPairSync("rsa", keyPairOptions);
const { privateKey: otherPrivateKey } = generateKeyPairSync(
  "rsa",
  keyPairOptions,
);

const signingKey = {
  kid: KEY_ID,
  alg: "RS256",
  getPublicKey: () => publicKey,
  rsaPublicKey: publicKey,
};

function signToken(
  claims: Record<string, unknown>,
  options: jwt.SignOptions = {},
): string {
  return jwt.sign(claims, privateKey, {
    algorithm: "RS256",
    keyid: KEY_ID,
    issuer: ISSUER,
    expiresIn: "1h",
    ...options,
  });
}

describe("JwtAuthService", () => {
  let mockLogger: Mocked<Logger>;

  beforeEach(() => {
    vi.resetAllMocks();

    mockLogger = createMockLogger();

    // JWKS endpoint returns public key of test key pair
    mockGetSigningKey.mockImplementation((_kid, callback) => {
      callback(null, signingKey);
    });
  });

  describe("constructor", () => {
    // Happy path

    it("creates JWKS client for issuer", () => {
      // Act
      new JwtAuthService({
        issuer: ISSUER,
        clientId: CLIENT_ID,
        claimNamespace: CLAIM_NAMESPACE,
        logger: mockLogger,
      });

      // Assert
      expect(jwksClient).toHaveBeenCalledWith(
        expect.objectContaining({
          jwksUri: `${ISSUER}/.well-known/jwks.json`,
        }),
      );
    });

    it("accepts audience without client ID", () => {
      expect(
        () =>
          new JwtAuthService({
            issuer: ISSUER,
            audience: AUDIENCE,
            claimNamespace: CLAIM_NAMESPACE,
            logger: mockLogger,
          }),
      ).not.toThrow();
    });

    // Validation failures

    it("fails when both audience and client ID are missing", () => {
      expect(
        () =>
          new JwtAuthService({
            issuer: ISSUER,
            claimNamespace: CLAIM_NAMESPACE,
            logger: mockLogger,
          }),
      ).toThrow(
        "At least one of audience (Auth0) or client ID (Cognito) must be configured",
      );
    });
  });

  describe("getAuthContext", () => {
    let service: JwtAuthService;

    beforeEach(() => {
      service = new JwtAuthService({
        issuer: ISSUER,
        clientId: CLIENT_ID,
        claimNamespace: CLAIM_NAMESPACE,
        logger: mockLogger,
      });
    });

    // Happy path

    it("returns authenticated context with email from namespaced claim", async () => {
      // Arrange
      const email = faker.internet.email().toLowerCase();
      const token = signToken({
        client_id: CLIENT_ID,
        [`${CLAIM_NAMESPACE}/email`]: email,
      });

      // Act
      const result = await service.getAuthContext(`Bearer ${token}`);

      // Assert
      expect(result).toEqual({ isAuthenticated: true, user: { email } });

      expect(mockGetSigningKey).toHaveBeenCalledWith(
        KEY_ID,
        expect.any(Function),
      );
    });

    it("prefers namespaced email claim over standard email claim", async () => {
      // Arrange
      const email = faker.internet.email().toLowerCase();
      const token = signToken({
        client_id: CLIENT_ID,
        email: "standard@example.com",
        [`${CLAIM_NAMESPACE}/email`]: email,
      });

      // Act
      const result = await service.getAuthContext(`Bearer ${token}`);

      // Assert
      expect(result).toEqual({ isAuthenticated: true, user: { email } });
    });

    it("falls back to standard email claim when namespaced claim is missing", async () => {
      // Arrange
      const email = faker.internet.email().toLowerCase();
      const token = signToken({ client_id: CLIENT_ID, email });

      // Act
      const result = await service.getAuthContext(`Bearer ${token}`);

      // Assert
      expect(result).toEqual({ isAuthenticated: true, user: { email } });
    });

    it("falls back to standard email claim when namespaced claim is not string", async () => {
      // Arrange
      const email = faker.internet.email().toLowerCase();
      const token = signToken({
        client_id: CLIENT_ID,
        email,
        [`${CLAIM_NAMESPACE}/email`]: 42,
      });

      // Act
      const result = await service.getAuthContext(`Bearer ${token}`);

      // Assert
      expect(result).toEqual({ isAuthenticated: true, user: { email } });
    });

    it("normalizes email", async () => {
      // Arrange
      const token = signToken({
        client_id: CLIENT_ID,
        [`${CLAIM_NAMESPACE}/email`]: "John.Doe@Example.COM",
      });

      // Act
      const result = await service.getAuthContext(`Bearer ${token}`);

      // Assert
      expect(result).toEqual({
        isAuthenticated: true,
        user: { email: "john.doe@example.com" },
      });
    });

    it("accepts multiple spaces after bearer scheme", async () => {
      // Arrange
      const email = faker.internet.email().toLowerCase();
      const token = signToken({ client_id: CLIENT_ID, email });

      // Act
      const result = await service.getAuthContext(`Bearer   ${token}`);

      // Assert
      expect(result).toEqual({ isAuthenticated: true, user: { email } });
    });

    // Validation failures

    it("fails when header is missing", async () => {
      // Act
      const result = await service.getAuthContext(undefined);

      // Assert
      expect(result).toEqual({ isAuthenticated: false });

      expect(mockGetSigningKey).not.toHaveBeenCalled();
    });

    it("fails when header is not bearer scheme", async () => {
      // Act
      const result = await service.getAuthContext("Basic credentials");

      // Assert
      expect(result).toEqual({ isAuthenticated: false });

      expect(mockGetSigningKey).not.toHaveBeenCalled();
    });

    it("fails when header has text before bearer scheme", async () => {
      // Arrange
      const token = signToken({
        client_id: CLIENT_ID,
        email: faker.internet.email(),
      });

      // Act
      const result = await service.getAuthContext(`XBearer ${token}`);

      // Assert
      expect(result).toEqual({ isAuthenticated: false });

      expect(mockGetSigningKey).not.toHaveBeenCalled();
    });

    it("fails when token is malformed", async () => {
      // Act
      const result = await service.getAuthContext("Bearer not-a-jwt");

      // Assert
      expect(result).toEqual({ isAuthenticated: false });

      expect(mockGetSigningKey).not.toHaveBeenCalled();
    });

    it("fails when token is signed with unknown key", async () => {
      // Arrange
      const token = jwt.sign(
        { client_id: CLIENT_ID, email: faker.internet.email() },
        otherPrivateKey,
        { algorithm: "RS256", keyid: KEY_ID, issuer: ISSUER },
      );

      // Act
      const result = await service.getAuthContext(`Bearer ${token}`);

      // Assert
      expect(result).toEqual({ isAuthenticated: false });

      expect(mockGetSigningKey).toHaveBeenCalledWith(
        KEY_ID,
        expect.any(Function),
      );
    });

    it("fails when issuer does not match", async () => {
      // Arrange
      const token = signToken(
        { client_id: CLIENT_ID, email: faker.internet.email() },
        { issuer: "https://other-issuer.example.com" },
      );

      // Act
      const result = await service.getAuthContext(`Bearer ${token}`);

      // Assert
      expect(result).toEqual({ isAuthenticated: false });
    });

    it("fails when token is expired", async () => {
      // Arrange
      const token = signToken(
        { client_id: CLIENT_ID, email: faker.internet.email() },
        { expiresIn: -60 },
      );

      // Act
      const result = await service.getAuthContext(`Bearer ${token}`);

      // Assert
      expect(result).toEqual({ isAuthenticated: false });

      expect(mockLogger.error).toHaveBeenCalledWith(
        "JWT verification error:",
        expect.objectContaining({
          message: "JWT verification failed: jwt expired",
        }),
      );
    });

    it("fails when email claim is missing", async () => {
      // Arrange
      const token = signToken({ client_id: CLIENT_ID });

      // Act
      const result = await service.getAuthContext(`Bearer ${token}`);

      // Assert
      expect(result).toEqual({ isAuthenticated: false });

      expect(mockLogger.error).toHaveBeenCalledWith(
        "JWT verification error:",
        expect.objectContaining({
          message: "Email claim missing in JWT token",
        }),
      );
    });

    it("fails when email is invalid", async () => {
      // Arrange
      const token = signToken({
        client_id: CLIENT_ID,
        [`${CLAIM_NAMESPACE}/email`]: "not-an-email",
      });

      // Act
      const result = await service.getAuthContext(`Bearer ${token}`);

      // Assert
      expect(result).toEqual({ isAuthenticated: false });
    });

    // Dependency failures

    it("fails when signing key fetch fails", async () => {
      // Arrange
      const token = signToken({
        client_id: CLIENT_ID,
        email: faker.internet.email(),
      });

      // JWKS endpoint is unavailable
      mockGetSigningKey.mockImplementation((_kid, callback) => {
        callback(new Error("JWKS endpoint unavailable"));
      });

      // Act
      const result = await service.getAuthContext(`Bearer ${token}`);

      // Assert
      expect(result).toEqual({ isAuthenticated: false });

      expect(mockGetSigningKey).toHaveBeenCalledWith(
        KEY_ID,
        expect.any(Function),
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `[JWT-AUTH] Failed to fetch signing key for kid ${KEY_ID}`,
        ),
        "JWKS endpoint unavailable",
      );
    });

    describe("when client ID is configured", () => {
      // Happy path

      it("returns authenticated context when client ID matches", async () => {
        // Arrange
        const email = faker.internet.email().toLowerCase();
        const token = signToken({ client_id: CLIENT_ID, email });

        // Act
        const result = await service.getAuthContext(`Bearer ${token}`);

        // Assert
        expect(result).toEqual({ isAuthenticated: true, user: { email } });
      });

      // Validation failures

      it("fails when client ID does not match", async () => {
        // Arrange
        const token = signToken({
          client_id: "other-client",
          email: faker.internet.email(),
        });

        // Act
        const result = await service.getAuthContext(`Bearer ${token}`);

        // Assert
        expect(result).toEqual({ isAuthenticated: false });

        expect(mockLogger.error).toHaveBeenCalledWith(
          "JWT verification error:",
          expect.objectContaining({
            message: `JWT client_id validation failed: expected ${CLIENT_ID}, got other-client`,
          }),
        );
      });

      it("fails when client ID claim is missing", async () => {
        // Arrange
        const token = signToken({ email: faker.internet.email() });

        // Act
        const result = await service.getAuthContext(`Bearer ${token}`);

        // Assert
        expect(result).toEqual({ isAuthenticated: false });
      });
    });

    describe("when audience is configured", () => {
      beforeEach(() => {
        service = new JwtAuthService({
          issuer: ISSUER,
          audience: AUDIENCE,
          claimNamespace: CLAIM_NAMESPACE,
          logger: mockLogger,
        });
      });

      // Happy path

      it("returns authenticated context when audience matches", async () => {
        // Arrange
        const email = faker.internet.email().toLowerCase();
        const token = signToken({ email }, { audience: AUDIENCE });

        // Act
        const result = await service.getAuthContext(`Bearer ${token}`);

        // Assert
        expect(result).toEqual({ isAuthenticated: true, user: { email } });
      });

      // Validation failures

      it("fails when audience does not match", async () => {
        // Arrange
        const token = signToken(
          { email: faker.internet.email() },
          { audience: "https://other-api.example.com" },
        );

        // Act
        const result = await service.getAuthContext(`Bearer ${token}`);

        // Assert
        expect(result).toEqual({ isAuthenticated: false });
      });

      it("fails when audience claim is missing", async () => {
        // Arrange
        const token = signToken({ email: faker.internet.email() });

        // Act
        const result = await service.getAuthContext(`Bearer ${token}`);

        // Assert
        expect(result).toEqual({ isAuthenticated: false });
      });
    });

    describe("when signing key is fetched", () => {
      beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
      });

      afterEach(() => {
        vi.useRealTimers();
      });

      // Happy path

      it("logs likely cached fetch when fetch takes under 50ms", async () => {
        // Arrange
        const token = signToken({
          client_id: CLIENT_ID,
          email: faker.internet.email(),
        });

        // JWKS endpoint responds after 49ms
        mockGetSigningKey.mockImplementation((_kid, callback) => {
          vi.advanceTimersByTime(49);
          callback(null, signingKey);
        });

        // Act
        await service.getAuthContext(`Bearer ${token}`);

        // Assert
        expect(mockLogger.info).toHaveBeenCalledWith(
          `[JWT-AUTH] Signing key for kid ${KEY_ID} (49ms) [LIKELY CACHED]`,
        );
      });

      it("logs likely network fetch when fetch takes 50ms", async () => {
        // Arrange
        const token = signToken({
          client_id: CLIENT_ID,
          email: faker.internet.email(),
        });

        // JWKS endpoint responds after 50ms
        mockGetSigningKey.mockImplementation((_kid, callback) => {
          vi.advanceTimersByTime(50);
          callback(null, signingKey);
        });

        // Act
        await service.getAuthContext(`Bearer ${token}`);

        // Assert
        expect(mockLogger.info).toHaveBeenCalledWith(
          `[JWT-AUTH] Signing key for kid ${KEY_ID} (50ms) [LIKELY NETWORK]`,
        );
      });
    });
  });
});
