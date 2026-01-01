import { computed, ref } from "vue";
import { UserManager, User } from "oidc-client-ts";

let userManager: UserManager | null = null;

export function setUserManager(manager: UserManager) {
  userManager = manager;
}

export function useAuth() {
  const user = ref<User | null>(null);
  const isAuthenticated = ref(false);
  const isLoading = ref(true);
  const error = ref<Error | null>(null);

  // Initialize immediately (works when composable is called outside setup)
  (async () => {
    if (!userManager) {
      error.value = new Error("UserManager not initialized");
      isLoading.value = false;
      return;
    }

    try {
      const currentUser = await userManager.getUser();
      user.value = currentUser ?? null;
      isAuthenticated.value = currentUser !== null && !currentUser.expired;

      // Subscribe to userManager events so UI updates when signinRedirectCallback completes
      userManager.events.addUserLoaded((loadedUser) => {
        try {
          user.value = loadedUser ?? null;
          isAuthenticated.value = !!loadedUser && !loadedUser.expired;
        } catch (e) {
          console.error("Error in userLoaded handler:", e);
        }
      });

      userManager.events.addUserUnloaded(() => {
        user.value = null;
        isAuthenticated.value = false;
      });

      userManager.events.addUserSignedOut(() => {
        user.value = null;
        isAuthenticated.value = false;
      });
    } catch (err) {
      console.error("Failed to get current user:", err);
      error.value = err instanceof Error ? err : new Error(String(err));
    } finally {
      isLoading.value = false;
    }
  })();

  const login = async () => {
    if (!userManager) {
      throw new Error("UserManager not initialized");
    }

    try {
      isLoading.value = true;
      error.value = null;
      await userManager.signinRedirect();
    } catch (err) {
      console.error("Login failed:", err);
      const errorObj = err instanceof Error ? err : new Error(String(err));
      error.value = errorObj;
      throw errorObj;
    } finally {
      isLoading.value = false;
    }
  };

  const logout = () => {
    if (!userManager) {
      throw new Error("UserManager not initialized");
    }

    try {
      userManager.signoutRedirect();
    } catch (err) {
      console.error("Logout failed:", err);
      throw err;
    }
  };

  const getAccessToken = async () => {
    if (!userManager) {
      throw new Error("UserManager not initialized");
    }

    try {
      const currentUser = await userManager.getUser();

      if (!currentUser) {
        throw new Error("User not authenticated");
      }

      // Check if token is expired and refresh if needed
      if (currentUser.expired) {
        const refreshedUser = await userManager.signinSilent();
        if (!refreshedUser) {
          throw new Error("Failed to refresh token");
        }
        return refreshedUser.access_token;
      }

      return currentUser.access_token;
    } catch (err) {
      console.error("Failed to get access token:", err);
      throw err;
    }
  };

  const getAccessTokenWithPopup = async () => {
    if (!userManager) {
      throw new Error("UserManager not initialized");
    }

    try {
      // Re-authenticate with popup if needed
      const newUser = await userManager.signinPopup();
      return newUser.access_token;
    } catch (err) {
      console.error("Failed to get access token with popup:", err);
      throw err;
    }
  };

  const refreshToken = async () => {
    if (!userManager) {
      throw new Error("UserManager not initialized");
    }

    try {
      const refreshedUser = await userManager.signinSilent();
      if (!refreshedUser) {
        throw new Error("Failed to refresh token");
      }
      user.value = refreshedUser;
      isAuthenticated.value = !refreshedUser.expired;
      return refreshedUser.access_token;
    } catch (err) {
      console.error("Token refresh failed:", err);
      throw err;
    }
  };

  return {
    // Auth state
    user: computed(() => user.value),
    isAuthenticated: computed(() => isAuthenticated.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Auth actions
    login,
    logout,

    // Token management
    getAccessToken,
    getAccessTokenWithPopup,
    refreshToken,
  };
}
