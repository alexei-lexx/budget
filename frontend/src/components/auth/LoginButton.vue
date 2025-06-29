<template>
  <v-btn
    color="primary"
    variant="elevated"
    :loading="isLoading"
    :disabled="isLoading"
    @click="handleLogin"
  >
    <v-icon start icon="mdi-login" />
    Sign In
  </v-btn>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "@/composables/useAuth";

const { login, isLoading } = useAuth();
const loginError = ref<string | null>(null);

const handleLogin = async () => {
  try {
    loginError.value = null;
    await login();
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : "Login failed";
    console.error("Login error:", error);
  }
};
</script>
