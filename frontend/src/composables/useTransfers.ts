import { ref } from "vue";
import { apolloClient } from "@/apollo";
import { i18n } from "@/plugins/i18n";
import { resolveErrorMessage } from "@/utils/graphqlError";
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
  const { t } = i18n.global;
  const transfersError = ref<string | null>(null);

  // Create transfer mutation
  const { mutate: createTransferMutation, loading: createTransferLoading } =
    useCreateTransferMutation();

  // Update transfer mutation
  const { mutate: updateTransferMutation, loading: updateTransferLoading } =
    useUpdateTransferMutation();

  // Delete transfer mutation
  const { mutate: deleteTransferMutation, loading: deleteTransferLoading } =
    useDeleteTransferMutation();

  // Create transfer function
  const createTransfer = async (input: CreateTransferInput): Promise<Transfer | null> => {
    try {
      transfersError.value = null;

      const result = await createTransferMutation({ input });
      if (result?.data?.createTransfer) {
        const transfer = result.data.createTransfer;

        return transfer;
      }
      return null;
    } catch (error) {
      console.error("Error creating transfer:", error);

      transfersError.value = resolveErrorMessage(error, t("transfers.errors.createFailed"));

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
        const transfer = result.data.updateTransfer;

        return transfer;
      }
      return null;
    } catch (error) {
      console.error("Error updating transfer:", error);

      transfersError.value = resolveErrorMessage(error, t("transfers.errors.updateFailed"));

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

      transfersError.value = resolveErrorMessage(error, t("transfers.errors.deleteFailed"));

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

      transfersError.value = resolveErrorMessage(error, t("transfers.errors.loadFailed"));

      return null;
    }
  };

  return {
    // Loading states
    createTransferLoading,
    updateTransferLoading,
    deleteTransferLoading,

    // Error state
    transfersError,

    // Functions
    createTransfer,
    updateTransfer,
    deleteTransfer,
    getTransfer,
  };
}
