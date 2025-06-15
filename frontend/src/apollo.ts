import { ApolloClient, createHttpLink, InMemoryCache } from '@apollo/client/core'

// Environment-specific GraphQL endpoint configuration
const getGraphQLEndpoint = (): string => {
  // Development: use environment variable or fallback to default
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:4000/graphql'
  }
  
  // Production: use same-origin CloudFront endpoint
  return '/graphql'
}

// HTTP connection to the API
const httpLink = createHttpLink({
  uri: getGraphQLEndpoint(),
})

// Cache implementation
const cache = new InMemoryCache()

// Create the apollo client
export const apolloClient = new ApolloClient({
  link: httpLink,
  cache,
})
