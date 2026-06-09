import { useState } from "react";
import { Key, Copy, Trash2, Plus, Check, Eye, EyeOff } from "lucide-react";

const keys: any[] = [];

export function APIKeysTab() {
  const [showNewKey, setShowNewKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const key = "sk_live_" + Array.from({ length: 32 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("");
    setGeneratedKey(key);
    setShowNewKey(false);
    setNewKeyName("");
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">API Keys</h2>
          <p className="text-sm text-zinc-500">Manage API keys for programmatic access.</p>
        </div>
        <button
          onClick={() => setShowNewKey(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Generate New Key
        </button>
      </div>

      {/* Newly generated key banner */}
      {generatedKey && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <p className="text-sm text-green-400 font-medium mb-2">New API key generated. Copy it now — it won't be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-black/30 rounded text-xs text-zinc-300 font-mono break-all">{generatedKey}</code>
            <button onClick={handleCopy} className="p-2 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-green-400" />}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {keys.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            No API keys
          </div>
        ) : (
          keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <Key className="w-5 h-5 text-zinc-500" />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white">{key.name}</p>
                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                      key.status === "active" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {key.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <code className="text-xs text-zinc-500 font-mono">{key.prefix}</code>
                    <span className="text-xs text-zinc-600">Created {key.created}</span>
                    <span className="text-xs text-zinc-600">Last used {key.lastUsed}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Generate Modal */}
      {showNewKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-4">Generate API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Key"
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNewKey(false)} className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-all">
                  Cancel
                </button>
                <button onClick={handleGenerate} className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all">
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
