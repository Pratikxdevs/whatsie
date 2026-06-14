/**
 * Banner that appears when the user has no verified OpenRouter key.
 * Shows inline — AI still routes messages but without AI responses.
 */
import { useAiKeyStatus } from "../../hooks/useAiKeyStatus";
import { Zap, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function AiKeyMissingBanner() {
  const hasKey = useAiKeyStatus();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  // Only show once we know (not while loading) and key is missing
  if (hasKey === null || hasKey || dismissed) return null;

  return (
    <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm px-4 py-2.5 mx-4 mt-3 rounded-xl">
      <Zap size={15} className="shrink-0 text-amber-400" />
      <span className="flex-1">
        <strong className="font-semibold">AI features are disabled.</strong>{" "}
        Add your OpenRouter key to enable smart replies.{" "}
        <button
          onClick={() => navigate("/settings")}
          className="underline underline-offset-2 hover:text-amber-200 transition-colors"
        >
          Go to Settings →
        </button>
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-500 hover:text-amber-300 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
