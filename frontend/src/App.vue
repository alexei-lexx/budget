<script setup lang="ts">
import { useQuery } from "@vue/apollo-composable";
import gql from "graphql-tag";

const { result, loading, error, refetch } = useQuery(gql`
  query checkHealth {
    health
  }
`);
</script>
<template>
  <v-layout class="rounded rounded-md border">
    <v-app-bar title="Personal Budget Tracker"></v-app-bar>

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
