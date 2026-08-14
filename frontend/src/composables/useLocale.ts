import { computed, watch } from "vue";
import { useGetUserSettingsQuery } from "@/__generated__/vue-apollo";
import { i18n } from "@/plugins/i18n";
import { useAuth } from "./useAuth";

const DEFAULT_INTERFACE_LANGUAGE = "en";

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
      // Backend validates interfaceLanguage against the supported list, so the value
      // always matches a configured catalog locale even though codegen types it as string.
      locale.value = (data?.userSettings?.interfaceLanguage ??
        DEFAULT_INTERFACE_LANGUAGE) as typeof locale.value;
    },
    { immediate: true },
  );

  const isLocaleReady = computed(() => !isAuthenticated.value || !loading.value);

  return { isLocaleReady };
}
