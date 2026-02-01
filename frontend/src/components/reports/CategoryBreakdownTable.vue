<template>
  <v-card class="category-breakdown-table" elevation="2">
    <v-card-text>
      <!-- Sort Controls -->
      <v-chip-group
        v-if="categories && categories.length > 0"
        v-model="sortBy"
        mandatory
        class="d-flex mb-3"
      >
        <v-chip value="category" size="small" variant="outlined">
          category
          <v-icon end>mdi-sort-alphabetical-ascending</v-icon>
        </v-chip>
        <v-spacer />
        <v-chip value="amount" size="small" variant="outlined">
          amount
          <v-icon end>mdi-sort-numeric-descending</v-icon>
        </v-chip>
      </v-chip-group>

      <div v-if="loading" class="d-flex justify-center pa-4">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </div>

      <div v-else-if="error" class="text-center pa-4">
        <v-icon size="48" color="error" class="mb-2">mdi-alert-circle</v-icon>
        <div class="text-h6 text-error mb-2">Failed to load category breakdown</div>
        <div class="text-body-1 text-medium-emphasis">{{ error }}</div>
      </div>

      <v-empty-state
        v-else-if="!categories || categories.length === 0"
        icon="mdi-file-document-outline"
        title="No transactions found"
        text="There are no expense transactions for this month."
      />

      <div v-else>
        <!-- Category Breakdown Table -->
        <v-table>
          <tbody>
            <template v-for="(category, categoryIndex) in categories" :key="categoryIndex">
              <tr
                v-for="(breakdown, breakdownIndex) in category.currencyBreakdowns"
                :key="`${categoryIndex}-${breakdownIndex}`"
                class="category-row"
                @click="handleCategoryClick(category)"
              >
                <td v-if="breakdownIndex === 0" :rowspan="category.currencyBreakdowns.length">
                  <div class="d-flex align-center">
                    <v-icon
                      size="small"
                      class="mr-2"
                      :icon="
                        expandedCategories.has(getCategoryKey(category))
                          ? 'mdi-chevron-down'
                          : 'mdi-chevron-right'
                      "
                    />
                    <em v-if="!category.categoryId" class="text-h6">{{ category.categoryName }}</em>
                    <span v-else class="text-h6">{{ category.categoryName }}</span>
                  </div>
                </td>
                <td class="text-right text-h6 text-medium-emphasis">
                  {{ formatCurrency(breakdown.totalAmount, breakdown.currency) }}
                </td>
                <td class="text-right text-h6 text-high-emphasis">{{ breakdown.percentage }}%</td>
              </tr>

              <!-- Expanded transaction list -->
              <tr v-if="expandedCategories.has(getCategoryKey(category))">
                <td :colspan="3" class="pa-0">
                  <div class="pa-3">
                    <!-- Show count badge if there are more transactions than displayed -->
                    <div
                      v-if="category.totalTransactionCount > category.topTransactions.length"
                      class="mb-2"
                    >
                      <v-chip size="small" color="primary" variant="tonal">
                        Showing {{ category.topTransactions.length }} of
                        {{ category.totalTransactionCount }}
                      </v-chip>
                    </div>

                    <!-- Transaction list -->
                    <div
                      v-if="category.topTransactions.length === 0"
                      class="text-center pa-4 text-medium-emphasis"
                    >
                      No transactions found
                    </div>
                    <div v-else class="transaction-list">
                      <TransactionCard
                        v-for="transaction in category.topTransactions"
                        :key="transaction.id"
                        :transaction="transaction"
                        :is-expanded="false"
                        class="mb-2"
                        @toggle-expand="() => {}"
                      />
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
          <tfoot v-if="currencyTotals.length > 0">
            <tr v-for="(total, index) in currencyTotals" :key="index">
              <th v-if="index === 0" :rowspan="currencyTotals.length" class="text-h6">Total</th>
              <th class="text-right text-h6 text-high-emphasis">
                {{ formatCurrency(total.totalAmount, total.currency) }}
              </th>
              <th class="text-right text-h6 text-high-emphasis">—</th>
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
import TransactionCard from "@/components/transactions/TransactionCard.vue";

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

// Track expanded categories
const expandedCategories = ref<Set<string>>(new Set());

// Helper function to get a unique key for a category
const getCategoryKey = (category: MonthlyReportCategory): string => {
  return category.categoryId || "uncategorized";
};

// Handle category row click to expand/collapse
const handleCategoryClick = (category: MonthlyReportCategory) => {
  const key = getCategoryKey(category);
  if (expandedCategories.value.has(key)) {
    expandedCategories.value.delete(key);
  } else {
    expandedCategories.value.add(key);
  }
  // Trigger Vue reactivity
  expandedCategories.value = new Set(expandedCategories.value);
};

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

<style scoped>
.category-row {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.category-row:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.05);
}
</style>
