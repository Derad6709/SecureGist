// Web Crypto API utilities for SecureGist

export const generateKey = async (): Promise<CryptoKey> => {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true,
    ["encrypt", "decrypt"]
  );
};

export const exportKey = async (key: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToHex(exported);
};

export const importKey = async (hexKey: string): Promise<CryptoKey> => {
  const buffer = hexToArrayBuffer(hexKey);
  return window.crypto.subtle.importKey(
    "raw",
    buffer,
    "AES-GCM",
    true,
    ["encrypt", "decrypt"]
  );
};

export const encryptData = async (data: string, key: CryptoKey): Promise<{ iv: string; content: string }> => {
  const encoded = new TextEncoder().encode(data);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encoded
  );

  return {
    iv: arrayBufferToHex(iv.buffer),
    content: arrayBufferToHex(encrypted)
  };
};

export const decryptData = async (encryptedHex: string, ivHex: string, key: CryptoKey): Promise<string> => {
  const encrypted = hexToArrayBuffer(encryptedHex);
  const iv = hexToArrayBuffer(ivHex);

  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
};

// Helpers
function arrayBufferToHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}
