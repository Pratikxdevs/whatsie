const VAULT_SALT = "whatsie_secure_salt_2026";

export interface VaultEntry {
  keyHash: string;      // Masked / truncated display key (e.g. sk-or-...4a9f)
  obfuscatedKey: string; // Base64 + Dynamic salt-shuffled representation of the key
  provider: string;      // e.g. "openrouter"
  lastVerified: string;  // ISO timestamp
  balance: number;
}

export function obfuscateKey(rawKey: string): string {
  const combined = `${VAULT_SALT}:${rawKey}`;
  const reversed = combined.split("").reverse().join("");
  return btoa(reversed);
}

export function deobfuscateKey(obfuscatedKey: string): string {
  try {
    const reversed = atob(obfuscatedKey);
    const combined = reversed.split("").reverse().join("");
    const parts = combined.split(":");
    if (parts[0] !== VAULT_SALT) throw new Error("Salt mismatch");
    return parts.slice(1).join(":");
  } catch (e) {
    console.error("Failed to decrypt vault key", e);
    return "";
  }
}

const VAULT_STORAGE_KEY = "whatsie_vault";

export function getVaultEntries(): VaultEntry[] {
  try {
    const data = localStorage.getItem(VAULT_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load key vault from localStorage", e);
    return [];
  }
}

export function saveVaultEntry(rawKey: string, balance: number): VaultEntry {
  const entries = getVaultEntries();
  const obfuscated = obfuscateKey(rawKey);
  
  const keyHash = rawKey.length > 12 
    ? `${rawKey.slice(0, 8)}...${rawKey.slice(-4)}`
    : `sk-or-...${rawKey.slice(-4)}`;

  const newEntry: VaultEntry = {
    keyHash,
    obfuscatedKey: obfuscated,
    provider: "openrouter",
    lastVerified: new Date().toISOString(),
    balance
  };

  const filtered = entries.filter(e => deobfuscateKey(e.obfuscatedKey) !== rawKey);
  filtered.unshift(newEntry);
  
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(filtered));
  return newEntry;
}

export function deleteVaultEntry(keyHash: string): void {
  const entries = getVaultEntries();
  const filtered = entries.filter(e => e.keyHash !== keyHash);
  localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(filtered));
}
