export function createSingleton<T>(factory: () => T): () => T {
  let instance: T | undefined;

  return () => {
    if (instance === undefined) {
      instance = factory();
    }
    return instance;
  };
}

export function createAsyncSingleton<T>(
  factory: () => Promise<T>,
): () => Promise<T> {
  let instance: T | undefined;

  return async () => {
    if (instance === undefined) {
      instance = await factory();
    }
    return instance;
  };
}
