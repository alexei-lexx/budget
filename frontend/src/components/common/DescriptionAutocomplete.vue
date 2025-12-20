<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useDescriptionSuggestions } from "@/composables/useDescriptionSuggestions";

interface Props {
  modelValue: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  variant?:
    | "outlined"
    | "filled"
    | "underlined"
    | "plain"
    | "solo"
    | "solo-inverted"
    | "solo-filled";
}

const props = withDefaults(defineProps<Props>(), {
  label: "Description",
  placeholder: "",
  disabled: false,
  variant: "outlined",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

// Local reactive values
const searchText = ref(props.modelValue);
const selectedIndex = ref(-1);
const dropdownOpen = ref(false);
const textFieldRef = ref();
const justSelected = ref(false);

// Use description suggestions composable
const { suggestions, showSuggestions, suggestionsLoading } = useDescriptionSuggestions({
  searchText,
});

// Computed value for v-model
const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => {
    searchText.value = value;
    emit("update:modelValue", value);
  },
});

// Watch for suggestions to manage dropdown visibility
watch(showSuggestions, (show) => {
  // If we just selected a suggestion, don't re-open the dropdown
  if (justSelected.value && show) {
    justSelected.value = false; // Reset flag
    return; // Don't open dropdown
  }

  dropdownOpen.value = show;
  if (show) {
    selectedIndex.value = -1; // Reset selection when dropdown opens
  }
});

// Watch for model value changes from parent
watch(
  () => props.modelValue,
  (newValue) => {
    searchText.value = newValue;
  },
);

// Handle suggestion selection
const selectSuggestion = (suggestion: string) => {
  justSelected.value = true; // Set flag before updating value
  inputValue.value = suggestion;
  dropdownOpen.value = false;
  selectedIndex.value = -1;
};

// Handle keyboard navigation
const handleKeyDown = (event: KeyboardEvent) => {
  if (!dropdownOpen.value || suggestions.value.length === 0) {
    return;
  }

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      selectedIndex.value = Math.min(selectedIndex.value + 1, suggestions.value.length - 1);
      break;
    case "ArrowUp":
      event.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, -1);
      break;
    case "Enter":
      event.preventDefault();
      if (selectedIndex.value >= 0 && selectedIndex.value < suggestions.value.length) {
        const selected = suggestions.value[selectedIndex.value];
        if (selected) {
          selectSuggestion(selected);
        }
      }
      break;
    case "Escape":
      event.preventDefault();
      dropdownOpen.value = false;
      selectedIndex.value = -1;
      break;
    case "Tab":
      // Allow default behavior, just close dropdown
      dropdownOpen.value = false;
      selectedIndex.value = -1;
      break;
  }
};

// Handle input focus
const handleFocus = () => {
  // If there are suggestions, show them when focused
  if (suggestions.value.length > 0) {
    dropdownOpen.value = true;
  }
};

// Handle input blur (delayed to allow for clicks)
const handleBlur = () => {
  // Delay hiding dropdown to allow for suggestion clicks
  setTimeout(() => {
    dropdownOpen.value = false;
    selectedIndex.value = -1;
  }, 150);
};
</script>

<template>
  <div class="description-autocomplete">
    <v-text-field
      ref="textFieldRef"
      v-model="inputValue"
      :label="label"
      :placeholder="placeholder"
      :disabled="disabled"
      :variant="variant"
      autocapitalize="off"
      @keydown="handleKeyDown"
      @focus="handleFocus"
      @blur="handleBlur"
    />

    <v-menu
      v-model="dropdownOpen"
      :activator="textFieldRef"
      location="bottom start"
      :close-on-content-click="false"
      :close-on-back="false"
      no-click-animation
    >
      <v-card
        v-if="dropdownOpen && (suggestions.length > 0 || suggestionsLoading)"
        class="description-suggestions"
        elevation="8"
        max-width="400"
      >
        <!-- Loading state -->
        <div v-if="suggestionsLoading" class="pa-3 text-center">
          <v-progress-circular indeterminate size="24" />
          <div class="text-caption text-medium-emphasis mt-2">Loading suggestions...</div>
        </div>

        <!-- Suggestions list -->
        <v-list v-else-if="suggestions.length > 0" density="compact">
          <v-list-item
            v-for="(suggestion, index) in suggestions"
            :key="suggestion"
            :class="{ 'bg-surface-variant': index === selectedIndex }"
            @click="selectSuggestion(suggestion)"
            @mouseenter="selectedIndex = index"
          >
            <v-list-item-title>{{ suggestion }}</v-list-item-title>
          </v-list-item>
        </v-list>

        <!-- Empty state -->
        <div v-else class="pa-3 text-center">
          <div class="text-caption text-medium-emphasis">No suggestions found</div>
        </div>
      </v-card>
    </v-menu>
  </div>
</template>

<style scoped>
.description-autocomplete {
  position: relative;
}

.description-suggestions {
  min-width: 200px;
  max-height: 200px;
  overflow-y: auto;
}

.v-list-item {
  cursor: pointer;
}

.v-list-item:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.08);
}
</style>
