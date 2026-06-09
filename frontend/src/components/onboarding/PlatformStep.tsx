import { useState } from "react";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";

interface PlatformStepProps {
  onNext: (data: { platform: string }) => void;
  onBack: () => void;
}

const platforms = [
  { id: "whatsapp", name: "WhatsApp", color: "border-[#25D366]/30 hover:border-[#25D366]", bgColor: "bg-[#25D366]/10", textColor: "text-[#25D366]" },
];

export function PlatformStep({ onNext, onBack }: PlatformStepProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">Choose Your Platform</h2>
        <p className="text-zinc-400">Select the messaging platform you want to connect first.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {platforms.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={`relative p-5 rounded-xl border-2 transition-all ${
              selected === p.id
                ? `${p.color} ${p.bgColor}`
                : "border-white/5 hover:border-white/10 bg-zinc-900"
            }`}
          >
            {selected === p.id && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-black" />
              </div>
            )}
            <div className={`w-12 h-12 rounded-xl ${p.bgColor} flex items-center justify-center mx-auto mb-3`}>
              <span className={`text-xl font-bold ${p.textColor}`}>{p.name[0]}</span>
            </div>
            <p className="text-sm font-medium text-white text-center">{p.name}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={() => selected && onNext({ platform: selected })}
          disabled={!selected}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold rounded-xl transition-all"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
