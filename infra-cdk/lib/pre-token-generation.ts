import type {
  PreTokenGenerationV2TriggerEvent,
  PreTokenGenerationV2TriggerHandler,
} from "aws-lambda";
import { requireEnv } from "./require-env";

export const handler: PreTokenGenerationV2TriggerHandler = async (
  event: PreTokenGenerationV2TriggerEvent,
) => {
  const namespace = requireEnv("AUTH_CLAIM_NAMESPACE");

  event.response = {
    claimsAndScopeOverrideDetails: {
      accessTokenGeneration: {
        claimsToAddOrOverride: {
          [`${namespace}/email`]: event.request.userAttributes.email,
        },
      },
    },
  };

  return event;
};
