<template>
  <v-card class="year-navigation" elevation="2">
    <v-card-text class="d-flex align-center justify-space-between pa-4">
      <!-- Desktop: d-none (hidden <600px) + d-sm-flex (shows ≥600px) -->
      <v-btn
        class="d-none d-sm-flex"
        color="primary"
        variant="outlined"
        prepend-icon="mdi-chevron-left"
        :disabled="!canNavigate"
        @click="navigatePrevious"
      >
        Previous
      </v-btn>
      <!-- Mobile: d-flex (shows <600px) + d-sm-none (hidden ≥600px) -->
      <v-btn
        class="d-flex d-sm-none"
        color="primary"
        variant="outlined"
        icon="mdi-chevron-left"
        aria-label="Previous"
        :disabled="!canNavigate"
        @click="navigatePrevious"
      />

      <div class="text-h5 text-primary">
        {{ props.year }}
      </div>

      <!-- Desktop: d-none (hidden <600px) + d-sm-flex (shows ≥600px) -->
      <v-btn
        class="d-none d-sm-flex"
        color="primary"
        variant="outlined"
        append-icon="mdi-chevron-right"
        :disabled="!canNavigate"
        @click="navigateNext"
      >
        Next
      </v-btn>
      <!-- Mobile: d-flex (shows <600px) + d-sm-none (hidden ≥600px) -->
      <v-btn
        class="d-flex d-sm-none"
        color="primary"
        variant="outlined"
        icon="mdi-chevron-right"
        aria-label="Next"
        :disabled="!canNavigate"
        @click="navigateNext"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from "vue";

interface Props {
  year: number;
  disabled?: boolean;
}

interface Emits {
  (e: "navigate", payload: { year: number }): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const canNavigate = computed(() => !props.disabled);

const navigatePrevious = () => {
  if (!canNavigate.value) return;
  emit("navigate", { year: props.year - 1 });
};

const navigateNext = () => {
  if (!canNavigate.value) return;
  emit("navigate", { year: props.year + 1 });
};
</script>
