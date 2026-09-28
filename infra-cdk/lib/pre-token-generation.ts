import type {
  PreTokenGenerationV2TriggerEvent,
  PreTokenGenerationV2TriggerHandler,
} from "aws-lambda";
import { requireEnv } from "./require-env";

export const handler: PreTokenGenerationV2TriggerHandler = async (
  event: PreTokenGenerationV2TriggerEvent,
) => {
  const namespace = requireEnv("AUTH_CLAIM_NAMESPACE");

  const email = event.request.userAttributes["email"];
  if (!email) {
    throw new Error("User is missing required email attribute");
  }

  event.response = {
    claimsAndScopeOverrideDetails: {
      accessTokenGeneration: {
        claimsToAddOrOverride: {
          [`${namespace}/email`]: email,
        },
      },
    },
  };

  return event;
};
