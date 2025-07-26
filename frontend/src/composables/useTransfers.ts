import { useMutation } from "@vue/apollo-composable";
import { ref, watch } from "vue";
import { apolloClient } from "@/apollo";
import { CREATE_TRANSFER, UPDATE_TRANSFER, DELETE_TRANSFER } from "@/graphql/mutations";
import { GET_TRANSFER } from "@/graphql/queries";
import type { Transaction } from "./useTransactions";

export interface Transfer {
  id: string;
  outboundTransaction: Transaction;
  inboundTransaction: Transaction;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string | null;
}

export interface UpdateTransferInput {
  id: string;
  fromAccountId?: string;
  toAccountId?: string;
  amount?: number;
  date?: string;
  description?: string | null;
}

interface CreateTransferResponse {
  createTransfer: Transfer;
}

interface UpdateTransferResponse {
  updateTransfer: Transfer;
}

interface DeleteTransferResponse {
  deleteTransfer: boolean;
}

interface GetTransferResponse {
  transfer: Transfer | null;
}

export function useTransfers() {
  const transfersError = ref<string | null>(null);

  // Create transfer mutation
  const {
    mutate: createTransferMutation,
    loading: createTransferLoading,
    error: createTransferError,
  } = useMutation<CreateTransferResponse, { input: CreateTransferInput }>(CREATE_TRANSFER);

  // Update transfer mutation
  const {
    mutate: updateTransferMutation,
    loading: updateTransferLoading,
    error: updateTransferError,
  } = useMutation<UpdateTransferResponse, { input: UpdateTransferInput }>(UPDATE_TRANSFER);

  // Delete transfer mutation
  const {
    mutate: deleteTransferMutation,
    loading: deleteTransferLoading,
    error: deleteTransferError,
  } = useMutation<DeleteTransferResponse, { id: string }>(DELETE_TRANSFER);

  // Watch for mutation errors
  watch(
    [createTransferError, updateTransferError, deleteTransferError],
    ([createError, updateError, deleteError]) => {
      const error = createError || updateError || deleteError;
      if (error) {
        console.error("Transfer mutation failed:", error);
        transfersError.value = error.message || "Transfer operation failed";
      }
    },
  );

  // Create transfer function
  const createTransfer = async (
    input: CreateTransferInput,
    onTransactionsCreated?: (transactions: Transaction[]) => void,
  ): Promise<Transfer | null> => {
    try {
      transfersError.value = null;
      const result = await createTransferMutation({ input });
      if (result?.data?.createTransfer) {
        const transfer = result.data.createTransfer;

        // If callback provided, call it with the new transactions
        if (onTransactionsCreated) {
          onTransactionsCreated([transfer.outboundTransaction, transfer.inboundTransaction]);
        }

        return transfer;
      }
      return null;
    } catch (error) {
      console.error("Error creating transfer:", error);
      transfersError.value = error instanceof Error ? error.message : "Failed to create transfer";
      return null;
    }
  };

  // Update transfer function
  const updateTransfer = async (
    id: string,
    input: Omit<UpdateTransferInput, "id">,
    onTransactionsUpdated?: (transactions: Transaction[]) => void,
  ): Promise<Transfer | null> => {
    try {
      transfersError.value = null;
      const result = await updateTransferMutation({ input: { id, ...input } });
      if (result?.data?.updateTransfer) {
        const transfer = result.data.updateTransfer;

        // If callback provided, call it with the updated transactions
        if (onTransactionsUpdated) {
          onTransactionsUpdated([transfer.outboundTransaction, transfer.inboundTransaction]);
        }

        return transfer;
      }
      return null;
    } catch (error) {
      console.error("Error updating transfer:", error);
      transfersError.value = error instanceof Error ? error.message : "Failed to update transfer";
      return null;
    }
  };

  // Delete transfer function
  const deleteTransfer = async (id: string): Promise<boolean> => {
    try {
      transfersError.value = null;
      const result = await deleteTransferMutation({ id });
      if (result?.data?.deleteTransfer) {
        return result.data.deleteTransfer;
      }
      return false;
    } catch (error) {
      console.error("Error deleting transfer:", error);
      transfersError.value = error instanceof Error ? error.message : "Failed to delete transfer";
      return false;
    }
  };

  // Get transfer function using Apollo Client directly
  const getTransfer = async (id: string): Promise<Transfer | null> => {
    try {
      transfersError.value = null;
      const { data } = await apolloClient.query<GetTransferResponse, { id: string }>({
        query: GET_TRANSFER,
        variables: { id },
        fetchPolicy: "cache-first",
      });

      if (data?.transfer) {
        return data.transfer;
      }
      return null;
    } catch (error) {
      console.error("Error getting transfer:", error);
      transfersError.value = error instanceof Error ? error.message : "Failed to get transfer";
      return null;
    }
  };

  return {
    // Loading states
    createTransferLoading,
    updateTransferLoading,
    deleteTransferLoading,

    // Error states
    transfersError,
    createTransferError,
    updateTransferError,
    deleteTransferError,

    // Functions
    createTransfer,
    updateTransfer,
    deleteTransfer,
    getTransfer,
  };
}
