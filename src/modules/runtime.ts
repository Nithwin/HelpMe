export const extApi = (globalThis as any).browser ?? (globalThis as any).chrome;

export async function getLocalSettings(keys: string | string[] | { [key: string]: any }): Promise<{ [key: string]: any }> {
  return new Promise((resolve) => {
    extApi.storage.local.get(keys, (result: any) => {
      resolve(result || {});
    });
  });
}
