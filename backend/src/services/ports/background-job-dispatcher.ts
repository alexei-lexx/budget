export interface TelegramMessageJob {
  type: "telegram-message";
  payload: {
    userId: string;
    chatId: number;
    text: string | null;
  };
}

// Union type for future extensibility
export type BackgroundJob = TelegramMessageJob;

export interface BackgroundJobDispatcher {
  dispatch(job: BackgroundJob): Promise<void>;
}
