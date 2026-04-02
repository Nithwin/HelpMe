export const extApi = (globalThis as any).browser ?? (globalThis as any).chrome;

export async function getLocalSettings(keys: string | string[] | { [key: string]: any }): Promise<{ [key: string]: any }> {
  const storage = extApi.storage.sync || extApi.storage.local;
  return new Promise((resolve) => {
    storage.get(keys, (result: any) => {
      resolve(result || {});
    });
  });
}
