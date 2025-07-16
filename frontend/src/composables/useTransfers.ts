import { useMutation } from "@vue/apollo-composable";
import { ref, watch } from "vue";
import { CREATE_TRANSFER, UPDATE_TRANSFER, DELETE_TRANSFER } from "@/graphql/mutations";
import { GET_TRANSACTIONS_PAGINATED } from "@/graphql/queries";
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

export function useTransfers() {
  const transfersError = ref<string | null>(null);

  // Create transfer mutation
  const {
    mutate: createTransferMutation,
    loading: createTransferLoading,
    error: createTransferError,
  } = useMutation<CreateTransferResponse, { input: CreateTransferInput }>(CREATE_TRANSFER, {
    refetchQueries: [GET_TRANSACTIONS_PAGINATED],
  });

  // Update transfer mutation
  const {
    mutate: updateTransferMutation,
    loading: updateTransferLoading,
    error: updateTransferError,
  } = useMutation<UpdateTransferResponse, { input: UpdateTransferInput }>(UPDATE_TRANSFER, {
    refetchQueries: [GET_TRANSACTIONS_PAGINATED],
  });

  // Delete transfer mutation
  const {
    mutate: deleteTransferMutation,
    loading: deleteTransferLoading,
    error: deleteTransferError,
  } = useMutation<DeleteTransferResponse, { id: string }>(DELETE_TRANSFER, {
    refetchQueries: [GET_TRANSACTIONS_PAGINATED],
  });

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
  const createTransfer = async (input: CreateTransferInput): Promise<Transfer | null> => {
    try {
      transfersError.value = null;
      const result = await createTransferMutation({ input });
      if (result?.data?.createTransfer) {
        return result.data.createTransfer;
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
  ): Promise<Transfer | null> => {
    try {
      transfersError.value = null;
      const result = await updateTransferMutation({ input: { id, ...input } });
      if (result?.data?.updateTransfer) {
        return result.data.updateTransfer;
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
  };
}
