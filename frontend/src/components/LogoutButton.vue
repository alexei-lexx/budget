<template>
  <v-btn
    color="secondary"
    variant="outlined"
    :loading="isLoading"
    :disabled="isLoading"
    @click="handleLogout"
  >
    <v-icon start icon="mdi-logout" />
    Sign Out
  </v-btn>
</template>

<script setup lang="ts">
import { useAuth } from "@/composables/useAuth";

const { logout, isLoading } = useAuth();

const handleLogout = () => {
  logout();
};
</script>
