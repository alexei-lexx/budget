import { toolErrorMiddleware } from "langchain";
import { Logger } from "../ports/logger";
import { isUserFacingError } from "../utils/errors";

// Exposes user-facing error messages to the model so it can self-correct.
// Logs everything else and returns a generic message instead,
// so internal error details never reach the LLM.
export const createToolUserFacingErrorMiddleware = (logger: Logger) =>
  toolErrorMiddleware({
    onError: (error, request) => {
      if (isUserFacingError(error)) {
        return error.message;
      }

      logger.error(`Error in ${request.toolCall.name} tool:`, error);

      return `Tool '${request.toolCall.name}' failed unexpectedly.`;
    },
  });
