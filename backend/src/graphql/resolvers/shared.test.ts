import { GraphQLError } from "graphql";
import {
  BusinessError,
  BusinessErrorCodes,
} from "../../services/business-error";
import { InvalidDateStringError } from "../../types/date";
import { handleResolverError } from "./shared";

describe("handleResolverError", () => {
  describe("GraphQLError pass-through", () => {
    it("passes through GraphQLError unchanged", async () => {
      const error = new GraphQLError("Custom error", {
        extensions: { code: "CUSTOM_ERROR" },
      });
      const wrapper = async () => handleResolverError(error, "default message");
      const promise = wrapper();

      await expect(promise).rejects.toThrow(GraphQLError);
      await expect(promise).rejects.toMatchObject({
        message: "Custom error",
        extensions: { code: "CUSTOM_ERROR" },
      });
    });
  });

  describe("InvalidDateStringError", () => {
    it("converts to GraphQL BAD_USER_INPUT", async () => {
      const error = new InvalidDateStringError("invalid");
      const wrapper = async () => handleResolverError(error, "default message");
      const promise = wrapper();

      await expect(promise).rejects.toThrow(GraphQLError);
      await expect(promise).rejects.toMatchObject({
        message: 'Invalid date format: "invalid". Expected YYYY-MM-DD.',
        extensions: { code: "BAD_USER_INPUT" },
      });
    });
  });

  describe("BusinessError", () => {
    it("converts to GraphQL error with correct code", async () => {
      const error = new BusinessError(
        "A business error occurred",
        BusinessErrorCodes.INVALID_PARAMETERS,
        { required: 100 },
      );
      const wrapper = async () => handleResolverError(error, "default message");
      const promise = wrapper();

      await expect(promise).rejects.toThrow(GraphQLError);
      await expect(promise).rejects.toMatchObject({
        message: "A business error occurred",
        extensions: {
          code: "INVALID_PARAMETERS",
          details: { required: 100 },
        },
      });
    });
  });

  describe("unknown errors", () => {
    it("converts to GraphQL INTERNAL_SERVER_ERROR", async () => {
      const error = new Error("Something broke");
      const wrapper = async () => handleResolverError(error, "default message");
      const promise = wrapper();

      await expect(promise).rejects.toThrow(GraphQLError);
      await expect(promise).rejects.toMatchObject({
        message: "default message",
        extensions: {
          code: "INTERNAL_SERVER_ERROR",
        },
      });
    });
  });
});
