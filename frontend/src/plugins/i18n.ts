import { createI18n } from "vue-i18n";
import { en as vuetifyEn, de as vuetifyDe } from "vuetify/locale";
import en from "@/locales/en.json";
import de from "@/locales/de.json";

export const i18n = createI18n({
  legacy: false, // Vuetify does not support the legacy mode of vue-i18n
  locale: "en",
  fallbackLocale: "en",
  messages: {
    en: { ...en, $vuetify: vuetifyEn },
    de: { ...de, $vuetify: vuetifyDe },
  },
});
