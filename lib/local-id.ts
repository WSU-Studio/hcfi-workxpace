/**
 * Id for client-only form rows (not a database key).
 *
 * `crypto.randomUUID()` is limited to secure contexts (HTTPS or localhost).
 * On `http://<ip>` the method is missing, and calling it during the first
 * render takes down the page. `getRandomValues` is available in that context.
 */
export function createLocalId(): string {
  const webCrypto = globalThis.crypto;

  if (typeof webCrypto?.randomUUID === 'function') {
    return webCrypto.randomUUID();
  }

  if (typeof webCrypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `local-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}
