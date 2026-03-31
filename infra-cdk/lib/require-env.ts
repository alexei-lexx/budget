export function requireEnv(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

export function requireIntEnv(name: string, defaultValue?: number): number {
  const value = requireEnv(name, defaultValue?.toString());
  return parseIntEnv(name, value);
}

export function requireFloatEnv(name: string, defaultValue?: number): number {
  const value = requireEnv(name, defaultValue?.toString());
  return parseFloatEnv(name, value);
}

function parseIntEnv(name: string, value: string): number {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a valid integer`);
  }
  return parsed;
}

function parseFloatEnv(name: string, value: string): number {
  const parsed = parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${name} must be a valid number`);
  }
  return parsed;
}
