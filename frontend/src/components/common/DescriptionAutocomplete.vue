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
const textFieldRef = ref();
const isFocused = ref(false);
const justSelected = ref(false);

// Use description suggestions composable
const { suggestions, showSuggestions, suggestionsLoading } = useDescriptionSuggestions({
  searchText,
});

// Single source of truth for dropdown visibility
const dropdownOpen = computed(() => {
  // Must be focused - user is interacting with input
  if (!isFocused.value) return false;

  // Don't reopen if user just made a selection
  if (justSelected.value) return false;

  // Show if composable says we have suggestions to display
  return showSuggestions.value;
});

// Computed value for v-model
const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => {
    searchText.value = value;
    emit("update:modelValue", value);
  },
});

// Reset keyboard selection when dropdown opens
watch(dropdownOpen, (isOpen) => {
  if (isOpen) {
    selectedIndex.value = -1;
  }
});

// Watch for model value changes from parent
watch(
  () => props.modelValue,
  (newValue) => {
    searchText.value = newValue;
  },
);

// Handle user input - clear justSelected when user types
const handleInput = () => {
  // User is typing new content - clear the just-selected flag
  // This allows suggestions to appear normally as they type
  // Note: @input only fires on user keyboard input, not programmatic changes
  if (justSelected.value) {
    justSelected.value = false;
  }
};

// Handle suggestion selection
const selectSuggestion = (suggestion: string) => {
  justSelected.value = true;
  inputValue.value = suggestion;
  selectedIndex.value = -1;
  // Dropdown closes automatically via computed property
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
      selectedIndex.value = -1;
      textFieldRef.value?.blur(); // Remove focus, dropdown closes via computed
      break;
    case "Tab":
      // Allow default behavior, dropdown will close via blur
      selectedIndex.value = -1;
      break;
  }
};

// Handle input focus
const handleFocus = () => {
  isFocused.value = true;
  // Don't clear justSelected here - let it persist until user types
  // This prevents dropdown from opening with stale query results
  // when refocusing after a selection
};

// Handle input blur (delayed to allow for clicks)
const handleBlur = () => {
  // Delay to allow suggestion click events to register before closing
  setTimeout(() => {
    isFocused.value = false;
    selectedIndex.value = -1;
    // Dropdown closes automatically via computed property
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
      @input="handleInput"
      @keydown="handleKeyDown"
      @focus="handleFocus"
      @blur="handleBlur"
    />

    <v-menu
      :model-value="dropdownOpen"
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
