import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

export type PutWriteItem = Required<
  Pick<
    NonNullable<
      ConstructorParameters<typeof TransactWriteCommand>[0]["TransactItems"]
    >[number],
    "Put"
  >
>;

export type UpdateWriteItem = Required<
  Pick<
    NonNullable<
      ConstructorParameters<typeof TransactWriteCommand>[0]["TransactItems"]
    >[number],
    "Update"
  >
>;
