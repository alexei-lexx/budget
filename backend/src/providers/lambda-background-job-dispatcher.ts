import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import {
  BackgroundJob,
  BackgroundJobDispatcher,
} from "../services/ports/background-job-dispatcher";

export class LambdaBackgroundJobDispatcher implements BackgroundJobDispatcher {
  private client: LambdaClient;

  constructor(
    private readonly backgroundJobFunctionName?: string,
    lambdaClient?: LambdaClient,
  ) {
    this.backgroundJobFunctionName =
      this.backgroundJobFunctionName ??
      (process.env.BACKGROUND_JOB_FUNCTION_NAME || undefined);

    if (!this.backgroundJobFunctionName) {
      throw new Error(
        "BACKGROUND_JOB_FUNCTION_NAME environment variable is required",
      );
    }

    this.client = lambdaClient ?? new LambdaClient({});
  }

  async dispatch(job: BackgroundJob): Promise<void> {
    const command = new InvokeCommand({
      FunctionName: this.backgroundJobFunctionName,
      InvocationType: "Event", // fire-and-forget async invocation
      Payload: Buffer.from(JSON.stringify(job)),
    });

    await this.client.send(command);
  }
}
