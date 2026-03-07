import { IAgentDataService } from "../../services/agent-data-service";

export const createMockAgentDataService =
  (): jest.Mocked<IAgentDataService> => ({
    getAccounts: jest.fn(),
    getCategories: jest.fn(),
    getFilteredTransactions: jest.fn(),
  });
