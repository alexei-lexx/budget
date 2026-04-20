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

    const bindings = [
      { ssmPath: "/budget/test/feature-x", envVar: "FEATURE_X" },
      { ssmPath: "/budget/test/feature-y", envVar: "FEATURE_Y" },
    ];

    // SSM returns values for both requested parameters
    sendMock.mockResolvedValue({
      $metadata: {},
      Parameters: [
        { Name: "/budget/test/feature-x", Value: "value-x" },
        { Name: "/budget/test/feature-y", Value: "value-y" },
      ],
    });

    // Act
    await injectRuntimeEnv(processEnv, () => bindings);

    // Assert
    expect(processEnv.FEATURE_X).toBe("value-x");
    expect(processEnv.FEATURE_Y).toBe("value-y");
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("should call SSM multiple times when bindings exceed batch size", async () => {
    // Arrange
    const processEnv: NodeJS.ProcessEnv = {
      AWS_LAMBDA_FUNCTION_NAME: "web-lambda",
      NODE_ENV: "test",
    };

    const bindings = Array.from({ length: 15 }, (_, i) => ({
      ssmPath: `/budget/test/feature-${i}`,
      envVar: `FEATURE_${i}`,
    }));

    // SSM echoes each requested name back as a parameter value
    sendMock.mockImplementation(async (command) => {
      const names = (command as GetParametersCommand).input.Names ?? [];
      return {
        $metadata: {},
        Parameters: names.map((name) => ({
          Name: name,
          Value: `value-${name}`,
        })),
      };
    });

    // Act
    await injectRuntimeEnv(processEnv, () => bindings);

    // Assert
    for (const binding of bindings) {
      expect(processEnv[binding.envVar]).toBe(`value-${binding.ssmPath}`);
    }

    expect(sendMock).toHaveBeenCalledTimes(2);

    const firstCallNames = (sendMock.mock.calls[0][0] as GetParametersCommand)
      .input.Names;
    const secondCallNames = (sendMock.mock.calls[1][0] as GetParametersCommand)
      .input.Names;

    expect(firstCallNames).toHaveLength(10);
    expect(secondCallNames).toHaveLength(5);
  });

  // Validation failures

  it("should skip SSM fetch when not running on Lambda", async () => {
    // Arrange
    const processEnv: NodeJS.ProcessEnv = { NODE_ENV: "test" };
    const bindings = [
      { ssmPath: "/budget/test/feature-x", envVar: "FEATURE_X" },
    ];

    // Act
    await injectRuntimeEnv(processEnv, () => bindings);

    // Assert
    expect(processEnv.FEATURE_X).toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("should skip SSM fetch when NODE_ENV is unset", async () => {
    // Arrange
    const processEnv: NodeJS.ProcessEnv = {
      AWS_LAMBDA_FUNCTION_NAME: "web-lambda",
    };
    const bindings = [
      { ssmPath: "/budget/test/feature-x", envVar: "FEATURE_X" },
    ];

    // Act
    await injectRuntimeEnv(processEnv, () => bindings);

    // Assert
    expect(processEnv.FEATURE_X).toBeUndefined();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("should not overwrite env vars when already set", async () => {
    // Arrange
    const processEnv: NodeJS.ProcessEnv = {
      AWS_LAMBDA_FUNCTION_NAME: "web-lambda",
      NODE_ENV: "test",
      FEATURE_X: "preset",
    };

    const bindings = [
      { ssmPath: "/budget/test/feature-x", envVar: "FEATURE_X" },
    ];

    // SSM returns value that should be ignored in favor of existing env var
    sendMock.mockResolvedValue({
      $metadata: {},
      Parameters: [{ Name: "/budget/test/feature-x", Value: "new-value" }],
    });

    // Act
    await injectRuntimeEnv(processEnv, () => bindings);

    // Assert
    expect(processEnv.FEATURE_X).toBe("preset");
  });
});
