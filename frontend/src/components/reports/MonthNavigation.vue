<template>
  <v-card class="month-navigation" elevation="2">
    <v-card-text class="d-flex align-center justify-space-between pa-4">
      <v-btn
        :icon="$vuetify.display.xs ? 'mdi-chevron-left' : undefined"
        :prepend-icon="$vuetify.display.smAndUp ? 'mdi-chevron-left' : undefined"
        color="primary"
        variant="outlined"
        :disabled="!canNavigatePrevious"
        @click="navigatePrevious"
      >
        <template v-if="$vuetify.display.smAndUp">Previous</template>
      </v-btn>

      <div class="text-h5 text-primary">
        {{ monthYearDisplay }}
      </div>

      <v-btn
        :icon="$vuetify.display.xs ? 'mdi-chevron-right' : undefined"
        :append-icon="$vuetify.display.smAndUp ? 'mdi-chevron-right' : undefined"
        color="primary"
        variant="outlined"
        :disabled="!canNavigateNext"
        @click="navigateNext"
      >
        <template v-if="$vuetify.display.smAndUp">Next</template>
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatMonthYear } from "@/utils/date";

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
  return !props.disabled;
});

// Check if we can navigate to next month
const canNavigateNext = computed(() => {
  // Disable if loading or explicitly disabled
  return !props.disabled;
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
