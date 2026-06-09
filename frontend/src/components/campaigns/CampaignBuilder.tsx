import { useState } from "react";
import { X, Send, Eye } from "lucide-react";

interface CampaignBuilderProps {
  onClose: () => void;
}

export function CampaignBuilder({ onClose }: CampaignBuilderProps) {
  const [name, setName] = useState("");
  const [template, setTemplate] = useState("Hi {name}, thank you for your interest! Here's the information you requested about {company}'s services.");
  const [platform, setPlatform] = useState("whatsapp");
  const [targetStatus, setTargetStatus] = useState("new");
  const [scheduleDate, setScheduleDate] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Create Campaign</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Sale Outreach"
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Message Template</label>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={4}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50 resize-none"
            />
            <p className="text-[10px] text-zinc-600 mt-1">Variables: {"{name}"}, {"{company}"}, {"{phone}"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Platform</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              >
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Target Status</label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value)}
                className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50"
              >
                <option value="new">New Leads</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="all">All Leads</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Schedule (optional)</label>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-white/5">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-all">
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all">
            <Send className="w-4 h-4" />
            {scheduleDate ? "Schedule" : "Send Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
