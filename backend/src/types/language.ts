export const SUPPORTED_INTERFACE_LANGUAGES = ["en", "de"] as const;

type SupportedInterfaceLanguage =
  (typeof SUPPORTED_INTERFACE_LANGUAGES)[number];

export const DEFAULT_INTERFACE_LANGUAGE: SupportedInterfaceLanguage = "en";

export function isSupportedInterfaceLanguage(language: string): boolean {
  return SUPPORTED_INTERFACE_LANGUAGES.some(
    (supported) => supported === language,
  );
}
