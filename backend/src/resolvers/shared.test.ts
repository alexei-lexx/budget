import { GraphQLError } from "graphql";
import { BusinessError, BusinessErrorCodes } from "../services/business-error";
import { InvalidDateStringError } from "../types/date";
import { handleResolverError } from "./shared";

describe("handleResolverError", () => {
  describe("InvalidDateStringError", () => {
    it("converts InvalidDateStringError to GraphQL BAD_USER_INPUT", () => {
      const error = new InvalidDateStringError("2000-13-31");
      expect(() => handleResolverError(error, "default message")).toThrow(
        GraphQLError,
      );
    });

    it("includes the error message with the invalid value", () => {
      const error = new InvalidDateStringError("invalid");
      try {
        handleResolverError(error, "default message");
      } catch (e) {
        if (e instanceof GraphQLError) {
          expect(e.message).toBe(
            'Invalid date format: "invalid". Expected YYYY-MM-DD.',
          );
        }
      }
    });

    it("sets code to BAD_USER_INPUT", () => {
      const error = new InvalidDateStringError("test");
      try {
        handleResolverError(error, "default message");
      } catch (e) {
        if (e instanceof GraphQLError) {
          expect(e.extensions?.code).toBe("BAD_USER_INPUT");
        }
      }
    });
  });

  describe("BusinessError", () => {
    it("converts BusinessError to GraphQL error with custom code", () => {
      const error = new BusinessError(
        "User not found",
        BusinessErrorCodes.ACCOUNT_NOT_FOUND,
      );
      try {
        handleResolverError(error, "default message");
      } catch (e) {
        if (e instanceof GraphQLError) {
          expect(e.message).toBe("User not found");
          expect(e.extensions?.code).toBe(BusinessErrorCodes.ACCOUNT_NOT_FOUND);
        }
      }
    });

    it("includes business error details in extensions", () => {
      const details = { userId: "123", reason: "archived" };
      const error = new BusinessError(
        "Account not found",
        BusinessErrorCodes.ACCOUNT_NOT_FOUND,
        details,
      );
      try {
        handleResolverError(error, "default message");
      } catch (e) {
        if (e instanceof GraphQLError) {
          expect(e.extensions?.details).toEqual(details);
        }
      }
    });
  });

  describe("unknown errors", () => {
    it("returns INTERNAL_SERVER_ERROR for unknown error types", () => {
      const error = new Error("Something broke");
      try {
        handleResolverError(error, "default message");
      } catch (e) {
        if (e instanceof GraphQLError) {
          expect(e.message).toBe("default message");
          expect(e.extensions?.code).toBe("INTERNAL_SERVER_ERROR");
        }
      }
    });

    it("returns INTERNAL_SERVER_ERROR for plain objects", () => {
      try {
        handleResolverError({ message: "weird error" }, "fallback");
      } catch (e) {
        if (e instanceof GraphQLError) {
          expect(e.message).toBe("fallback");
          expect(e.extensions?.code).toBe("INTERNAL_SERVER_ERROR");
        }
      }
    });
  });
});
