<script setup lang="ts">
import { watch, onMounted, ref, computed } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useUser } from "@/composables/useUser";
import { useSnackbar } from "@/composables/useSnackbar";
import { useDisplay } from "vuetify";
import { setAuthTokenGetter, globalError, clearGlobalError } from "@/apollo";

const {
  user,
  isAuthenticated,
  isLoading: authLoading,
  getAccessToken,
  login,
  logout,
  displayName,
} = useAuth();
const { ensureUser, ensureUserLoading, userError } = useUser();
const { showSnackbar, snackbarMessage, snackbarColor, hideSnackbar, showErrorSnackbar } =
  useSnackbar();
const { mobile } = useDisplay();

// Navigation drawer state
const drawer = ref(true);

// Passkey registration URL
const passkeyRegistrationUrl = computed(() => {
  const authUiUrl = import.meta.env.VITE_AUTH_UI_URL;
  const clientId = import.meta.env.VITE_AUTH_CLIENT_ID;
  const redirectUri = window.location.origin;

  if (!authUiUrl || !clientId) {
    return null;
  }

  return `${authUiUrl}/passkeys/add?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
});

// Initialize drawer state and watch for screen size changes
onMounted(() => {
  drawer.value = !mobile.value;
});

watch(mobile, (isMobile) => {
  drawer.value = !isMobile;
});

// Set up token getter for Apollo Client
onMounted(() => {
  setAuthTokenGetter(async () => {
    try {
      console.log("Is authenticated:", isAuthenticated.value);

      if (isAuthenticated.value) {
        const token = await getAccessToken();
        console.log("Got token:", token ? "yes" : "no");
        return token;
      }
      return null;
    } catch (error) {
      console.error("Failed to get access token:", error);
      return null;
    }
  });
});

// Track if user has been ensured for this auth session
const USER_ENSURED_KEY = "budget_user_ensured";

// Watch for authentication state changes - only ensure user on fresh login
watch(
  [isAuthenticated, authLoading],
  async ([authenticated, loading]) => {
    if (authenticated && !loading) {
      const userAlreadyEnsured = localStorage.getItem(USER_ENSURED_KEY) === "true";

      if (!userAlreadyEnsured) {
        try {
          console.log("Fresh login detected, ensuring user exists");
          await ensureUser();
          localStorage.setItem(USER_ENSURED_KEY, "true");
        } catch (error) {
          console.error("Failed to ensure user after login:", error);
        }
      }
    } else if (!authenticated && !loading) {
      // Clear the flag when user logs out
      localStorage.removeItem(USER_ENSURED_KEY);
    }
  },
  { immediate: true },
);

// Watch for global GraphQL errors and display them via snackbar
watch(globalError, (error) => {
  if (error) {
    showErrorSnackbar(error);
    clearGlobalError();
  }
});

// Handle sign out from sidebar
const handleSignOut = () => {
  if (mobile.value) {
    drawer.value = false;
  }
  logout();
};

// Passkey registration requires an active Cognito hosted UI session cookie.
// It is separate from JWT tokens (managed by oidc-client-ts) and expires after ~24h.
// When it expires, opening the passkey page makes Cognito redirect back to the app
// with ?result=invalid_session instead of showing the page.
//
// To recover automatically, we use a two-step flow:
//   Page load 1 — ?result=invalid_session detected:
//     Save the passkey URL and trigger re-login to refresh the Cognito session.
//   Page load 2 — returning from Cognito login:
//     Read the saved URL, wait for auth to complete, navigate to the passkey page.
//
// PENDING_PASSKEY_KEY: set before leaving for the passkey page,
//   so on return we can tell whether invalid_session came from a passkey attempt.
// PENDING_REDIRECT_KEY: stores the destination URL between the two page loads.
//   Uses sessionStorage — persists within the same tab, clears on tab close.
const PENDING_PASSKEY_KEY = "pending_passkey";
const PENDING_REDIRECT_KEY = "pending_redirect";

const handlePasskeyRegistration = () => {
  if (mobile.value) {
    drawer.value = false;
  }

  // Mark that we initiated a passkey registration before navigating away.
  // If Cognito's session has expired, it redirects back with ?result=invalid_session.
  // On that return, this flag tells Page load 1 that the invalid_session came from
  // a passkey attempt (not some other flow), so it can trigger re-login automatically.
  sessionStorage.setItem(PENDING_PASSKEY_KEY, "true");
  window.location.href = passkeyRegistrationUrl.value!;
};

// Removes a single query parameter from the current URL in-place (no page reload),
// so that a refresh doesn't re-trigger logic that checks for that parameter.
const removeQueryParam = (key: string) => {
  const params = new URLSearchParams(window.location.search);
  params.delete(key);

  const cleanSearch = params.size > 0 ? `?${params.toString()}` : "";
  const cleanUrl = window.location.pathname + cleanSearch + window.location.hash;

  window.history.replaceState({}, document.title, cleanUrl);
};

// Page load 1: handle Cognito redirecting back with ?result=invalid_session.
onMounted(async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("result") === "invalid_session") {
    const wasPendingPasskey = sessionStorage.getItem(PENDING_PASSKEY_KEY) === "true";
    sessionStorage.removeItem(PENDING_PASSKEY_KEY);

    if (wasPendingPasskey && passkeyRegistrationUrl.value) {
      sessionStorage.setItem(PENDING_REDIRECT_KEY, passkeyRegistrationUrl.value);

      try {
        await login();
      } catch {
        sessionStorage.removeItem(PENDING_REDIRECT_KEY);
        removeQueryParam("result");

        showErrorSnackbar(
          "Passkey registration requires a fresh sign-in. Please sign out and sign in again.",
        );
      }
    } else {
      removeQueryParam("result");
      showErrorSnackbar("This action requires a fresh sign-in. Please sign out and sign in again.");
    }
  }
});

// Page load 2: after re-login, navigate to the saved destination.
// { immediate: true } is needed because signinRedirectCallback runs asynchronously —
// auth may already be resolved by the time this watcher is set up.
onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  // Page load 1 owns invalid_session loads — skip to avoid conflicting navigation.
  if (params.get("result") === "invalid_session") return;

  const pendingUrl = sessionStorage.getItem(PENDING_REDIRECT_KEY);

  if (pendingUrl) {
    // Must be `let`, not `const`: { immediate: true } can fire the callback
    // synchronously inside watch(), before the assignment to `unwatch` completes.
    // `const` would be in TDZ at that point — accessing it throws ReferenceError.
    // `let` is initialized to `undefined`, so the `if (unwatch)` guard below is safe.
    let unwatch: (() => void) | undefined;

    // eslint-disable-next-line prefer-const
    unwatch = watch(
      isAuthenticated,
      (authenticated) => {
        if (authenticated) {
          // unwatch may be undefined if isAuthenticated was already true on mount —
          // { immediate: true } fires the callback before the assignment completes.
          unwatch?.();
          sessionStorage.removeItem(PENDING_REDIRECT_KEY);
          window.location.href = pendingUrl;
        }
      },
      { immediate: true },
    );
  }
});
</script>
<template>
  <v-layout class="rounded rounded-md border">
    <v-app-bar title="Personal Budget Tracker">
      <template v-slot:prepend>
        <!-- Hamburger menu button for mobile -->
        <v-app-bar-nav-icon v-if="mobile" @click="drawer = !drawer" />
      </template>

      <template v-slot:append>
        <div class="d-flex align-center" :class="$vuetify.display.xs ? 'ga-2 pr-2' : 'ga-3 pr-3'">
          <!-- User info when authenticated -->
          <div
            v-if="isAuthenticated && user"
            class="d-flex align-center"
            :class="$vuetify.display.xs ? 'ga-1' : 'ga-2'"
          >
            <v-avatar :size="$vuetify.display.xs ? '28' : '32'">
              <v-img v-if="user.profile?.picture" :src="user.profile.picture" :alt="displayName" />
              <v-icon v-else>mdi-account</v-icon>
            </v-avatar>
            <span
              v-if="$vuetify.display.smAndUp"
              :class="$vuetify.display.sm ? 'text-caption' : 'text-body-2'"
            >
              {{ displayName }}
            </span>
          </div>

          <!-- Auth loading state -->
          <v-progress-circular
            v-if="authLoading || ensureUserLoading"
            indeterminate
            :size="$vuetify.display.xs ? '20' : '24'"
          />

          <!-- User creation error -->
          <v-tooltip v-if="userError" text="User creation failed">
            <template v-slot:activator="{ props }">
              <v-icon v-bind="props" color="warning" :size="$vuetify.display.xs ? '20' : '24'">
                mdi-alert-outline
              </v-icon>
            </template>
          </v-tooltip>
        </div>
      </template>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      :temporary="mobile"
      :permanent="!mobile"
      :mobile-breakpoint="960"
      :width="$vuetify.display.xs ? '280' : '300'"
    >
      <v-list
        nav
        :density="$vuetify.display.xs ? 'compact' : 'default'"
        class="d-flex flex-column h-100"
      >
        <!-- Sign In link only for unauthenticated users -->
        <v-list-item
          v-if="!isAuthenticated"
          :to="{ name: 'SignIn' }"
          prepend-icon="mdi-login"
          title="Sign In"
          @click="mobile && (drawer = false)"
        />
        <!-- Main app navigation for authenticated users -->
        <v-list-item
          v-if="isAuthenticated"
          :to="{ name: 'Transactions' }"
          prepend-icon="mdi-swap-horizontal"
          title="Transactions"
          @click="mobile && (drawer = false)"
        />
        <v-list-item
          v-if="isAuthenticated"
          :to="{ name: 'Accounts' }"
          prepend-icon="mdi-bank"
          title="Accounts"
          @click="mobile && (drawer = false)"
        />
        <v-list-item
          v-if="isAuthenticated"
          :to="{ name: 'Categories' }"
          prepend-icon="mdi-tag-multiple"
          title="Categories"
          @click="mobile && (drawer = false)"
        />
        <v-list-item
          v-if="isAuthenticated"
          :to="{ name: 'MonthlyCategoryReport' }"
          prepend-icon="mdi-table-large"
          title="Monthly Report"
          @click="mobile && (drawer = false)"
        />
        <v-list-item
          v-if="isAuthenticated"
          :to="{ name: 'Insight' }"
          prepend-icon="mdi-lightbulb-on-outline"
          title="Insight"
          @click="mobile && (drawer = false)"
        />
        <!-- Passkey registration -->
        <v-list-item
          v-if="isAuthenticated && passkeyRegistrationUrl"
          prepend-icon="mdi-key"
          title="Register Passkey"
          @click="handlePasskeyRegistration"
        />
        <!-- Push content to the bottom -->
        <v-spacer />
        <!-- Visual separator -->
        <v-divider v-if="isAuthenticated" />
        <!-- Sign out item -->
        <v-list-item
          v-if="isAuthenticated && !authLoading && !ensureUserLoading"
          prepend-icon="mdi-logout"
          title="Sign Out"
          :disabled="authLoading"
          @click="handleSignOut"
        />
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view />
    </v-main>
  </v-layout>

  <!-- Global Snackbar - Outside layout for proper viewport positioning -->
  <v-snackbar v-model="showSnackbar" :color="snackbarColor" timeout="4000" location="bottom">
    {{ snackbarMessage }}
    <template #actions>
      <v-btn variant="text" @click="hideSnackbar"> Close </v-btn>
    </template>
  </v-snackbar>
</template>
