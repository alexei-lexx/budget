/**
 * @file Authentication Plugin for Vue Application
 *
 * This file is the entry point for authentication in the application.
 * It creates and configures a Vue plugin that sets up OpenID Connect (OIDC)
 * authentication using the oidc-client-ts library.
 *
 * Purpose:
 * - Initialize and configure the UserManager for OIDC authentication
 * - Handle OAuth callback after login redirects from the OIDC provider
 * - Set up event listeners for authentication lifecycle events
 * - Provide the UserManager instance to the rest of the application
 *
 * This plugin should be registered in main.ts using app.use(auth).
 * After registration, components can use the useAuth() composable for authentication.
 */

import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import { setUserManager } from "../composables/useAuth";
import type { App } from "vue";

/**
 * Creates and configures the authentication plugin for the Vue application.
 * This plugin sets up OpenID Connect (OIDC) authentication using the oidc-client-ts library.
 *
 * The authentication flow works as follows:
 * 1. User clicks login -> redirects to OIDC provider
 * 2. User authenticates at provider -> provider redirects back with authorization code
 * 3. This plugin detects the redirect and exchanges code for tokens
 * 4. Tokens are stored in localStorage for persistence across sessions
 * 5. Tokens are automatically refreshed before expiration
 */
export function createAuth() {
  // Load authentication configuration from environment variables
  // These are set in .env file and injected at build time by Vite
  const issuer = import.meta.env.VITE_AUTH_ISSUER;
  const clientId = import.meta.env.VITE_AUTH_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH_AUDIENCE;
  const scope = import.meta.env.VITE_AUTH_SCOPE;

  // Validate required environment variables
  if (!issuer) {
    throw new Error("VITE_AUTH_ISSUER environment variable is required");
  }

  if (!clientId) {
    throw new Error("VITE_AUTH_CLIENT_ID environment variable is required");
  }

  if (!scope) {
    throw new Error("VITE_AUTH_SCOPE environment variable is required");
  }

  // Create the UserManager instance which handles all OIDC protocol interactions
  const userManager = new UserManager({
    // The OIDC provider's base URL
    authority: issuer,

    // Application identifier registered with the OIDC provider
    client_id: clientId,

    // Where to redirect after successful login (must be registered with provider)
    redirect_uri: window.location.origin,

    // Where to redirect after logout (must be registered with provider)
    post_logout_redirect_uri: window.location.origin,

    // Use authorization code flow (most secure for web apps)
    // The provider will redirect back with a 'code' that gets exchanged for tokens
    response_type: "code",

    // OAuth scopes to request:
    // - openid: Required for OIDC, provides user ID
    // - profile: Provides user profile information (name, etc.)
    // - email: Provides user's email address
    // - offline_access: Enables refresh tokens for long-lived sessions
    scope,

    // OIDC provider-specific: Pass audience parameter to get access tokens for a specific API
    // - For Auth0: Required to get properly scoped access tokens
    // - For Cognito: Not used (leave VITE_AUTH_AUDIENCE empty)
    // Only included if audience is configured in environment variables
    ...(audience && { extraQueryParams: { audience } }),

    // Automatically refresh access tokens before they expire using refresh tokens
    // This happens in the background without user interaction
    automaticSilentRenew: true,

    // URL to use for silent token renewal via iframe
    // This is required as a fallback when refresh token renewal fails
    // The iframe approach uses prompt=none to get new tokens without user interaction
    silent_redirect_uri: window.location.origin,

    // Store user session in localStorage (instead of sessionStorage)
    // This persists authentication across browser tabs and sessions
    userStore: new WebStorageStateStore({ store: window.localStorage }),
  });

  // Set up event handler for when access token is about to expire
  // This fires ~60 seconds before expiration, triggering automatic renewal
  userManager.events.addAccessTokenExpiring(() => {
    console.log("Access token expiring, attempting automatic renewal...");
  });

  // Set up event handler for when access token has expired
  // This should rarely fire if automatic renewal is working correctly
  userManager.events.addAccessTokenExpired(() => {
    console.error("Access token expired! Automatic renewal failed.");
  });

  // Set up event handler for when automatic token renewal fails
  // This can happen if refresh token expires or network issues occur
  userManager.events.addSilentRenewError((error) => {
    console.error("Silent token renewal failed:", error);
    console.error("User will need to log in again manually");
    // When this happens, user will need to log in again manually
  });

  // Set up event handler for when user is signed out
  // This fires when logout is initiated or session expires
  userManager.events.addUserSignedOut(() => {
    console.log("User signed out");
  });

  // Make the userManager available to the useAuth composable
  // This allows components to access authentication functionality
  setUserManager(userManager);

  // Handle the OAuth callback after successful login
  // When OIDC provider redirects back, URL will contain 'code' and 'state' parameters
  if (
    typeof window !== "undefined" &&
    window.location.search.includes("code=") &&
    window.location.search.includes("state=")
  ) {
    // signinRedirectCallback() completes the OAuth authorization code flow:
    // 1. Validates the 'state' parameter matches what we sent (CSRF protection)
    // 2. Extracts the 'code' parameter from the URL
    // 3. Sends the code to the OIDC provider's token endpoint
    // 4. Receives back access_token, id_token, and refresh_token
    // 5. Stores tokens in localStorage (via WebStorageStateStore)
    // 6. Fires UserManager events (addUserLoaded) to update reactive state
    // 7. Returns the User object with profile and token information
    userManager
      .signinRedirectCallback()
      .then((user) => {
        console.log("Completed signin redirect callback, user loaded:", user?.profile);

        // Clean up URL by removing query parameters (code, state, etc.)
        // This prevents issues if user refreshes page or bookmarks the URL
        try {
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch {
          // Ignore errors (can happen in some edge cases like iframe contexts)
        }
      })
      .catch((err) => {
        console.error("Error handling signin redirect callback:", err);
        // Errors here could indicate invalid state, expired code, or network issues
      });
  }

  // Return a Vue plugin object with an install method
  // The install() method is Vue's standard plugin interface
  // When main.ts calls app.use(auth), Vue automatically invokes this install() method
  return {
    install(app: App) {
      // Make userManager available to all components via Vue's provide/inject system
      // This is an alternative way to access userManager (in addition to the module-level approach)
      // Components can use inject('userManager') if needed, though useAuth() is the preferred method
      app.provide("userManager", userManager);
    },
  };
}

// Create and export a single instance of the auth plugin
// This is imported and used in main.ts: app.use(auth)
export const auth = createAuth();
