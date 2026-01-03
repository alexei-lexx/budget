import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import { setUserManager } from "../composables/useAuth";
import type { App } from "vue";

export function createAuth() {
  const domain = import.meta.env.VITE_AUTH_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH_AUDIENCE;

  if (!domain) {
    throw new Error("VITE_AUTH_DOMAIN environment variable is required");
  }

  if (!clientId) {
    throw new Error("VITE_AUTH_CLIENT_ID environment variable is required");
  }

  const userManager = new UserManager({
    authority: `https://${domain}`,
    client_id: clientId,
    redirect_uri: window.location.origin,
    post_logout_redirect_uri: window.location.origin,
    response_type: "code",
    scope: "openid profile email offline_access", // offline_access enables refresh tokens
    ...(audience && { extraQueryParams: { audience } }), // Pass audience as extra query param for Auth0
    automaticSilentRenew: true, // Automatically refresh tokens before expiration using refresh tokens
    userStore: new WebStorageStateStore({ store: window.localStorage }), // Persist auth state across browser sessions
  });

  // Register event handlers for token refresh and user state changes
  userManager.events.addSilentRenewError((error) => {
    console.error("Silent token renewal failed:", error);
  });

  userManager.events.addUserSignedOut(() => {
    console.log("User signed out");
  });

  setUserManager(userManager);

  // If the OIDC provider redirected back with an authorization code, complete the signin flow
  if (
    typeof window !== "undefined" &&
    window.location.search.includes("code=") &&
    window.location.search.includes("state=")
  ) {
    userManager
      .signinRedirectCallback()
      .then((user) => {
        console.log(
          "Completed signin redirect callback, user loaded:",
          user?.profile?.email || user?.profile,
        );
        // Remove query params from URL
        try {
          const cleanUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        } catch {
          // ignore
        }
      })
      .catch((err) => {
        console.error("Error handling signin redirect callback:", err);
      });
  }

  return {
    install(app: App) {
      app.provide("userManager", userManager);
    },
  };
}

export const auth = createAuth();
