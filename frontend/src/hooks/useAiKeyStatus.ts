/**
 * Hook that checks whether the user has a verified OpenRouter key.
 * Used to drive the "AI features disabled" banner.
 */
import { useState, useEffect } from "react";
import { credentialApi } from "../services/api";

export function useAiKeyStatus() {
  const [hasKey, setHasKey] = useState<boolean | null>(null); // null = loading

  useEffect(() => {
    credentialApi
      .list()
      .then((creds) => {
        const hasOrKey = creds.some((c) => c.provider === "openrouter" && c.keyValue);
        setHasKey(hasOrKey);
      })
      .catch(() => {
        // If we can't check, assume key exists to avoid false warnings
        setHasKey(true);
      });
  }, []);

  return hasKey;
}
