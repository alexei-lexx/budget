import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
  UpdateUserPoolClientCommand,
  UpdateUserPoolClientCommandInput,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({});

export interface CustomResourceProperties {
  UserPoolId: string;
  ClientId: string;
  CallbackURLs: string[];
  LogoutURLs: string[];
  Version?: string;
}

interface CustomResourceEvent {
  RequestType: "Create" | "Update" | "Delete";
  ResourceProperties: CustomResourceProperties;
}

export async function handler(event: CustomResourceEvent): Promise<void> {
  console.log("Event:", JSON.stringify(event, null, 2));

  if (event.RequestType === "Delete") {
    // Nothing to do on delete - URLs will be deleted with the User Pool
    return;
  }

  const { UserPoolId, ClientId, CallbackURLs, LogoutURLs } =
    event.ResourceProperties;

  // Fetch current User Pool Client configuration
  const describeResponse = await client.send(
    new DescribeUserPoolClientCommand({
      UserPoolId,
      ClientId,
    }),
  );

  if (!describeResponse.UserPoolClient) {
    throw new Error("User Pool Client not found");
  }

  const currentConfig = describeResponse.UserPoolClient;

  // Log current state
  console.log(
    "Current User Pool Client Config:",
    JSON.stringify(currentConfig, null, 2),
  );

  // Build update command - only include defined fields to avoid resetting to defaults
  const updateInput: UpdateUserPoolClientCommandInput = {
    ...currentConfig, // Start with existing config to preserve all settings
    UserPoolId, // Required for update
    ClientId, // Required for update
    CallbackURLs, // New values
    LogoutURLs, // New values
  };

  // Log the update input to verify only intended changes
  console.log("Update Input:", JSON.stringify(updateInput, null, 2));

  // Update with new URLs while preserving all other settings
  await client.send(new UpdateUserPoolClientCommand(updateInput));
}
