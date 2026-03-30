import { computed } from "vue";
import {
  GetTelegramBotDocument,
  useConnectTelegramBotMutation,
  useDisconnectTelegramBotMutation,
  useGetTelegramBotQuery,
  useTestTelegramBotMutation,
} from "@/__generated__/vue-apollo";

export function useTelegramBot() {
  const {
    result: telegramBotResult,
    loading: telegramBotLoading,
    error: telegramBotError,
  } = useGetTelegramBotQuery();

  const {
    mutate: connectTelegramBotMutation,
    loading: connectTelegramBotLoading,
    error: connectTelegramBotError,
  } = useConnectTelegramBotMutation({
    update(cache, { data }) {
      if (!data?.connectTelegramBot) return;
      cache.writeQuery({
        query: GetTelegramBotDocument,
        data: { telegramBot: data.connectTelegramBot },
      });
    },
  });

  const {
    mutate: disconnectTelegramBotMutation,
    loading: disconnectTelegramBotLoading,
    error: disconnectTelegramBotError,
  } = useDisconnectTelegramBotMutation({
    update(cache) {
      cache.writeQuery({
        query: GetTelegramBotDocument,
        data: { telegramBot: null },
      });
    },
  });

  const {
    mutate: testTelegramBotMutation,
    loading: testTelegramBotLoading,
    error: testTelegramBotError,
  } = useTestTelegramBotMutation();

  const telegramBot = computed(() => telegramBotResult.value?.telegramBot ?? null);

  const connectTelegramBot = async (token: string): Promise<boolean> => {
    try {
      const result = await connectTelegramBotMutation({ token });
      return !!result?.data?.connectTelegramBot;
    } catch {
      return false;
    }
  };

  const disconnectTelegramBot = async (): Promise<boolean> => {
    try {
      const result = await disconnectTelegramBotMutation();
      return result?.data?.disconnectTelegramBot === true;
    } catch {
      return false;
    }
  };

  const testTelegramBot = async (): Promise<boolean> => {
    try {
      const result = await testTelegramBotMutation();
      return result?.data?.testTelegramBot === true;
    } catch {
      return false;
    }
  };

  return {
    connectTelegramBot,
    connectTelegramBotError,
    connectTelegramBotLoading,
    disconnectTelegramBot,
    disconnectTelegramBotError,
    disconnectTelegramBotLoading,
    telegramBot,
    telegramBotError,
    telegramBotLoading,
    testTelegramBot,
    testTelegramBotError,
    testTelegramBotLoading,
  };
}
