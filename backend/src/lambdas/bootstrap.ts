import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";

// Explicit map from SSM parameter path to the Lambda env var it populates.
// Adding a new runtime-loaded parameter means adding one line here and granting
// read permission in infra-cdk/lib/backend-cdk-stack.ts.
interface ParamBinding {
  ssmPath: string;
  envVar: string;
}

type SsmEnvBindingsFactory = (nodeEnv: string) => ParamBinding[];

const defaultSsmEnvBindings: SsmEnvBindingsFactory = (nodeEnv) => [
  {
    ssmPath: `/manual/budget/${nodeEnv}/bedrock/connection-timeout`,
    envVar: "AWS_BEDROCK_CONNECTION_TIMEOUT",
  },
  {
    ssmPath: `/manual/budget/${nodeEnv}/bedrock/max-tokens`,
    envVar: "AWS_BEDROCK_MAX_TOKENS",
  },
  {
    ssmPath: `/manual/budget/${nodeEnv}/bedrock/model-id`,
    envVar: "AWS_BEDROCK_MODEL_ID",
  },
  {
    ssmPath: `/manual/budget/${nodeEnv}/bedrock/request-timeout`,
    envVar: "AWS_BEDROCK_REQUEST_TIMEOUT",
  },
  {
    ssmPath: `/manual/budget/${nodeEnv}/bedrock/temperature`,
    envVar: "AWS_BEDROCK_TEMPERATURE",
  },
  {
    ssmPath: `/manual/budget/${nodeEnv}/app/chat-history-max-messages`,
    envVar: "CHAT_HISTORY_MAX_MESSAGES",
  },
  {
    ssmPath: `/manual/budget/${nodeEnv}/app/chat-message-ttl-seconds`,
    envVar: "CHAT_MESSAGE_TTL_SECONDS",
  },
  {
    ssmPath: `/manual/budget/${nodeEnv}/langsmith/tracing`,
    envVar: "LANGSMITH_TRACING",
  },
  {
    ssmPath: `/manual/budget/${nodeEnv}/langsmith/api-key`,
    envVar: "LANGSMITH_API_KEY",
  },
  {
    ssmPath: `/manual/budget/${nodeEnv}/langsmith/project`,
    envVar: "LANGSMITH_PROJECT",
  },
];

export async function injectRuntimeEnv(
  processEnv: NodeJS.ProcessEnv,
  getBindings: SsmEnvBindingsFactory = defaultSsmEnvBindings,
): Promise<void> {
  // AWS_LAMBDA_FUNCTION_NAME is set by the Lambda runtime, never in local dev.
  // Local dev loads its config from .env via dotenvx and must not hit SSM.
  if (!processEnv.AWS_LAMBDA_FUNCTION_NAME) {
    console.warn(
      "Skipping SSM parameter injection: AWS_LAMBDA_FUNCTION_NAME is not set",
    );
    return;
  }

  const nodeEnv = processEnv.NODE_ENV;
  if (!nodeEnv) {
    console.warn("Skipping SSM parameter injection: NODE_ENV is not set");
    return;
  }

  const bindings = getBindings(nodeEnv);
  if (bindings.length === 0) {
    console.warn(
      "Skipping SSM parameter injection: no parameter bindings configured",
    );
    return;
  }

  const ssmClient = new SSMClient({});

  // SSM GetParameters accepts up to 10 names per call.
  for (let offset = 0; offset < bindings.length; offset += 10) {
    const chunk = bindings.slice(offset, offset + 10);

    const ssmPaths = chunk.map((binding) => binding.ssmPath);
    const response = await ssmClient.send(
      new GetParametersCommand({ Names: ssmPaths, WithDecryption: true }),
    );

    for (const parameter of response.Parameters ?? []) {
      const binding = chunk.find(
        (candidate) => candidate.ssmPath === parameter.Name,
      );
      if (!binding || parameter.Value === undefined) {
        continue;
      }

      // Do not overwrite values already set by Lambda env.
      if (processEnv[binding.envVar] === undefined) {
        processEnv[binding.envVar] = parameter.Value;

        console.log(
          `Injected ${binding.envVar} from SSM parameter ${parameter.Name}`,
        );
      } else {
        console.log(
          `Skipped ${binding.envVar}: already set (SSM parameter ${parameter.Name} ignored)`,
        );
      }
    }

    for (const parameter of response.InvalidParameters ?? []) {
      console.log(`Skipped SSM parameter ${parameter}: likely nonexistent`);
    }
  }
}
