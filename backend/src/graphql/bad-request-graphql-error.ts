import { ApolloServerErrorCode } from "@apollo/server/errors";
import { GraphQLError } from "graphql";

export class BadRequestGraphQLError extends GraphQLError {
  constructor(message: string) {
    super(message, {
      extensions: { code: ApolloServerErrorCode.BAD_REQUEST },
    });
    this.name = "BadRequestGraphQLError";
  }
}
