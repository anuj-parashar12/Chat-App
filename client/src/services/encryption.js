// Client-side E2EE using Web Crypto API (ECDH + AES-GCM)

export const generateKeyPair = async () => {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );

  const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer))),
    privateKey: btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer))),
    rawPublicKey: keyPair.publicKey,
    rawPrivateKey: keyPair.privateKey,
  };
};

export const deriveSharedKey = async (myPrivateKey, theirPublicKeyB64) => {
  const theirPublicKeyBuffer = Uint8Array.from(atob(theirPublicKeyB64), (c) => c.charCodeAt(0));
  const theirPublicKey = await window.crypto.subtle.importKey(
    'spki',
    theirPublicKeyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  return window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: theirPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptMessage = async (sharedKey, plaintext) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
};

export const decryptMessage = async (sharedKey, ciphertextB64) => {
  const combined = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encrypted
  );

  return new TextDecoder().decode(decrypted);
};

export const storePrivateKey = (privateKeyB64) => {
  sessionStorage.setItem('nexchat_privkey', privateKeyB64);
};

export const getStoredPrivateKey = () => sessionStorage.getItem('nexchat_privkey');
