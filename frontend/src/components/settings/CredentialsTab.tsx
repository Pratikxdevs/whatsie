import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Key,
  Trash2,
  Plus,
  Star,
  StarOff,
  Eye,
  EyeOff,
  X,
  Loader2,
  Shield,
} from "lucide-react";
import { credentialApi, type Credential } from "../../services/api";
import { credentialFormSchema, type CredentialFormInput } from "../../schemas/credentials";

const PROVIDERS = [
  { value: "groq", label: "Groq" },
  { value: "openai", label: "OpenAI" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "gemini", label: "Google Gemini" },
  { value: "evolution", label: "Evolution API" },
  { value: "telegram", label: "Telegram" },
  { value: "discord", label: "Discord" },
  { value: "twitter", label: "Twitter/X" },
];

const providerColors: Record<string, string> = {
  groq: "bg-orange-500/10 text-orange-400",
  openai: "bg-emerald-500/10 text-emerald-400",
  openrouter: "bg-blue-500/10 text-blue-400",
  gemini: "bg-purple-500/10 text-purple-400",
  evolution: "bg-cyan-500/10 text-cyan-400",
  telegram: "bg-sky-500/10 text-sky-400",
  discord: "bg-indigo-500/10 text-indigo-400",
  twitter: "bg-zinc-500/10 text-zinc-400",
};

function maskKey(key: string): string {
  if (!key || key.length < 8) return "****";
  return key.slice(0, 4) + "****" + key.slice(-4);
}

export function CredentialsTab() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CredentialFormInput>({
    resolver: zodResolver(credentialFormSchema),
    defaultValues: {
      provider: "groq",
      keyName: "",
      keyValue: "",
      isDefault: false,
    },
  });

  const fetchCredentials = useCallback(async () => {
    try {
      setLoading(true);
      const data = await credentialApi.list();
      setCredentials(data);
    } catch {
      setError("Failed to load credentials.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const onSubmit = async (data: CredentialFormInput) => {
    try {
      setSubmitting(true);
      setError(null);
      await credentialApi.create(data);
      reset();
      setShowForm(false);
      await fetchCredentials();
    } catch {
      setError("Failed to create credential. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await credentialApi.remove(id);
      setDeletingId(null);
      await fetchCredentials();
    } catch {
      setError("Failed to delete credential.");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await credentialApi.setDefault(id);
      await fetchCredentials();
    } catch {
      setError("Failed to set default.");
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">
            Credentials
          </h2>
          <p className="text-sm text-zinc-500">
            Manage API keys for AI providers and integrations.
          </p>
        </div>
        <button
          onClick={() => {
            reset();
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Key
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-zinc-500 text-sm gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading credentials...
        </div>
      ) : credentials.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 text-sm gap-3">
          <Shield className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-400 font-medium">
            No API keys configured yet.
          </p>
          <p className="text-zinc-600">
            Add your first key to get started.
          </p>
        </div>
      ) : (
        /* Credentials list */
        <div className="space-y-2">
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-xl"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Key className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">
                      {cred.keyName}
                    </p>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                        providerColors[cred.provider] ||
                        "bg-zinc-500/10 text-zinc-400"
                      }`}
                    >
                      {cred.provider}
                    </span>
                    {cred.isDefault && (
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-yellow-500/10 text-yellow-400">
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-xs text-zinc-500 font-mono">
                      {visibleKeys[cred.id]
                        ? cred.keyValue
                        : maskKey(cred.keyValue)}
                    </code>
                    <button
                      onClick={() => toggleKeyVisibility(cred.id)}
                      className="p-0.5 text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      {visibleKeys[cred.id] ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!cred.isDefault && (
                  <button
                    onClick={() => handleSetDefault(cred.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-500 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                    title="Set as default"
                  >
                    <Star className="w-3.5 h-3.5" />
                    Default
                  </button>
                )}
                {cred.isDefault && (
                  <span className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg">
                    <StarOff className="w-3.5 h-3.5" />
                    Default
                  </span>
                )}

                {deletingId === cred.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-red-400 mr-1">Delete?</span>
                    <button
                      onClick={() => handleDelete(cred.id)}
                      className="px-2 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setDeletingId(null)}
                      className="px-2 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeletingId(cred.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Key Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Add API Key
              </h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Provider */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
                  Provider
                </label>
                <select
                  {...register("provider")}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                {errors.provider && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.provider.message}</p>
                )}
              </div>

              {/* Key Name */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
                  Key Name
                </label>
                <input
                  type="text"
                  {...register("keyName")}
                  placeholder="e.g. Production Groq Key"
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
                />
                {errors.keyName && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.keyName.message}</p>
                )}
              </div>

              {/* Key Value */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
                  API Key
                </label>
                <input
                  type="text"
                  {...register("keyValue")}
                  placeholder="sk-..."
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all font-mono"
                />
                {errors.keyValue && (
                  <p className="text-[10px] text-red-400 mt-1">{errors.keyValue.message}</p>
                )}
              </div>

              {/* Set as Default */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("isDefault")}
                  className="w-4 h-4 rounded border-white/20 bg-zinc-800 text-green-500 focus:ring-green-500/50"
                />
                <span className="text-sm text-zinc-400">Set as default</span>
              </label>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold text-sm rounded-xl transition-all"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Add Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
