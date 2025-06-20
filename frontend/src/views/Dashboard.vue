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
  <v-container>
    <v-sheet
      border="dashed md"
      color="surface-light"
      height="200"
      rounded="lg"
      width="100%"
      class="d-flex flex-column align-center justify-center"
    >
      <div class="text-h6 mb-4">Welcome to Personal Budget Tracker</div>
      <div class="text-body-1 text-center">
        <div v-if="!isAuthenticated && !authLoading">
          Please sign in to start managing your finances
        </div>
        <div v-else-if="authLoading || ensureUserLoading">Setting up your account...</div>
        <div v-else>
          Welcome back, {{ displayName }}! Your account is ready.
        </div>
      </div>
    </v-sheet>
  </v-container>
</template>