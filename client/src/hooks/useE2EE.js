import { useEffect, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateUser } from '../features/auth/authSlice';
import api from '../services/api';
import {
  generateKeyPair,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  storePrivateKey,
  getStoredPrivateKey,
} from '../services/encryption';

// In-memory cache: { userId: CryptoKey (shared key) }
const sharedKeyCache = new Map();

export function useE2EE() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const privateKeyRef = useRef(null); // CryptoKey object

  // On mount: generate key pair if not stored, upload public key to server
  useEffect(() => {
    if (!user) return;

    const initKeys = async () => {
      try {
        const stored = getStoredPrivateKey();
        if (stored) {
          // Re-import stored private key
          const keyBuffer = Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
          privateKeyRef.current = await window.crypto.subtle.importKey(
            'pkcs8',
            keyBuffer,
            { name: 'ECDH', namedCurve: 'P-256' },
            false,
            ['deriveKey']
          );
          return;
        }

        // First time: generate and upload
        const { publicKey, privateKey, rawPublicKey, rawPrivateKey } = await generateKeyPair();

        privateKeyRef.current = rawPrivateKey;
        storePrivateKey(privateKey);

        // Only upload if public key changed
        if (user.publicKey !== publicKey) {
          await api.patch('/users/me', { publicKey });
          dispatch(updateUser({ publicKey }));
        }
      } catch (err) {
        console.error('E2EE init failed:', err);
      }
    };

    initKeys();
  }, [user?._id]);

  // Get or derive shared key for a given recipient userId
  const getSharedKey = useCallback(async (recipientId, recipientPublicKey) => {
    if (!privateKeyRef.current) return null;
    if (sharedKeyCache.has(recipientId)) return sharedKeyCache.get(recipientId);
    if (!recipientPublicKey) return null;

    try {
      const sharedKey = await deriveSharedKey(privateKeyRef.current, recipientPublicKey);
      sharedKeyCache.set(recipientId, sharedKey);
      return sharedKey;
    } catch {
      return null;
    }
  }, []);

  const encryptForUser = useCallback(async (plaintext, recipientId, recipientPublicKey) => {
    const sharedKey = await getSharedKey(recipientId, recipientPublicKey);
    if (!sharedKey) return { content: plaintext, isEncrypted: false };
    const ciphertext = await encryptMessage(sharedKey, plaintext);
    return { content: ciphertext, isEncrypted: true };
  }, [getSharedKey]);

  const decryptFromUser = useCallback(async (ciphertext, senderId, senderPublicKey) => {
    if (!ciphertext) return '';
    const sharedKey = await getSharedKey(senderId, senderPublicKey);
    if (!sharedKey) return ciphertext;
    try {
      return await decryptMessage(sharedKey, ciphertext);
    } catch {
      return '[Encrypted message]';
    }
  }, [getSharedKey]);

  return { encryptForUser, decryptFromUser };
}
