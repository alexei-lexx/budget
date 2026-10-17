import { ApolloServerErrorCode } from "@apollo/server/errors";
import { GraphQLError } from "graphql";
import { describe, expect, it } from "vitest";
import { BadRequestGraphQLError } from "./bad-request-graphql-error";

describe("BadRequestGraphQLError", () => {
  describe("constructor", () => {
    // Happy path

    it("creates GraphQLError with BAD_REQUEST code and given message", () => {
      // Act
      const error = new BadRequestGraphQLError("Something went wrong");

      // Assert
      expect(error).toBeInstanceOf(GraphQLError);
      expect(error.message).toBe("Something went wrong");
      expect(error.extensions["code"]).toBe(ApolloServerErrorCode.BAD_REQUEST);
      expect(error.name).toBe("BadRequestGraphQLError");
    });
  });
});
