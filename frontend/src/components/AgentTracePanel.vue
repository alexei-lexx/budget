<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="$vuetify.display.xs"
    :max-width="$vuetify.display.xs ? undefined : '800'"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
    @keydown.esc="$emit('update:modelValue', false)"
  >
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <span>Agent Trace</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <v-expansion-panels variant="accordion" flat>
          <v-expansion-panel v-for="(message, index) in agentMessages" :key="index">
            <v-expansion-panel-title>
              <v-chip size="small" :color="chipColor(message)" variant="tonal" label class="me-3">
                {{ chipLabel(message) }}
              </v-chip>
              <span class="text-body-2 text-truncate">{{ messageSummary(message) }}</span>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <pre
                class="text-body-2 pa-2 overflow-auto"
                style="max-height: 400px; white-space: pre-wrap; word-break: break-word"
                >{{ messageContent(message) }}</pre
              >
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

        <div v-if="agentMessages.length === 0" class="pa-6 text-center text-medium-emphasis">
          No trace messages available.
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { AgentTraceMessage } from "@/__generated__/vue-apollo";

interface Props {
  modelValue: boolean;
  agentMessages: AgentTraceMessage[];
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
}

defineProps<Props>();
defineEmits<Emits>();

function chipLabel(message: AgentTraceMessage): string {
  if (message.__typename === "AgentTraceText") return "TEXT";
  if (message.__typename === "AgentTraceToolCall") return "TOOL CALL";
  if (message.__typename === "AgentTraceToolResult") return "TOOL RESULT";
  return "UNKNOWN";
}

function chipColor(message: AgentTraceMessage): string {
  if (message.__typename === "AgentTraceText") return "primary";
  if (message.__typename === "AgentTraceToolCall") return "secondary";
  if (message.__typename === "AgentTraceToolResult") return "success";
  return "default";
}

function messageSummary(message: AgentTraceMessage): string {
  if (message.__typename === "AgentTraceText") {
    const text = message.content.replace(/\n/g, " ");
    return text.length > 80 ? text.slice(0, 80) + "…" : text;
  }
  if (message.__typename === "AgentTraceToolCall") {
    return message.toolName;
  }
  if (message.__typename === "AgentTraceToolResult") {
    return message.toolName;
  }
  return "";
}

function messageContent(message: AgentTraceMessage): string {
  if (message.__typename === "AgentTraceText") return message.content;
  if (message.__typename === "AgentTraceToolCall") return message.input;
  if (message.__typename === "AgentTraceToolResult") return message.output;
  return "";
}
</script>
