<script setup lang="ts">
import { useQuery } from "@vue/apollo-composable";
import { computed } from "vue";
import gql from "graphql-tag";
import { useAuth } from "@/composables/useAuth";
import LoginButton from "@/components/LoginButton.vue";
import LogoutButton from "@/components/LogoutButton.vue";
import { anonymizeEmail } from "@/utils/anonymize";

const { result, loading, error, refetch } = useQuery(gql`
  query checkHealth {
    health
  }
`);

const { user, isAuthenticated, isLoading: authLoading } = useAuth();

const displayName = computed(() => {
  if (!user.value?.email) return "noname";

  return anonymizeEmail(user.value.email);
});
</script>
<template>
  <v-layout class="rounded rounded-md border">
    <v-app-bar title="Personal Budget Tracker">
      <template v-slot:append>
        <div class="d-flex align-center ga-3">
          <!-- User info when authenticated -->
          <div v-if="isAuthenticated && user" class="d-flex align-center ga-2">
            <v-avatar size="32">
              <v-img v-if="user.picture" :src="user.picture" :alt="displayName" />
              <v-icon v-else>mdi-account</v-icon>
            </v-avatar>
            <span class="text-body-2">{{ displayName }}</span>
          </div>

          <!-- Auth loading state -->
          <v-progress-circular v-if="authLoading" indeterminate size="24" />

          <!-- Auth buttons -->
          <LoginButton v-if="!isAuthenticated && !authLoading" />
          <LogoutButton v-if="isAuthenticated && !authLoading" />
        </div>
      </template>
    </v-app-bar>

    <v-navigation-drawer>
      <v-list nav>
        <v-list-item title="Navigation drawer" link></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main class="d-flex align-center justify-center" height="300">
      <v-container>
        <v-sheet
          border="dashed md"
          color="surface-light"
          height="200"
          rounded="lg"
          width="100%"
          class="d-flex flex-column align-center justify-center"
        >
          <div class="text-h6 mb-4">GraphQL API Connection Status</div>

          <div v-if="loading" class="d-flex align-center">
            <v-progress-circular indeterminate size="24" class="mr-2"></v-progress-circular>
            <span>Connecting to API...</span>
          </div>

          <div v-else-if="error" class="text-center">
            <v-icon color="error" size="48" class="mb-2">mdi-alert-circle</v-icon>
            <div class="text-error mb-2">Connection Failed</div>
            <div class="text-caption mb-3">{{ error.message }}</div>
            <v-btn @click="refetch()" color="primary" variant="outlined"> Retry Connection </v-btn>
          </div>

          <div v-else-if="result?.health" class="text-center">
            <v-icon color="success" size="48" class="mb-2">mdi-check-circle</v-icon>
            <div class="text-success mb-2">Connected Successfully</div>
            <div class="text-caption">API Response: {{ result.health }}</div>
            <v-btn @click="refetch()" color="primary" variant="outlined" class="mt-3">
              Test Again
            </v-btn>
          </div>
        </v-sheet>
      </v-container>
    </v-main>
  </v-layout>
</template>
