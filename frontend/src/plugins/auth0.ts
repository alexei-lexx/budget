import { createAuth0 } from "@auth0/auth0-vue";

export const auth0 = createAuth0({
  domain: import.meta.env.VITE_AUTH_DOMAIN,
  clientId: import.meta.env.VITE_AUTH_CLIENT_ID,
  authorizationParams: {
    redirect_uri: window.location.origin,
    scope: "openid profile email offline_access", // offline_access is required for refresh tokens
    ...(import.meta.env.VITE_AUTH_AUDIENCE && {
      audience: import.meta.env.VITE_AUTH_AUDIENCE,
    }),
  },
  cacheLocation: "localstorage",
  useRefreshTokens: true, // Enable silent token refresh to prevent unexpected sign-outs
  useRefreshTokensFallback: true, // Fallback to iframe method if refresh token fails
});
