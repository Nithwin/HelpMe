export const extApi = globalThis.browser ?? globalThis.chrome;

export async function getLocalSettings(keys) {
  return extApi.storage.local.get(keys);
}
