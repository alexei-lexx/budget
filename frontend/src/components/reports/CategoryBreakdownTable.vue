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
        <div class="text-body-1 text-medium-emphasis">No transactions found</div>
      </div>

      <div v-else>
        <!-- Category Breakdown Table -->
        <v-table density="compact">
          <tbody>
            <template v-for="(category, categoryIndex) in categories" :key="categoryIndex">
              <tr
                v-for="(breakdown, breakdownIndex) in category.currencyBreakdowns"
                :key="`${categoryIndex}-${breakdownIndex}`"
              >
                <td v-if="breakdownIndex === 0" :rowspan="category.currencyBreakdowns.length">
                  <em v-if="!category.categoryId">{{ category.categoryName }}</em>
                  <span v-else>{{ category.categoryName }}</span>
                </td>
                <td class="text-right">
                  {{ formatCurrency(breakdown.totalAmount, breakdown.currency) }}
                </td>
                <td class="text-right">{{ breakdown.percentage }}%</td>
              </tr>
            </template>
          </tbody>
          <tfoot v-if="currencyTotals.length > 0">
            <tr v-for="(total, index) in currencyTotals" :key="index">
              <th v-if="index === 0" :rowspan="currencyTotals.length">Total</th>
              <th class="text-right">
                {{ formatCurrency(total.totalAmount, total.currency) }}
              </th>
              <th class="text-right">—</th>
            </tr>
          </tfoot>
        </v-table>
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
import { formatCurrency } from "@/utils/currency";

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
