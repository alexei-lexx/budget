import { ApolloError } from "@apollo/client/core";

export const isInternalServerError = (error: ApolloError): boolean =>
  error.graphQLErrors[0]?.extensions?.code === "INTERNAL_SERVER_ERROR";

// Real error message when available and safe to show; fallback for masked or non-Error failures
export const resolveErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof ApolloError && isInternalServerError(error)) {
    return fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};
