<script setup lang="ts">
import { computed, watch, onMounted, ref } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useUser } from "@/composables/useUser";
import { useSnackbar } from "@/composables/useSnackbar";
import { useDisplay } from "vuetify";
import LoginButton from "@/components/auth/LoginButton.vue";
import LogoutButton from "@/components/auth/LogoutButton.vue";
import { setAuthTokenGetter, globalError, clearGlobalError } from "@/apollo";

const { user, isAuthenticated, isLoading: authLoading, getAccessToken } = useAuth();
const { ensureUser, ensureUserLoading, userError } = useUser();
const { showSnackbar, snackbarMessage, snackbarColor, hideSnackbar, showErrorSnackbar } =
  useSnackbar();
const { mobile } = useDisplay();

// Navigation drawer state
const drawer = ref(true);

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

const displayName = computed(() => {
  if (!user.value?.email) return "noname";

  return user.value.email;
});

// Watch for global GraphQL errors and display them via snackbar
watch(globalError, (error) => {
  if (error) {
    showErrorSnackbar(error);
    clearGlobalError();
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
        <div class="d-flex align-center" :class="$vuetify.display.xs ? 'ga-2' : 'ga-3'">
          <!-- User info when authenticated -->
          <div
            v-if="isAuthenticated && user"
            class="d-flex align-center"
            :class="$vuetify.display.xs ? 'ga-1' : 'ga-2'"
          >
            <v-avatar :size="$vuetify.display.xs ? '28' : '32'">
              <v-img v-if="user.picture" :src="user.picture" :alt="displayName" />
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

          <!-- Auth buttons -->
          <LoginButton v-if="!isAuthenticated && !authLoading" />
          <LogoutButton v-if="isAuthenticated && !authLoading && !ensureUserLoading" />
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
      <v-list nav :density="$vuetify.display.xs ? 'compact' : 'default'">
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
          title="Monthly Report by Category"
          @click="mobile && (drawer = false)"
        />
        <v-list-item
          v-if="isAuthenticated"
          :to="{ name: 'MonthlyWeekdayReport' }"
          prepend-icon="mdi-chart-bar"
          title="Monthly Report by Weekday"
          @click="mobile && (drawer = false)"
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
