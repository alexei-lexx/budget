<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <v-container class="pa-3 pa-sm-6">
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-h5 text-sm-h4">{{ t("settings.title") }}</h1>
    </div>

    <v-form @submit.prevent="handleSave">
      <v-row>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="transactionPatternsLimit"
            type="number"
            :label="t('settings.transactionShortcutsLimit.label')"
            variant="outlined"
            :hint="t('settings.transactionShortcutsLimit.hint')"
            persistent-hint
            step="1"
            :min="MIN_PATTERNS_LIMIT"
            :max="MAX_PATTERNS_LIMIT"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-select
            v-model="voiceInputLanguage"
            :items="voiceInputLanguageOptions"
            :label="t('settings.voiceInputLanguage')"
            variant="outlined"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-select
            v-model="interfaceLanguage"
            :items="interfaceLanguageOptions"
            :label="t('settings.interfaceLanguage')"
            variant="outlined"
          />
        </v-col>
      </v-row>

      <v-btn type="submit" color="primary" class="mt-4" :loading="updateSettingsLoading">
        {{ t("common.buttons.save") }}
      </v-btn>
    </v-form>

    <v-divider class="my-6" />

    <!-- Telegram Bot Section -->
    <div class="mb-4">
      <h2 class="text-h6">{{ t("settings.telegramBot.heading") }}</h2>
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
            :label="t('settings.telegramBot.botToken')"
            variant="outlined"
            readonly
            hide-details
            disabled
          />
        </v-col>
        <v-col cols="12" sm="6" class="d-flex align-center">
          <v-btn color="primary" :loading="testTelegramBotLoading" @click="handleTestTelegramBot">
            {{ t("common.buttons.test") }}
          </v-btn>
          <v-btn
            color="error"
            variant="outlined"
            class="ml-2"
            :loading="disconnectTelegramBotLoading"
            @click="handleDisconnectTelegramBot"
          >
            {{ t("common.buttons.disconnect") }}
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
            :label="t('settings.telegramBot.botToken')"
            :placeholder="t('settings.telegramBot.tokenPlaceholder')"
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
            {{ t("common.buttons.connect") }}
          </v-btn>
        </v-col>
      </v-row>
    </template>

    <v-divider class="my-6" />

    <!-- MCP Connection Section -->
    <div class="mb-4">
      <h2 class="text-h6">{{ t("settings.mcpConnection.heading") }}</h2>
    </div>

    <v-row>
      <v-col cols="12" sm="6">
        <v-text-field
          :model-value="settings?.mcpUrl"
          :label="t('settings.mcpConnection.url')"
          variant="outlined"
          readonly
          hide-details
        />
      </v-col>
      <v-col cols="12" sm="6" class="d-flex align-center">
        <v-btn color="primary" :disabled="!settings?.mcpUrl" @click="handleCopyMcpUrl">
          {{ t("common.buttons.copy") }}
        </v-btn>
        <v-btn
          color="error"
          variant="outlined"
          class="ml-2"
          :loading="regenerateMcpTokenLoading"
          @click="handleRegenerateMcpToken"
        >
          {{ t("settings.mcpConnection.regenerate") }}
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
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

// Default to the browser language if it matches a supported code, otherwise fall back to en-US
const browserLang = navigator.language;
const browserLangPrefix = browserLang.split("-")[0] ?? browserLang;
const defaultLanguage =
  LANGUAGE_CODES.find((code) => code.toLowerCase() === browserLang.toLowerCase()) ??
  LANGUAGE_CODES.find((code) => code.toLowerCase().startsWith(browserLangPrefix.toLowerCase())) ??
  "en-US";

const { t, locale } = useI18n();

const {
  settings,
  supportedInterfaceLanguages,
  updateSettings,
  updateSettingsLoading,
  updateSettingsError,
  regenerateMcpToken,
  regenerateMcpTokenLoading,
  regenerateMcpTokenError,
} = useUserSettings();
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
const interfaceLanguage = ref<string>("en");

// Voice-input option labels are localized in the active interface language,
// independent of the speech-recognition language codes themselves.
const voiceInputLanguageOptions = computed(() => {
  const displayNames = new Intl.DisplayNames([locale.value], { type: "language" });
  return LANGUAGE_CODES.map((code) => ({
    title: displayNames.of(code) ?? code,
    value: code,
  })).sort((languageA, languageB) => languageA.title.localeCompare(languageB.title));
});

const interfaceLanguageOptions = computed(() => {
  const displayNames = new Intl.DisplayNames([locale.value], { type: "language" });
  return supportedInterfaceLanguages.value.map((code) => ({
    title: displayNames.of(code) ?? code,
    value: code,
  }));
});

watch(
  settings,
  (loadedSettings) => {
    if (!loadedSettings) return;

    if (loadedSettings.voiceInputLanguage) {
      voiceInputLanguage.value = loadedSettings.voiceInputLanguage;
    }

    interfaceLanguage.value = loadedSettings.interfaceLanguage;
    transactionPatternsLimit.value = String(loadedSettings.transactionPatternsLimit);
  },
  { immediate: true },
);

const handleSave = async () => {
  const transactionPatternsLimitRaw = transactionPatternsLimit.value.trim();

  const success = await updateSettings({
    voiceInputLanguage: voiceInputLanguage.value,
    interfaceLanguage: interfaceLanguage.value,
    transactionPatternsLimit: transactionPatternsLimitRaw
      ? parseInt(transactionPatternsLimitRaw, 10)
      : undefined,
  });

  if (success) {
    showSuccessSnackbar(t("settings.saved"));
  } else {
    showErrorSnackbar(updateSettingsError.value?.message ?? t("settings.saveFailed"));
  }
};

const handleConnectTelegramBot = async () => {
  const success = await connectTelegramBot(tokenInput.value.trim());
  if (success) {
    tokenInput.value = "";
    showSuccessSnackbar(t("settings.telegramBot.connected"));
  } else {
    showErrorSnackbar(
      connectTelegramBotError.value?.message ?? t("settings.telegramBot.connectFailed"),
    );
  }
};

const handleDisconnectTelegramBot = async () => {
  const success = await disconnectTelegramBot();
  if (success) {
    showSuccessSnackbar(t("settings.telegramBot.disconnected"));
  } else {
    showErrorSnackbar(
      disconnectTelegramBotError.value?.message ?? t("settings.telegramBot.disconnectFailed"),
    );
  }
};

const handleTestTelegramBot = async () => {
  const success = await testTelegramBot();
  if (success) {
    showSuccessSnackbar(t("settings.telegramBot.active"));
  } else {
    showErrorSnackbar(testTelegramBotError.value?.message ?? t("settings.telegramBot.testFailed"));
  }
};

const handleCopyMcpUrl = async () => {
  if (!settings.value?.mcpUrl) return;
  try {
    await navigator.clipboard.writeText(settings.value.mcpUrl);
    showSuccessSnackbar(t("settings.mcpConnection.urlCopied"));
  } catch {
    showErrorSnackbar(t("settings.mcpConnection.urlCopyFailed"));
  }
};

const handleRegenerateMcpToken = async () => {
  const success = await regenerateMcpToken();
  if (success) {
    showSuccessSnackbar(t("settings.mcpConnection.tokenRegenerated"));
  } else {
    showErrorSnackbar(
      regenerateMcpTokenError.value?.message ?? t("settings.mcpConnection.tokenRegenerateFailed"),
    );
  }
};
</script>
