export const SUPPORTED_INTERFACE_LANGUAGES: readonly string[] = ["en", "de"];

export const DEFAULT_INTERFACE_LANGUAGE = "en";

export function isSupportedInterfaceLanguage(language: string): boolean {
  return SUPPORTED_INTERFACE_LANGUAGES.includes(language);
}
