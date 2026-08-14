<!-- eslint-disable vue/multi-word-component-names -->
<script setup lang="ts">
import { watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import LoginButton from "@/components/auth/LoginButton.vue";

const router = useRouter();
const { isAuthenticated, isLoading: authLoading, displayName } = useAuth();
const { t } = useI18n();

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
        {{ t("signIn.welcome") }}
      </div>
      <div :class="$vuetify.display.xs ? 'text-body-2' : 'text-body-1'" class="text-center">
        <div v-if="!isAuthenticated && !authLoading">
          {{ t("signIn.prompt") }}
        </div>
        <div v-else-if="authLoading">{{ t("signIn.settingUp") }}</div>
        <div v-else>{{ t("signIn.welcomeBack", { name: displayName }) }}</div>
      </div>
      <div v-if="!isAuthenticated && !authLoading" class="mt-6">
        <LoginButton />
      </div>
    </v-sheet>
  </v-container>
</template>
