import { ref, watch } from "vue";
import { apolloClient } from "@/apollo";
import {
  useCreateTransferMutation,
  useUpdateTransferMutation,
  useDeleteTransferMutation,
  GetTransferDocument,
  type Transfer,
  type CreateTransferInput,
  type UpdateTransferInput,
  type Transaction,
} from "@/__generated__/vue-apollo";

// Re-export types for backward compatibility
export type { Transfer, CreateTransferInput, UpdateTransferInput, Transaction };

export function useTransfers() {
  const transfersError = ref<string | null>(null);

  // Create transfer mutation
  const {
    mutate: createTransferMutation,
    loading: createTransferLoading,
    error: createTransferError,
  } = useCreateTransferMutation();

  // Update transfer mutation
  const {
    mutate: updateTransferMutation,
    loading: updateTransferLoading,
    error: updateTransferError,
  } = useUpdateTransferMutation();

  // Delete transfer mutation
  const {
    mutate: deleteTransferMutation,
    loading: deleteTransferLoading,
    error: deleteTransferError,
  } = useDeleteTransferMutation();

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
      const { data } = await apolloClient.query({
        query: GetTransferDocument,
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
