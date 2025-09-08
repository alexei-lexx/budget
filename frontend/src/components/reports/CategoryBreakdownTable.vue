<template>
  <v-card class="category-breakdown-table" elevation="2">
    <v-card-text>
      <div v-if="loading" class="d-flex justify-center pa-4">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </div>

      <div v-else-if="error" class="text-center pa-4">
        <v-icon size="48" color="error" class="mb-2">mdi-alert-circle</v-icon>
        <div class="text-body-1 text-error mb-2">Failed to load category breakdown</div>
        <div class="text-body-2 text-medium-emphasis">{{ error }}</div>
      </div>

      <div v-else-if="!categories || categories.length === 0" class="text-center pa-8">
        <v-icon size="64" color="surface-variant" class="mb-4">mdi-chart-pie-outline</v-icon>
        <div class="text-h6 mb-2">No expenses found</div>
        <div class="text-body-2 text-medium-emphasis">
          No expense transactions found for {{ monthYear }}
        </div>
      </div>

      <div v-else>
        <!-- Desktop Table View -->
        <v-table class="d-none d-sm-table" density="compact">
          <tbody>
            <template v-for="category in categories" :key="category.categoryId || 'uncategorized'">
              <tr
                v-for="(breakdown, index) in category.currencyBreakdowns"
                :key="`${category.categoryId || 'uncategorized'}-${breakdown.currency}`"
                :class="{ 'border-bottom': index === category.currencyBreakdowns.length - 1 }"
              >
                <td v-if="index === 0" :rowspan="category.currencyBreakdowns.length" class="py-2">
                  <v-icon v-if="!category.categoryId" size="small" class="me-1">
                    mdi-help-circle-outline
                  </v-icon>
                  {{ category.categoryName }}
                </td>
                <td class="text-right py-2">
                  {{ formatCurrencyAmount(breakdown.totalAmount, breakdown.currency) }}
                </td>
              </tr>
            </template>
          </tbody>
          <tfoot v-if="currencyTotals.length > 0">
            <tr v-for="(total, index) in currencyTotals" :key="total.currency">
              <th v-if="index === 0" :rowspan="currencyTotals.length">Total</th>
              <th class="text-right">
                {{ formatCurrencyAmount(total.totalAmount, total.currency) }}
              </th>
            </tr>
          </tfoot>
        </v-table>

        <!-- Mobile Card View -->
        <div class="d-sm-none">
          <v-card
            v-for="category in categories"
            :key="category.categoryId || 'uncategorized'"
            class="mb-3"
            variant="outlined"
          >
            <v-card-text class="pa-3">
              <div class="d-flex align-center mb-2">
                <v-icon v-if="!category.categoryId" size="small" class="me-1">
                  mdi-help-circle-outline
                </v-icon>
                <span>{{ category.categoryName }}</span>
              </div>

              <div
                v-for="breakdown in category.currencyBreakdowns"
                :key="breakdown.currency"
                class="d-flex align-center justify-end"
                :class="{ 'mt-2': category.currencyBreakdowns.length > 1 }"
              >
                {{ formatCurrencyAmount(breakdown.totalAmount, breakdown.currency) }}
              </div>
            </v-card-text>
          </v-card>

          <!-- Mobile Totals -->
          <v-card v-if="currencyTotals.length > 0" variant="outlined" class="mt-3">
            <v-card-text class="pa-3">
              <v-divider class="mb-3"></v-divider>
              <div class="d-flex align-center mb-2">
                <strong>Total</strong>
              </div>
              <div v-for="total in currencyTotals" :key="total.currency" class="d-flex justify-end">
                <strong>{{ formatCurrencyAmount(total.totalAmount, total.currency) }}</strong>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type {
  MonthlyReportCategory,
  MonthlyReportCurrencyTotal,
} from "@/composables/useMonthlyReports";
import { useMonthlyReports } from "@/composables/useMonthlyReports";

// Define component props
interface Props {
  categories?: MonthlyReportCategory[] | null;
  currencyTotals?: MonthlyReportCurrencyTotal[] | null;
  loading?: boolean;
  error?: string | null;
  monthYear?: string;
}

const props = withDefaults(defineProps<Props>(), {
  categories: null,
  currencyTotals: null,
  loading: false,
  error: null,
  monthYear: "",
});

// Get currency formatting utility
const { formatCurrencyAmount } = useMonthlyReports();

// Computed properties for better organization
const categories = computed(() => {
  if (!props.categories) return [];

  // Sort categories alphabetically, with "Uncategorized" last
  return [...props.categories].sort((a, b) => {
    // If one is uncategorized (no categoryId), put it last
    if (!a.categoryId && b.categoryId) return 1;
    if (a.categoryId && !b.categoryId) return -1;
    if (!a.categoryId && !b.categoryId) return 0;

    // Otherwise sort alphabetically by name
    return a.categoryName.localeCompare(b.categoryName);
  });
});

const currencyTotals = computed(() => {
  if (!props.currencyTotals) return [];

  // Sort currency totals alphabetically by currency
  return [...props.currencyTotals].sort((a, b) => a.currency.localeCompare(b.currency));
});
</script>

<style scoped>
.category-breakdown-table {
  .border-bottom {
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  }
}

/* Ensure proper spacing in mobile view */
@media (max-width: 600px) {
  .category-breakdown-table :deep(.v-card-text) {
    padding-left: 12px;
    padding-right: 12px;
  }
}
</style>
