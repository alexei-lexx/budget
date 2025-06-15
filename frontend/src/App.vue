<script setup lang="ts">
import { ref, watch } from "vue";
import { useQuery } from '@vue/apollo-composable';
import gql from "graphql-tag";

const { result } = useQuery(gql`
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
        <v-sheet border="dashed md" color="surface-light" height="200" rounded="lg" width="100%">
          GraphQL health check: {{ result?.health }}
        </v-sheet>
      </v-container>
    </v-main>
  </v-layout>
</template>
