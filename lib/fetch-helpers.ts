export async function fetchParallel<T extends Promise<any>[]>(...queries: T) {
  return Promise.all(queries);
}
const cache = new Map<string, { value: any; expiry: number }>();
export function withCache<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): () => Promise<T> {
  return async () => {
    const c = cache.get(key);
    if (c && c.expiry > Date.now()) return c.value as T;
    const value = await fetcher();
    cache.set(key, { value, expiry: Date.now() + ttlMs });
    return value;
  };
}
