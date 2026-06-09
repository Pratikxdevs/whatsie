import { useState } from "react";
import { Building2, Upload, ArrowRight } from "lucide-react";

interface WelcomeStepProps {
  onNext: (data: { companyName: string }) => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  const [companyName, setCompanyName] = useState("");

  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
        <Building2 className="w-8 h-8 text-green-400" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to CrmV2</h2>
      <p className="text-zinc-400 mb-8">Let's set up your workspace. You can change these settings later.</p>

      <div className="space-y-4 text-left">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Company Name</label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Acme Corp"
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Logo (optional)</label>
          <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-white/20 transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500">Click to upload or drag and drop</p>
            <p className="text-xs text-zinc-600 mt-1">PNG, JPG up to 2MB</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => onNext({ companyName: companyName || "My Company" })}
        disabled={!companyName}
        className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold rounded-xl transition-all"
      >
        Get Started
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
