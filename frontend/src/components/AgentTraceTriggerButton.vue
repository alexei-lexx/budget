<template>
  <v-btn
    :disabled="agentTrace.length === 0 || loading"
    icon="mdi-bug-outline"
    variant="tonal"
    :aria-label="t('assistant.agentTrace.viewAriaLabel')"
    @click="$emit('click')"
  />
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
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

const { t } = useI18n();
</script>
