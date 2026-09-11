import { DateTimeString } from "../types/date-time-string";

export enum TelegramBotStatus {
  /** Webhook registration in progress; not yet usable */
  PENDING = "PENDING",
  /** Webhook registered and active; receives inbound messages */
  CONNECTED = "CONNECTED",
  /** Disconnect requested; webhook being removed */
  DELETING = "DELETING",
}

export interface TelegramBot {
  id: string;
  userId: string;
  token: string;
  webhookSecret: string;
  status: TelegramBotStatus;
  isArchived: boolean;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}
