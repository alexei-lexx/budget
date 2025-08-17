<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  useTransactionPatterns,
  type TransactionPatternType,
  type TransactionPattern,
} from "@/composables/useTransactionPatterns";

interface Props {
  transactionType: TransactionPatternType;
  loading?: boolean;
}

interface PatternSelectedEvent {
  accountId: string;
  categoryId: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  "pattern-selected": [pattern: PatternSelectedEvent];
}>();

// Use reactive ref for transaction type to work with useTransactionPatterns
const transactionTypeRef = ref(props.transactionType);

// Watch for prop changes
watch(
  () => props.transactionType,
  (newType) => {
    transactionTypeRef.value = newType;
  },
);

// Get patterns using composable
const { patterns, patternsLoading, patternsError } = useTransactionPatterns(transactionTypeRef);

// Show component only if patterns are available
const hasPatterns = computed(() => {
  return patterns.value && patterns.value.length > 0;
});

// Handle pattern button click
const handlePatternClick = (pattern: TransactionPattern) => {
  if (props.loading) return;

  emit("pattern-selected", {
    accountId: pattern.accountId,
    categoryId: pattern.categoryId,
  });
};

// Format pattern button text
const formatPatternText = (pattern: TransactionPattern) => {
  return `${pattern.accountName} + ${pattern.categoryName}`;
};
</script>

<template>
  <!-- Only show if patterns are available and not in error state -->
  <div v-if="hasPatterns && !patternsError" class="mb-4">
    <!-- Loading state -->
    <div v-if="patternsLoading" class="d-flex justify-center pa-2">
      <v-progress-circular size="24" indeterminate />
    </div>

    <!-- Pattern buttons -->
    <div v-else class="d-flex flex-wrap ga-2">
      <v-chip
        v-for="pattern in patterns"
        :key="`${pattern.accountId}-${pattern.categoryId}`"
        variant="outlined"
        size="small"
        :disabled="loading"
        @click="handlePatternClick(pattern)"
        class="text-caption"
        clickable
      >
        {{ formatPatternText(pattern) }}
      </v-chip>
    </div>
  </div>
</template>
