import { VersionConflictError } from "../../ports/repository-error";
import { BusinessError } from "../business-error";

export async function handleVersionConflict<T>(
  entity: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof VersionConflictError) {
      throw new BusinessError(
        `${entity} was modified, please reload and try again`,
      );
    }
    throw error;
  }
}
