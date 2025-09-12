<template>
  <v-card class="month-navigation" elevation="2">
    <v-card-text class="d-flex align-center justify-space-between pa-4">
      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-chevron-left"
        :disabled="!canNavigatePrevious"
        @click="navigatePrevious"
      >
        Previous
      </v-btn>

      <div class="text-h5 text-primary">
        {{ monthYearDisplay }}
      </div>

      <v-btn
        color="primary"
        variant="outlined"
        append-icon="mdi-chevron-right"
        :disabled="!canNavigateNext"
        @click="navigateNext"
      >
        Next
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatMonthYear } from "@/utils/validation";

interface Props {
  year: number;
  month: number;
  disabled?: boolean;
}

interface Emits {
  (e: "navigate", payload: { year: number; month: number }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Format month and year for display
const monthYearDisplay = computed(() => {
  return formatMonthYear(props.year, props.month);
});

// Check if we can navigate to previous month
const canNavigatePrevious = computed(() => {
  // Disable if loading or explicitly disabled
  if (props.disabled) return false;

  // Allow navigation to any past month (no lower limit for now)
  return true;
});

// Check if we can navigate to next month (not beyond current month)
const canNavigateNext = computed(() => {
  // Disable if loading or explicitly disabled
  if (props.disabled) return false;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Can navigate next if we're not at the current month
  return props.year < currentYear || (props.year === currentYear && props.month < currentMonth);
});

// Navigate to previous month
const navigatePrevious = () => {
  if (!canNavigatePrevious.value) return;

  let newYear = props.year;
  let newMonth = props.month - 1;

  // Handle year boundary
  if (newMonth < 1) {
    newMonth = 12;
    newYear--;
  }

  emit("navigate", { year: newYear, month: newMonth });
};

// Navigate to next month
const navigateNext = () => {
  if (!canNavigateNext.value) return;

  let newYear = props.year;
  let newMonth = props.month + 1;

  // Handle year boundary
  if (newMonth > 12) {
    newMonth = 1;
    newYear++;
  }

  emit("navigate", { year: newYear, month: newMonth });
};
</script>
