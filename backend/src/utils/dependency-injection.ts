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
  let promise: Promise<T> | undefined;

  return () => {
    if (!promise) {
      promise = factory().catch((error) => {
        promise = undefined;
        throw error;
      });
    }
    return promise;
  };
}
