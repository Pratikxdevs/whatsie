/**
 * Local storage key vault for API keys.
 * Obfuscates keys so they aren't stored in plain text.
 */

export interface VaultEntry {
  keyHash: string;
  obfuscatedKey: string;
  balance: number;
}

const VAULT_KEY = 'ai_key_vault';

// Simple base64 encoding to obfuscate (not true encryption, just avoids plain-text scraping)
function obfuscate(key: string): string {
  if (!key) return '';
  return btoa(key);
}

export function deobfuscateKey(obfuscatedKey: string): string | null {
  if (!obfuscatedKey) return null;
  try {
    return atob(obfuscatedKey);
  } catch {
    return null;
  }
}

function generateHash(key: string): string {
  if (!key) return 'unknown';
  if (key.length <= 12) return key;
  return key.substring(0, 8) + '...' + key.substring(key.length - 4);
}

export function getVaultEntries(): VaultEntry[] {
  try {
    const data = localStorage.getItem(VAULT_KEY);
    if (!data) return [];
    return JSON.parse(data) as VaultEntry[];
  } catch {
    return [];
  }
}

export function saveVaultEntry(key: string, balance: number): void {
  if (!key) return;
  const entries = getVaultEntries();
  const obfuscatedKey = obfuscate(key);
  const keyHash = generateHash(key);
  
  const existingIndex = entries.findIndex(e => e.keyHash === keyHash);
  if (existingIndex >= 0) {
    entries[existingIndex].balance = balance;
    entries[existingIndex].obfuscatedKey = obfuscatedKey;
  } else {
    entries.push({ keyHash, obfuscatedKey, balance });
  }
  
  localStorage.setItem(VAULT_KEY, JSON.stringify(entries));
}

export function deleteVaultEntry(keyHash: string): void {
  const entries = getVaultEntries();
  const filtered = entries.filter(e => e.keyHash !== keyHash);
  localStorage.setItem(VAULT_KEY, JSON.stringify(filtered));
}
