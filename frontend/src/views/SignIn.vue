<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";

const router = useRouter();
const { user, isAuthenticated, isLoading: authLoading } = useAuth();

const displayName = computed(() => {
  if (!user.value?.profile?.email) return "noname";
  return user.value?.profile?.email;
});

// Redirect authenticated users to transactions page
watch(
  [isAuthenticated, authLoading],
  ([authenticated, authIsLoading]) => {
    // Only redirect when auth is done loading and user is authenticated
    if (!authIsLoading && authenticated) {
      router.push("/transactions");
    }
  },
  { immediate: true },
);
</script>

<template>
  <v-container :class="{ 'pa-3': $vuetify.display.xs, 'pa-6': $vuetify.display.smAndUp }">
    <v-sheet
      border="dashed md"
      color="surface-light"
      :height="$vuetify.display.xs ? '150' : '200'"
      rounded="lg"
      width="100%"
      class="d-flex flex-column align-center justify-center"
      :class="{ 'pa-4': $vuetify.display.xs, 'pa-6': $vuetify.display.smAndUp }"
    >
      <div :class="$vuetify.display.xs ? 'text-h6' : 'text-h5'" class="mb-4 text-center">
        Welcome to Personal Budget Tracker
      </div>
      <div :class="$vuetify.display.xs ? 'text-body-2' : 'text-body-1'" class="text-center">
        <div v-if="!isAuthenticated && !authLoading">
          Please sign in to start managing your finances
        </div>
        <div v-else-if="authLoading">Setting up your account...</div>
        <div v-else>Welcome back, {{ displayName }}! Redirecting to your transactions...</div>
      </div>
    </v-sheet>
  </v-container>
</template>
