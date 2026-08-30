import { computed } from "vue";
import { getMcpEndpoint } from "@/apollo";
import {
  GetUserSettingsDocument,
  useGetSupportedInterfaceLanguagesQuery,
  useGetUserSettingsQuery,
  useRegenerateMcpTokenMutation,
  useUpdateUserSettingsMutation,
  type UpdateUserSettingsInput,
} from "@/__generated__/vue-apollo";

export function useUserSettings() {
  const {
    result: settingsResult,
    loading: settingsLoading,
    error: settingsError,
  } = useGetUserSettingsQuery();

  const { result: supportedInterfaceLanguagesResult } = useGetSupportedInterfaceLanguagesQuery();

  const supportedInterfaceLanguages = computed(
    () => supportedInterfaceLanguagesResult.value?.supportedInterfaceLanguages ?? [],
  );

  const {
    mutate: updateSettingsMutation,
    loading: updateSettingsLoading,
    error: updateSettingsError,
  } = useUpdateUserSettingsMutation({
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
      const result = await updateSettingsMutation({ input });
      return !!result?.data?.updateUserSettings;
    } catch {
      return false;
    }
  };

  const {
    mutate: regenerateMcpTokenMutation,
    loading: regenerateMcpTokenLoading,
    error: regenerateMcpTokenError,
  } = useRegenerateMcpTokenMutation({
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
      const result = await regenerateMcpTokenMutation();
      return !!result?.data?.regenerateMcpToken;
    } catch {
      return false;
    }
  };

  return {
    mcpUrl,
    settings,
    settingsLoading,
    settingsError,
    supportedInterfaceLanguages,
    updateSettings,
    updateSettingsLoading,
    updateSettingsError,
    regenerateMcpToken,
    regenerateMcpTokenLoading,
    regenerateMcpTokenError,
  };
}
