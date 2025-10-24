import { ApolloClient, createHttpLink, InMemoryCache } from "@apollo/client/core";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import { ref } from "vue";

// Global error state
export const globalError = ref<string | null>(null);

export const clearGlobalError = () => {
  globalError.value = null;
};

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

// Auth link to add JWT token to headers
const authLink = setContext(async (_, { headers }) => {
  try {
    // Get the authentication token from Auth0
    // We'll use a global function that can access the Auth0 instance
    const token = await getAuthToken();

    console.log("Apollo authLink - token available:", token ? "yes" : "no");

    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
      },
    };
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return {
      headers: {
        ...headers,
      },
    };
  }
});

// Error link to handle all GraphQL errors globally
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    console.error("GraphQL errors:", graphQLErrors);
    // Use the first GraphQL error message, or fall back to generic message
    globalError.value =
      graphQLErrors[0]?.message || "Something went wrong. Please try again later.";
  }

  if (networkError) {
    console.error("Network error:", networkError);
    globalError.value = "Connection problem. Please check your internet and try again.";
  }
});

// Cache implementation
const cache = new InMemoryCache();

// Create the apollo client
export const apolloClient = new ApolloClient({
  link: errorLink.concat(authLink.concat(httpLink)),
  cache,
});

// Global function to get auth token - will be set by the Auth0 plugin
let getAuthToken: () => Promise<string | null> = async () => null;

export const setAuthTokenGetter = (tokenGetter: () => Promise<string | null>) => {
  getAuthToken = tokenGetter;
};
