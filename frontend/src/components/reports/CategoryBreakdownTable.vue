<template>
  <v-card class="category-breakdown-table" elevation="2">
    <v-card-text>
      <!-- Sort Controls -->
      <div v-if="categories && categories.length > 0" class="d-flex justify-end mb-3">
        <v-chip-group v-model="sortBy" mandatory>
          <v-chip value="amount" size="small" variant="outlined">
            amount
            <v-icon end>mdi-sort-numeric-descending</v-icon>
          </v-chip>
          <v-chip value="category" size="small" variant="outlined">
            category
            <v-icon end>mdi-sort-alphabetical-ascending</v-icon>
          </v-chip>
        </v-chip-group>
      </div>

      <div v-if="loading" class="d-flex justify-center pa-4">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </div>

      <div v-else-if="error" class="text-center pa-4">
        <v-icon size="48" color="error" class="mb-2">mdi-alert-circle</v-icon>
        <div class="text-h6 text-error mb-2">Failed to load category breakdown</div>
        <div class="text-body-1 text-medium-emphasis">{{ error }}</div>
      </div>

      <div v-else-if="!categories || categories.length === 0" class="text-center pa-8">
        <div class="text-h6 text-medium-emphasis">No transactions found</div>
      </div>

      <div v-else>
        <!-- Category Breakdown Table -->
        <v-table>
          <tbody>
            <template v-for="(category, categoryIndex) in categories" :key="categoryIndex">
              <tr
                v-for="(breakdown, breakdownIndex) in category.currencyBreakdowns"
                :key="`${categoryIndex}-${breakdownIndex}`"
              >
                <td v-if="breakdownIndex === 0" :rowspan="category.currencyBreakdowns.length">
                  <em v-if="!category.categoryId" class="text-subtitle-1">{{
                    category.categoryName
                  }}</em>
                  <span v-else class="text-subtitle-1">{{ category.categoryName }}</span>
                </td>
                <td class="text-right text-subtitle-1 font-weight-medium">
                  {{ formatCurrency(breakdown.totalAmount, breakdown.currency) }}
                </td>
                <td class="text-right text-body-1">{{ breakdown.percentage }}%</td>
              </tr>
            </template>
          </tbody>
          <tfoot v-if="currencyTotals.length > 0">
            <tr v-for="(total, index) in currencyTotals" :key="index">
              <th v-if="index === 0" :rowspan="currencyTotals.length" class="text-subtitle-1 font-weight-bold">Total</th>
              <th class="text-right text-subtitle-1 font-weight-bold">
                {{ formatCurrency(total.totalAmount, total.currency) }}
              </th>
              <th class="text-right text-body-1">—</th>
            </tr>
          </tfoot>
        </v-table>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
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

// Sort options state
const sortBy = ref<"category" | "amount">("amount");

// Helper function to calculate total amount across all currencies for a category
const calculateCategoryTotal = (category: MonthlyReportCategory): number => {
  return category.currencyBreakdowns.reduce((sum, breakdown) => sum + breakdown.totalAmount, 0);
};

// Computed properties for better organization
const categories = computed(() => {
  if (!props.categories) return [];

  const categoriesCopy = [...props.categories];

  if (sortBy.value === "amount") {
    // Sort by total amount (highest first)
    return categoriesCopy.sort((a, b) => {
      const aTotalAmount = calculateCategoryTotal(a);
      const bTotalAmount = calculateCategoryTotal(b);

      // Sort by amount descending (highest first)
      return bTotalAmount - aTotalAmount;
    });
  } else {
    // Sort alphabetically by category name
    return categoriesCopy.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }
});

const currencyTotals = computed(() => {
  if (!props.currencyTotals) return [];

  // Sort currency totals alphabetically by currency
  return [...props.currencyTotals].sort((a, b) => a.currency.localeCompare(b.currency));
});
</script>
