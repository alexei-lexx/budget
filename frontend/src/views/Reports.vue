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

        <!-- Monthly Report Content -->
        <CategoryBreakdownTable
          :categories="monthlyReport?.categories"
          :currency-totals="monthlyReport?.currencyTotals"
          :loading="monthlyReportLoading"
          :error="monthlyReportError?.message"
          :month-year="selectedMonthYear"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from "vue";
import CategoryBreakdownTable from "@/components/reports/CategoryBreakdownTable.vue";
import { useMonthlyReports } from "@/composables/useMonthlyReports";

// Get selected month and year (defaults to current)
const selectedDate = new Date();
const selectedMonthYear = computed(() => {
  return selectedDate.toLocaleString("default", { month: "long", year: "numeric" });
});

// Get current month expense report
const { useCurrentMonthExpenseReport } = useMonthlyReports();
const { monthlyReport, monthlyReportLoading, monthlyReportError } = useCurrentMonthExpenseReport();
</script>
