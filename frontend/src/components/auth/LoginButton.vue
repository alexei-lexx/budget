<template>
  <v-btn
    color="primary"
    variant="elevated"
    :loading="isLoading"
    :disabled="isLoading"
    @click="handleLogin"
  >
    <v-icon start icon="mdi-login" />
    {{ t("signIn.button") }}
  </v-btn>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAuth } from "@/composables/useAuth";

const { login, isLoading } = useAuth();
const { t } = useI18n();
const loginError = ref<string | null>(null);

const handleLogin = async () => {
  try {
    loginError.value = null;
    await login();
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : t("signIn.loginFailed");
    console.error("Login error:", error);
  }
};
</script>
