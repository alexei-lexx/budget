import { computed, watch } from "vue";
import { useGetUserSettingsQuery } from "@/__generated__/vue-apollo";
import { i18n } from "@/plugins/i18n";
import { useAuth } from "./useAuth";

const DEFAULT_INTERFACE_LANGUAGE = "en";

// Codegen types interfaceLanguage as plain string since the schema declares it as String!,
// not an enum. Narrow it against the actual configured catalog locales instead of trusting it.
function isSupportedLocale(value: string): value is typeof i18n.global.locale.value {
  return i18n.global.availableLocales.some((locale) => locale === value);
}

/**
 * Owns the active I18n locale.
 * Applies the authenticated user's saved interface language before authenticated
 * content renders, defaulting to English while unauthenticated or unavailable.
 * Updates immediately after a Settings save because the same query observes the
 * Apollo cache write performed by the update mutation.
 */
export function useLocale() {
  const { locale } = i18n.global;
  const { isAuthenticated } = useAuth();

  const { result, loading } = useGetUserSettingsQuery(() => ({
    enabled: isAuthenticated.value,
  }));

  watch(
    result,
    (data) => {
      const interfaceLanguage = data?.userSettings?.interfaceLanguage;
      locale.value =
        interfaceLanguage && isSupportedLocale(interfaceLanguage)
          ? interfaceLanguage
          : DEFAULT_INTERFACE_LANGUAGE;
    },
    { immediate: true },
  );

  const isLocaleReady = computed(() => !isAuthenticated.value || !loading.value);

  return { isLocaleReady };
}
