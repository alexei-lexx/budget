import { useAuth0 } from "@auth0/auth0-vue";
import { computed } from "vue";

export function useAuth() {
  const {
    loginWithRedirect,
    logout,
    user,
    isAuthenticated,
    isLoading,
    error,
    getAccessTokenSilently,
    getAccessTokenWithPopup,
    checkSession,
  } = useAuth0();

  const login = async () => {
    try {
      await loginWithRedirect();
    } catch (err) {
      console.error("Login failed:", err);
      throw err;
    }
  };

  const logoutUser = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };

  const getAccessToken = async (options?: Parameters<typeof getAccessTokenSilently>[0]) => {
    try {
      return await getAccessTokenSilently(options);
    } catch (err) {
      console.error("Failed to get access token:", err);
      throw err;
    }
  };

  const refreshToken = async () => {
    try {
      await checkSession();
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
    logout: logoutUser,

    // Token management
    getAccessToken,
    getAccessTokenWithPopup,
    refreshToken,
  };
}
