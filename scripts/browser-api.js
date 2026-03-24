export const extensionApi = globalThis.browser ?? globalThis.chrome;

export function callChromeMethod(target, method, ...args) {
  return new Promise((resolve, reject) => {
    try {
      target[method](...args, result => {
        const runtime = globalThis.chrome?.runtime ?? globalThis.browser?.runtime;
        if (runtime?.lastError) {
          reject(new Error(runtime.lastError.message));
          return;
        }
        resolve(result);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function isFirefox() {
  const manifest = extensionApi.runtime.getManifest();
  return Boolean(manifest.browser_specific_settings?.gecko);
}
