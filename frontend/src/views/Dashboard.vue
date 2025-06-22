<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { computed } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useUser } from "@/composables/useUser";
import { anonymizeEmail } from "@/utils/anonymize";

const { user, isAuthenticated, isLoading: authLoading } = useAuth();
const { ensureUserLoading } = useUser();

const displayName = computed(() => {
  if (!user.value?.email) return "noname";
  return anonymizeEmail(user.value.email);
});
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
        <div v-else-if="authLoading || ensureUserLoading">Setting up your account...</div>
        <div v-else>Welcome back, {{ displayName }}! Your account is ready.</div>
      </div>
    </v-sheet>
  </v-container>
</template>
