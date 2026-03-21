import { GraphQLError } from "graphql";
import { BusinessError } from "../../services/business-error";
import { InvalidDateStringError } from "../../types/date";
import { handleResolverError } from "./shared";

describe("handleResolverError", () => {
  describe("GraphQLError pass-through", () => {
    it("passes through GraphQLError unchanged", async () => {
      const error = new GraphQLError("Custom error");
      const wrapper = async () => handleResolverError(error, "default message");
      const promise = wrapper();

      await expect(promise).rejects.toThrow(GraphQLError);
      await expect(promise).rejects.toMatchObject({
        message: "Custom error",
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
      });
    });
  });

  describe("BusinessError", () => {
    it("converts to GraphQL error with same message", async () => {
      const error = new BusinessError("A business error occurred");
      const wrapper = async () => handleResolverError(error, "default message");
      const promise = wrapper();

      await expect(promise).rejects.toThrow(GraphQLError);
      await expect(promise).rejects.toMatchObject({
        message: "A business error occurred",
      });
    });
  });

  describe("unknown errors", () => {
    it("converts to GraphQL error with default message", async () => {
      const error = new Error("Something broke");
      const wrapper = async () => handleResolverError(error, "default message");
      const promise = wrapper();

      await expect(promise).rejects.toThrow(GraphQLError);
      await expect(promise).rejects.toMatchObject({
        message: "default message",
      });
    });
  });
});
