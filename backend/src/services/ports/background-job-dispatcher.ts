export interface BackgroundJob {
  type: string;
  payload: Record<string, unknown>;
}

export interface BackgroundJobDispatcher {
  dispatch(job: BackgroundJob): Promise<void>;
}
