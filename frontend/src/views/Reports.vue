<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
          <h1 class="text-h4">Reports</h1>
        </div>

        <!-- Month Navigation -->
        <v-card class="mb-6" elevation="2">
          <v-card-text class="d-flex align-center justify-space-between pa-4">
            <v-btn color="primary" variant="outlined" prepend-icon="mdi-chevron-left" disabled>
              Previous
            </v-btn>
            <div class="text-h5 text-primary">{{ selectedMonthYear }}</div>
            <v-btn color="primary" variant="outlined" append-icon="mdi-chevron-right" disabled>
              Next
            </v-btn>
          </v-card-text>
        </v-card>

        <!-- Placeholder Content -->
        <v-sheet
          border="dashed md"
          color="surface-light"
          height="400"
          rounded="lg"
          width="100%"
          class="d-flex flex-column align-center justify-center"
        >
          <v-icon size="80" class="mb-4" color="primary">mdi-chart-line</v-icon>
          <div class="text-h5 mb-2">Monthly Reports Feature</div>
          <div class="text-body-1 text-center mb-4 px-4">
            This feature is currently in development. Soon you'll be able to view your monthly
            spending by category, track expenses across different currencies, and navigate between
            different months to analyze your financial patterns.
          </div>
          <div class="text-body-2 text-medium-emphasis text-center px-4">
            Features coming soon:
            <ul class="text-left mt-2">
              <li>Monthly expense breakdown by category</li>
              <li>Spending percentages and totals</li>
              <li>Multi-currency support</li>
              <li>Month-by-month navigation</li>
            </ul>
          </div>
        </v-sheet>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from "vue";

// Get selected month and year (defaults to current)
const selectedDate = new Date();
const selectedMonthYear = computed(() => {
  return selectedDate.toLocaleString("default", { month: "short", year: "numeric" });
});
</script>
