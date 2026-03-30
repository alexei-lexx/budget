<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="pa-3 pa-sm-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-h5 text-sm-h4">Settings</h1>
    </div>

    <v-form @submit.prevent="handleSave">
      <v-row>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="transactionPatternsLimit"
            type="number"
            label="Transaction shortcuts limit"
            variant="outlined"
            hint="e.g. Card + Groceries, Cash + Transport"
            persistent-hint
            step="1"
            :min="MIN_PATTERNS_LIMIT"
            :max="MAX_PATTERNS_LIMIT"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-select
            v-model="voiceInputLanguage"
            :items="languageOptions"
            label="Voice input language"
            variant="outlined"
          />
        </v-col>
      </v-row>

      <v-btn type="submit" color="primary" class="mt-4" :loading="updateSettingsLoading">
        Save
      </v-btn>
    </v-form>

    <v-divider class="my-6" />

    <!-- Telegram Bot Section -->
    <div class="mb-4">
      <h2 class="text-h6">Telegram Bot</h2>
    </div>

    <div v-if="telegramBotLoading" class="d-flex align-center">
      <v-progress-circular indeterminate />
    </div>

    <template v-else-if="telegramBot">
      <!-- Connected state -->
      <v-row>
        <v-col cols="12" sm="6">
          <v-text-field
            :model-value="telegramBot.maskedToken"
            label="Bot token"
            variant="outlined"
            readonly
            hide-details
            disabled
          />
        </v-col>
        <v-col cols="12" sm="6" class="d-flex align-center">
          <v-btn color="primary" :loading="testTelegramBotLoading" @click="handleTestTelegramBot">
            Test
          </v-btn>
          <v-btn
            color="error"
            variant="outlined"
            class="ml-2"
            :loading="disconnectTelegramBotLoading"
            @click="handleDisconnectTelegramBot"
          >
            Disconnect
          </v-btn>
        </v-col>
      </v-row>
    </template>

    <template v-else>
      <!-- Not connected state -->
      <v-row>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="tokenInput"
            autocomplete="off"
            hide-details
            label="Bot token"
            placeholder="1234567890..."
            type="password"
            variant="outlined"
            :disabled="connectTelegramBotLoading"
          />
        </v-col>
        <v-col cols="12" sm="6" class="d-flex align-center">
          <v-btn
            color="primary"
            :loading="connectTelegramBotLoading"
            :disabled="!tokenInput.trim()"
            @click="handleConnectTelegramBot"
          >
            Connect
          </v-btn>
        </v-col>
      </v-row>
    </template>
  </v-container>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useSnackbar } from "@/composables/useSnackbar";
import { useTelegramBot } from "@/composables/useTelegramBot";
import { useUserSettings } from "@/composables/useUserSettings";

const MIN_PATTERNS_LIMIT = 1;
const MAX_PATTERNS_LIMIT = 10;

const LANGUAGE_CODES = [
  "ar-SA",
  "da-DK",
  "de-DE",
  "en-AU",
  "en-GB",
  "en-US",
  "es-ES",
  "fi-FI",
  "fr-FR",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "nb-NO",
  "nl-NL",
  "pl-PL",
  "pt-BR",
  "ru-RU",
  "sv-SE",
  "uk-UA",
  "zh-CN",
];

const displayNames = new Intl.DisplayNames([navigator.language], { type: "language" });

const languageOptions = LANGUAGE_CODES.map((code) => ({
  title: displayNames.of(code) ?? code,
  value: code,
})).sort((languageA, languageB) => languageA.title.localeCompare(languageB.title));

// Default to the browser language if it matches a supported code, otherwise fall back to en-US
const browserLang = navigator.language;
const browserLangPrefix = browserLang.split("-")[0] ?? browserLang;
const defaultLanguage =
  LANGUAGE_CODES.find((code) => code.toLowerCase() === browserLang.toLowerCase()) ??
  LANGUAGE_CODES.find((code) => code.toLowerCase().startsWith(browserLangPrefix.toLowerCase())) ??
  "en-US";

const { settings, updateSettings, updateSettingsLoading, updateSettingsError } = useUserSettings();
const {
  telegramBot,
  telegramBotLoading,
  connectTelegramBot,
  connectTelegramBotLoading,
  connectTelegramBotError,
  disconnectTelegramBot,
  disconnectTelegramBotLoading,
  disconnectTelegramBotError,
  testTelegramBot,
  testTelegramBotLoading,
  testTelegramBotError,
} = useTelegramBot();
const { showSuccessSnackbar, showErrorSnackbar } = useSnackbar();

const transactionPatternsLimit = ref<string>("");
const tokenInput = ref<string>("");
const voiceInputLanguage = ref<string>(defaultLanguage);

watch(
  settings,
  (loadedSettings) => {
    if (!loadedSettings) return;

    if (loadedSettings.voiceInputLanguage) {
      voiceInputLanguage.value = loadedSettings.voiceInputLanguage;
    }

    transactionPatternsLimit.value = String(loadedSettings.transactionPatternsLimit);
  },
  { immediate: true },
);

const handleSave = async () => {
  const transactionPatternsLimitRaw = transactionPatternsLimit.value.trim();

  const success = await updateSettings({
    voiceInputLanguage: voiceInputLanguage.value,
    transactionPatternsLimit: transactionPatternsLimitRaw
      ? parseInt(transactionPatternsLimitRaw, 10)
      : undefined,
  });

  if (success) {
    showSuccessSnackbar("Settings saved");
  } else {
    showErrorSnackbar(updateSettingsError.value?.message ?? "Failed to save settings");
  }
};

const handleConnectTelegramBot = async () => {
  const success = await connectTelegramBot(tokenInput.value.trim());
  if (success) {
    tokenInput.value = "";
    showSuccessSnackbar("Telegram bot connected");
  } else {
    showErrorSnackbar(connectTelegramBotError.value?.message ?? "Failed to connect Telegram bot");
  }
};

const handleDisconnectTelegramBot = async () => {
  const success = await disconnectTelegramBot();
  if (success) {
    showSuccessSnackbar("Telegram bot disconnected");
  } else {
    showErrorSnackbar(
      disconnectTelegramBotError.value?.message ?? "Failed to disconnect Telegram bot",
    );
  }
};

const handleTestTelegramBot = async () => {
  const success = await testTelegramBot();
  if (success) {
    showSuccessSnackbar("Telegram bot is active");
  } else {
    showErrorSnackbar(testTelegramBotError.value?.message ?? "Telegram bot test failed");
  }
};
</script>
