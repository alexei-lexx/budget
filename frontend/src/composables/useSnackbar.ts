import { ref } from "vue";

// Global snackbar state
const showSnackbar = ref(false);
const snackbarMessage = ref("");
const snackbarColor = ref("error");

export function useSnackbar() {
  const showErrorSnackbar = (message: string) => {
    snackbarMessage.value = message;
    snackbarColor.value = "error";
    showSnackbar.value = true;
  };

  const showSuccessSnackbar = (message: string) => {
    snackbarMessage.value = message;
    snackbarColor.value = "success";
    showSnackbar.value = true;
  };

  const showInfoSnackbar = (message: string) => {
    snackbarMessage.value = message;
    snackbarColor.value = "info";
    showSnackbar.value = true;
  };

  const hideSnackbar = () => {
    showSnackbar.value = false;
  };

  return {
    // State
    showSnackbar,
    snackbarMessage,
    snackbarColor,

    // Actions
    showErrorSnackbar,
    showSuccessSnackbar,
    showInfoSnackbar,
    hideSnackbar,
  };
}
