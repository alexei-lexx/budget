import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client/core";

const getGraphQLEndpoint = (): string => {
  // Always check for explicit environment variable first
  if (import.meta.env.VITE_GRAPHQL_ENDPOINT) {
    return import.meta.env.VITE_GRAPHQL_ENDPOINT;
  }

  // Fallback to the default endpoint
  return "/graphql";
};

// HTTP connection to the API
const httpLink = createHttpLink({
  uri: getGraphQLEndpoint(),
});

// Cache implementation
const cache = new InMemoryCache();

// Create the apollo client
export const apolloClient = new ApolloClient({
  link: httpLink,
  cache,
});
