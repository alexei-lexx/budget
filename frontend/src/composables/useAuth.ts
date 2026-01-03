/**
 * @file Authentication Composable
 *
 * This file provides a Vue composable that serves as the main interface
 * for authentication throughout the application.
 *
 * Purpose:
 * - Expose reactive authentication state (user, isAuthenticated, isLoading, error)
 * - Provide methods for login and logout operations
 * - Manage access tokens with automatic refresh capabilities
 * - Subscribe to OIDC UserManager events to keep UI synchronized
 *
 * The composable depends on the UserManager instance being initialized
 * by the auth plugin (auth.ts) before use.
 *
 * Usage in components:
 * ```ts
 * import { useAuth } from '@/composables/useAuth';
 *
 * const { isAuthenticated, user, login, logout, getAccessToken } = useAuth();
 * ```
 */

import { computed, ref } from "vue";
import { UserManager, User } from "oidc-client-ts";

/**
 * Module-level variable to store the UserManager instance.
 * This is set by the auth plugin during app initialization.
 * Using module-level scope allows the composable to be called outside of setup().
 */
let userManager: UserManager | null = null;

/**
 * Sets the UserManager instance to be used by all useAuth() calls.
 * This is called by the auth plugin during initialization.
 *
 * @param manager - The configured UserManager instance from the auth plugin
 */
export function setUserManager(manager: UserManager) {
  userManager = manager;
}

/**
 * Vue composable that provides authentication state and methods.
 *
 * This composable:
 * - Manages reactive authentication state (user, isAuthenticated, isLoading, error)
 * - Provides methods for login, logout, and token management
 * - Subscribes to UserManager events to keep state synchronized
 * - Can be called outside of Vue component setup() due to module-level UserManager
 *
 * Usage in components:
 * ```ts
 * const { isAuthenticated, login, logout, getAccessToken } = useAuth();
 * ```
 */
