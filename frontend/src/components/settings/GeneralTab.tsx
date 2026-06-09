import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { settingsApi } from "../../services/api";
import { toast } from "sonner";

export function GeneralTab() {
  const [tenantName, setTenantName] = useState("Acme Corp");
  const [aiModel, setAiModel] = useState("groq");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful sales assistant. Qualify leads by asking about budget, timeline, and team size. Be professional and friendly."
  );
  const [timezone, setTimezone] = useState("America/New_York");
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.updateGeneral({ tenantName, aiModel, systemPrompt, timezone, language });
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">General Settings</h2>
        <p className="text-sm text-zinc-500">Configure your workspace and default behavior.</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
            Workspace Name
          </label>
          <input
            type="text"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
            Default AI Model
          </label>
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
          >
            <option value="groq">Groq (Llama 3.1 70B)</option>
            <option value="openai">OpenAI (GPT-4o)</option>
            <option value="gemini">Google (Gemini 2.0 Flash)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
            Default System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Berlin">Berlin (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Asia/Kolkata">India (IST)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 transition-all"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="pt">Portuguese</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold text-sm rounded-xl transition-all"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Changes
      </button>
    </div>
  );
}
