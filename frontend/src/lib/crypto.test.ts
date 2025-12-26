import { describe, it, expect, beforeAll } from 'vitest';
import { generateKey, encryptData, decryptData, exportKey, importKey } from './crypto';
import { webcrypto } from 'node:crypto';

describe('crypto utils', () => {
  beforeAll(() => {
    // Polyfill Web Crypto API for JSDOM/Node environment
    if (!globalThis.crypto) {
        // @ts-ignore
        globalThis.crypto = webcrypto;
    } else if (!globalThis.crypto.subtle) {
         // @ts-ignore
        globalThis.crypto.subtle = webcrypto.subtle;
    }
  });

  it('should generate a key', async () => {
    const key = await generateKey();
    expect(key).toBeDefined();
    expect(key.algorithm.name).toBe('AES-GCM');
  });

  it('should export and import a key', async () => {
    const originalKey = await generateKey();
    const exportedHex = await exportKey(originalKey);
    expect(typeof exportedHex).toBe('string');
    
    const importedKey = await importKey(exportedHex);
    expect(importedKey).toBeDefined();
    expect(importedKey.algorithm.name).toBe('AES-GCM');
  });

  it('should encrypt and decrypt data correctly', async () => {
    const key = await generateKey();
    const data = 'Secret Message';
    
    const { iv, content } = await encryptData(data, key);
    expect(iv).toBeDefined();
    expect(content).toBeDefined();
    expect(content).not.toBe(data);

    const decrypted = await decryptData(content, iv, key);
    expect(decrypted).toBe(data);
  });
});
