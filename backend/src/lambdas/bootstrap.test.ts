import {
  GetParametersCommand,
  GetParametersCommandOutput,
  SSMClient,
} from "@aws-sdk/client-ssm";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { injectRuntimeEnv } from "./bootstrap";

jest.mock("@aws-sdk/client-ssm", () => {
  const actual = jest.requireActual<typeof import("@aws-sdk/client-ssm")>(
    "@aws-sdk/client-ssm",
  );

  return {
    ...actual,
    SSMClient: jest.fn(),
  };
});

describe("injectRuntimeEnv", () => {
  let sendMock: jest.Mock<
    (command: unknown) => Promise<GetParametersCommandOutput>
  >;

  beforeEach(() => {
    jest.clearAllMocks();

    sendMock =
      jest.fn<(command: unknown) => Promise<GetParametersCommandOutput>>();

    (SSMClient as jest.Mock).mockImplementation(() => ({ send: sendMock }));
  });

  // Happy path

  it("should fetch SSM parameters and inject env vars", async () => {
    // Arrange
    const processEnv: NodeJS.ProcessEnv = {
      AWS_LAMBDA_FUNCTION_NAME: "web-lambda",
      NODE_ENV: "test",
    };

    // SSM returns values for both bound parameters
    sendMock.mockResolvedValue({
      $metadata: {},
      Parameters: [
        {
          Name: "/manual/budget/test/app/chat-history-max-messages",
          Value: "50",
        },
        {
          Name: "/manual/budget/test/app/chat-message-ttl-seconds",
          Value: "3600",
        },
      ],
    });

    // Act
    await injectRuntimeEnv(processEnv);

    // Assert
    expect(processEnv.CHAT_HISTORY_MAX_MESSAGES).toBe("50");
    expect(processEnv.CHAT_MESSAGE_TTL_SECONDS).toBe("3600");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0] as GetParametersCommand;
    expect(command.input.Names).toEqual([
      "/manual/budget/test/app/chat-history-max-messages",
      "/manual/budget/test/app/chat-message-ttl-seconds",
    ]);
  });

  // Validation failures

  it("should skip SSM fetch when not running on Lambda", async () => {
    // Arrange
    const processEnv: NodeJS.ProcessEnv = { NODE_ENV: "test" };

    // Act
    await injectRuntimeEnv(processEnv);

    // Assert
    expect(processEnv.CHAT_HISTORY_MAX_MESSAGES).toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("should skip SSM fetch when NODE_ENV is unset", async () => {
    // Arrange
    const processEnv: NodeJS.ProcessEnv = {
      AWS_LAMBDA_FUNCTION_NAME: "web-lambda",
    };

    // Act
    await injectRuntimeEnv(processEnv);

    // Assert
    expect(processEnv.CHAT_HISTORY_MAX_MESSAGES).toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("should not overwrite env vars already set", async () => {
    // Arrange
    const processEnv: NodeJS.ProcessEnv = {
      AWS_LAMBDA_FUNCTION_NAME: "web-lambda",
      NODE_ENV: "test",
      CHAT_HISTORY_MAX_MESSAGES: "999",
    };

    // SSM returns value but existing env var should win
    sendMock.mockResolvedValue({
      $metadata: {},
      Parameters: [
        {
          Name: "/manual/budget/test/app/chat-history-max-messages",
          Value: "50",
        },
      ],
    });

    // Act
    await injectRuntimeEnv(processEnv);

    // Assert
    expect(processEnv.CHAT_HISTORY_MAX_MESSAGES).toBe("999");
  });
});
