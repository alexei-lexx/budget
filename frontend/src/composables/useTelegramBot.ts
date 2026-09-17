import { computed, ref, watch } from "vue";
import { i18n } from "@/plugins/i18n";
import { isInternalServerError, resolveErrorMessage } from "@/utils/graphqlError";
import {
  GetTelegramBotDocument,
  useConnectTelegramBotMutation,
  useDisconnectTelegramBotMutation,
  useGetTelegramBotQuery,
  useTestTelegramBotLazyQuery,
} from "@/__generated__/vue-apollo";

export function useTelegramBot() {
  const { t } = i18n.global;
  const telegramBotError = ref<string | null>(null);

  const {
    result: telegramBotResult,
    loading: telegramBotLoading,
    error: telegramBotQueryError,
  } = useGetTelegramBotQuery();

  const telegramBot = computed(() => telegramBotResult.value?.telegramBot ?? null);

  // Watch for query errors
  watch(telegramBotQueryError, (error) => {
    if (error) {
      console.error("Telegram bot query failed:", error);

      telegramBotError.value = isInternalServerError(error)
        ? t("settings.telegramBot.fetchFailed")
        : error.message;
    }
  });

  const { mutate: connectTelegramBotMutation, loading: connectTelegramBotLoading } =
    useConnectTelegramBotMutation({
      update(cache, { data }) {
        if (!data?.connectTelegramBot) return;
        cache.writeQuery({
          query: GetTelegramBotDocument,
          data: { telegramBot: data.connectTelegramBot },
        });
      },
    });

  const connectTelegramBot = async (token: string): Promise<boolean> => {
    try {
      telegramBotError.value = null;

      const result = await connectTelegramBotMutation({ token });
      return !!result?.data?.connectTelegramBot;
    } catch (error) {
      console.error("Error connecting Telegram bot:", error);

      telegramBotError.value = resolveErrorMessage(error, t("settings.telegramBot.connectFailed"));

      return false;
    }
  };

  const { mutate: disconnectTelegramBotMutation, loading: disconnectTelegramBotLoading } =
    useDisconnectTelegramBotMutation({
      update(cache) {
        cache.writeQuery({
          query: GetTelegramBotDocument,
          data: { telegramBot: null },
        });
      },
    });

  const disconnectTelegramBot = async (): Promise<boolean> => {
    try {
      telegramBotError.value = null;

      const result = await disconnectTelegramBotMutation();
      return result?.data?.disconnectTelegramBot === true;
    } catch (error) {
      console.error("Error disconnecting Telegram bot:", error);

      telegramBotError.value = resolveErrorMessage(
        error,
        t("settings.telegramBot.disconnectFailed"),
      );

      return false;
    }
  };

  const {
    load: loadTestTelegramBot,
    refetch: refetchTestTelegramBot,
    loading: testTelegramBotLoading,
    error: testTelegramBotQueryError,
  } = useTestTelegramBotLazyQuery();

  // Watch for test query errors
  watch(testTelegramBotQueryError, (error) => {
    if (error) {
      console.error("Telegram bot test failed:", error);

      telegramBotError.value = isInternalServerError(error)
        ? t("settings.telegramBot.testFailed")
        : error.message;
    }
  });

  const testTelegramBot = async (): Promise<boolean> => {
    try {
      telegramBotError.value = null;

      // loadTestTelegramBot only runs the query once, returning false after.
      // refetchTestTelegramBot reruns it on later calls.
      const loadResult = await loadTestTelegramBot();
      if (loadResult !== false) {
        return loadResult.testTelegramBot === true;
      }

      const refetchResult = await refetchTestTelegramBot();
      return refetchResult?.data?.testTelegramBot === true;
    } catch {
      // Error is handled by the watch on testTelegramBotQueryError above.
      return false;
    }
  };

  return {
    // Data
    telegramBot,

    // Loading states
    telegramBotLoading,
    connectTelegramBotLoading,
    disconnectTelegramBotLoading,
    testTelegramBotLoading,

    // Error state
    telegramBotError,

    // Functions
    connectTelegramBot,
    disconnectTelegramBot,
    testTelegramBot,
  };
}
