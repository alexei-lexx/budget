export interface TelegramMessageJob {
  type: "telegram-message";
  payload: {
    botId: string;
    chatId: number;
    text: string | null;
    userId: string;
  };
}

// Union type for future extensibility
export type BackgroundJob = TelegramMessageJob;

export interface BackgroundJobDispatcher {
  dispatch(job: BackgroundJob): Promise<void>;
}