export function useAuth() {
  // Reactive state for the current authenticated user
  // Contains user profile, tokens, and token expiration info
  const user = ref<User | null>(null);

  // Whether the user is currently authenticated with a valid (non-expired) session
  const isAuthenticated = ref(false);

  // Whether authentication state is currently being loaded/checked
  const isLoading = ref(true);

  // Any error that occurred during authentication operations
  const error = ref<Error | null>(null);

  /**
   * Initialize authentication state by loading user from storage and setting up event listeners.
   *
   * WHY is this async?
   * - We need to perform async operations (await userManager.getUser())
   * - But useAuth() itself cannot be async (composables must return immediately)
   * - Solution: Define an async function and call it separately
   *
   * WHAT does it do?
   * 1. Loads the current user session from localStorage (if it exists)
   * 2. Updates reactive state (user, isAuthenticated, isLoading)
   * 3. Sets up event listeners to keep state synchronized with auth changes
   *
   * WHEN does it run?
   * - Called immediately below when useAuth() is invoked
   * - Runs in the background while the component renders
   * - Component can show loading state until isLoading becomes false
   */
  const initializeAuthState = async () => {
    // Verify that UserManager was properly initialized by the auth plugin
    if (!userManager) {
      error.value = new Error("UserManager not initialized");
      isLoading.value = false;
      return;
    }

    try {
      // Retrieve the current user session from storage (if it exists)
      // This reads from localStorage where tokens are persisted
      // Returns: Promise<User | null>
      // - User type is defined in 'oidc-client-ts' library
      // - User object contains: profile, access_token, id_token, refresh_token, expired, expires_at, etc.
      // - Returns null if no session exists or session is invalid
      const currentUser = await userManager.getUser();

      // Update reactive state with the current user
      user.value = currentUser ?? null;

      // User is authenticated if they exist AND their token hasn't expired
      isAuthenticated.value = currentUser !== null && !currentUser.expired;

      // Subscribe to UserManager events to keep reactive state in sync
      // These event handlers update our reactive refs when auth state changes

      // Event: User successfully loaded (e.g., after login or token refresh)
      // This fires when signinRedirectCallback completes after OAuth redirect
      userManager.events.addUserLoaded((loadedUser) => {
        // Update reactive state when user is loaded
        user.value = loadedUser ?? null;
        isAuthenticated.value = !!loadedUser && !loadedUser.expired;
      });

      // Event: User session removed from storage
      // This can happen when tokens are cleared or session is invalid
      userManager.events.addUserUnloaded(() => {
        user.value = null;
        isAuthenticated.value = false;
      });

      // Event: User explicitly signed out
      // This fires when signoutRedirect() is called
      userManager.events.addUserSignedOut(() => {
        user.value = null;
        isAuthenticated.value = false;
      });
    } catch (err) {
      console.error("Failed to get current user:", err);
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      // Always mark loading as complete, whether successful or not
      isLoading.value = false;
    }
  };

  // Start the initialization process immediately
  // This runs in the background and doesn't block useAuth() from returning
  initializeAuthState();

  /**
   * Initiates the login flow by redirecting to the OIDC provider.
   *
   * Flow:
   * 1. Saves current state to storage
   * 2. Redirects browser to OIDC provider's login page
   * 3. Provider redirects back after authentication
   * 4. auth.ts plugin handles the callback and exchanges code for tokens
   * 5. UserManager events fire, updating reactive state
   */
  const login = async () => {
    if (!userManager) {
      throw new Error("UserManager not initialized");
    }

    try {
      isLoading.value = true;
      error.value = null;

      // Redirect to OIDC provider for authentication
      // This will cause a full page navigation
      await userManager.signinRedirect();
    } catch (err) {
      console.error("Login failed:", err);
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.value = errorObj;
      throw errorObj;
    } finally {
      // Always mark loading as complete, whether successful or not
      isLoading.value = false;
    }
  };

  /**
   * Logs out the user by redirecting to the OIDC provider's logout endpoint.
   *
   * Flow:
   * 1. Clears local token storage
   * 2. Redirects to provider to clear provider session
   * 3. Provider redirects back to post_logout_redirect_uri
   */
  const logout = () => {
    if (!userManager) {
      throw new Error("UserManager not initialized");
    }

    try {
      // Redirect to OIDC provider for logout
      // This clears both local and provider sessions
      userManager.signoutRedirect();
    } catch (err) {
      console.error("Logout failed:", err);
      throw err;
    }
  };

  /**
   * Gets a valid access token for making API calls.
   *
   * This method:
   * 1. Checks if user is authenticated
   * 2. Checks if current token is expired
   * 3. Automatically refreshes token if expired (using refresh token)
   * 4. Returns a valid, non-expired access token
   *
   * Use this before making authenticated API requests:
   * ```ts
   * const token = await getAccessToken();
   * fetch('/api/data', { headers: { Authorization: `Bearer ${token}` } });
   * ```
   */
  const getAccessToken = async () => {
    if (!userManager) {
      throw new Error("UserManager not initialized");
    }

    try {
      // Get current user from storage
      const currentUser = await userManager.getUser();

      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Check if the access token has expired
      if (currentUser.expired) {
        // Silently refresh the token using the refresh token
        // This happens in a hidden iframe without user interaction
        const refreshedUser = await userManager.signinSilent();
        if (!refreshedUser) {
          throw new Error("Failed to refresh token");
        }
        // Return the new access token
        return refreshedUser.access_token;
      }

      // Token is still valid, return it
      return currentUser.access_token;
    } catch (err) {
      console.error("Failed to get access token:", err);
      throw err;
    }
  };

  /**
   * Computed property for user's display name.
   * Falls back to "noname" if email is not available.
   */
  const displayName = computed(() => user.value?.profile?.email || "noname");

  // Return reactive state and methods as computed properties
  // Using computed() ensures consumers get readonly reactive values
  return {
    // Auth state - readonly computed refs
    user: computed(() => user.value),
    isAuthenticated: computed(() => isAuthenticated.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    displayName,

    // Auth actions - methods for user interactions
    login,
    logout,

    // Token management - method for accessing tokens with automatic refresh
    getAccessToken,
  };
}
