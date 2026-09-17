import { computed, ref, watch } from "vue";
import { getMcpEndpoint } from "@/apollo";
import { i18n } from "@/plugins/i18n";
import { isInternalServerError, resolveErrorMessage } from "@/utils/graphqlError";
import {
  GetUserSettingsDocument,
  useGetSupportedInterfaceLanguagesQuery,
  useGetUserSettingsQuery,
  useRegenerateMcpTokenMutation,
  useUpdateUserSettingsMutation,
  type UpdateUserSettingsInput,
} from "@/__generated__/vue-apollo";

export function useUserSettings() {
  const { t } = i18n.global;
  const settingsError = ref<string | null>(null);

  const {
    result: settingsResult,
    loading: settingsLoading,
    error: settingsQueryError,
  } = useGetUserSettingsQuery();

  const { result: supportedInterfaceLanguagesResult } = useGetSupportedInterfaceLanguagesQuery();

  const supportedInterfaceLanguages = computed(
    () => supportedInterfaceLanguagesResult.value?.supportedInterfaceLanguages ?? [],
  );

  // Watch for query errors
  watch(settingsQueryError, (error) => {
    if (error) {
      console.error("Settings query failed:", error);

      settingsError.value = isInternalServerError(error)
        ? t("settings.fetchFailed")
        : error.message;
    }
  });

  const { mutate: updateSettingsMutation, loading: updateSettingsLoading } =
    useUpdateUserSettingsMutation({
      update(cache, { data }) {
        if (!data?.updateUserSettings) return;
        cache.writeQuery({
          query: GetUserSettingsDocument,
          data: { userSettings: data.updateUserSettings },
        });
      },
    });

  const settings = computed(() => settingsResult.value?.userSettings ?? null);

  const mcpUrl = computed(() => {
    if (!settings.value) return null;
    const url = new URL(getMcpEndpoint(), window.location.origin);
    url.searchParams.set("token", settings.value.mcpToken);
    return url.toString();
  });

  const updateSettings = async (input: UpdateUserSettingsInput): Promise<boolean> => {
    try {
      settingsError.value = null;

      const result = await updateSettingsMutation({ input });
      return !!result?.data?.updateUserSettings;
    } catch (error) {
      console.error("Error updating settings:", error);

      settingsError.value = resolveErrorMessage(error, t("settings.saveFailed"));

      return false;
    }
  };

  const { mutate: regenerateMcpTokenMutation, loading: regenerateMcpTokenLoading } =
    useRegenerateMcpTokenMutation({
      update(cache, { data }) {
        if (!data?.regenerateMcpToken) return;
        cache.writeQuery({
          query: GetUserSettingsDocument,
          data: { userSettings: data.regenerateMcpToken },
        });
      },
    });

  const regenerateMcpToken = async (): Promise<boolean> => {
    try {
      settingsError.value = null;

      const result = await regenerateMcpTokenMutation();
      return !!result?.data?.regenerateMcpToken;
    } catch (error) {
      console.error("Error regenerating MCP token:", error);

      settingsError.value = resolveErrorMessage(
        error,
        t("settings.mcpConnection.tokenRegenerateFailed"),
      );

      return false;
    }
  };

  return {
    // Data
    mcpUrl,
    settings,
    supportedInterfaceLanguages,

    // Loading states
    settingsLoading,
    updateSettingsLoading,
    regenerateMcpTokenLoading,

    // Error state
    settingsError,

    // Functions
    updateSettings,
    regenerateMcpToken,
  };
}
