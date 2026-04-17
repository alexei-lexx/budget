export const SUPPORTED_CURRENCIES: readonly string[] =
  Intl.supportedValuesOf("currency");

export function isSupportedCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.includes(code);
}
