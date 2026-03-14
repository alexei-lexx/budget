<template>
  <v-btn
    :disabled="agentTrace.length === 0 || loading"
    icon="mdi-robot-outline"
    variant="tonal"
    size="small"
    aria-label="View agent trace"
    @click="$emit('click')"
  />
</template>

<script setup lang="ts">
import type { AgentTraceMessage } from "@/__generated__/vue-apollo";

interface Props {
  agentTrace: AgentTraceMessage[];
  loading: boolean;
}

interface Emits {
  (e: "click"): void;
}

defineProps<Props>();
defineEmits<Emits>();
</script>
