import { useState, useCallback, useEffect } from 'react';

export interface VaultKey {
  id: string;
  name: string;
  provider: string; // 'openrouter'
  obfuscatedKey: string;
  createdAt: number;
}

export function useKeyVault() {
  const VAULT_STORAGE_KEY = 'whatsie_key_vault';

  const [keys, setKeys] = useState<VaultKey[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VAULT_STORAGE_KEY);
      if (stored) {
        setKeys(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load key vault', e);
    }
  }, []);

  const obfuscate = (key: string) => {
    // Basic base64 obfuscation to prevent casual shoulder-surfing or simple text scanning.
    // In production, real keys are stored in the backend AES-256-GCM vault, 
    // this is purely for the frontend "Key Bank" UX.
    return btoa(key).split('').reverse().join('');
  };

  const deobfuscate = (obfuscated: string) => {
    try {
      return atob(obfuscated.split('').reverse().join(''));
    } catch {
      return '';
    }
  };

  const addKey = useCallback((name: string, provider: string, rawKey: string) => {
    const newKey: VaultKey = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      provider,
      obfuscatedKey: obfuscate(rawKey),
      createdAt: Date.now(),
    };

    setKeys((prev) => {
      const next = [...prev, newKey];
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    return newKey.id;
  }, []);

  const removeKey = useCallback((id: string) => {
    setKeys((prev) => {
      const next = prev.filter(k => k.id !== id);
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getKey = useCallback((id: string) => {
    const k = keys.find(k => k.id === id);
    if (!k) return null;
    return deobfuscate(k.obfuscatedKey);
  }, [keys]);

  return { keys, addKey, removeKey, getKey, deobfuscate };
}
