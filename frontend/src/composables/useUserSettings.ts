import { computed } from "vue";
import {
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
  type UpdateUserSettingsInput,
} from "@/__generated__/vue-apollo";

export function useUserSettings() {
  const {
    result: settingsResult,
    loading: settingsLoading,
    error: settingsError,
  } = useGetUserSettingsQuery();

  const {
    mutate: updateSettingsMutation,
    loading: updateSettingsLoading,
    error: updateSettingsError,
  } = useUpdateUserSettingsMutation();

  const settings = computed(() => settingsResult.value?.userSettings ?? null);

  const updateSettings = async (input: UpdateUserSettingsInput): Promise<boolean> => {
    try {
      const result = await updateSettingsMutation({ input });
      return !!result?.data?.updateUserSettings;
    } catch {
      return false;
    }
  };

  return {
    settings,
    settingsLoading,
    settingsError,
    updateSettings,
    updateSettingsLoading,
    updateSettingsError,
  };
}
