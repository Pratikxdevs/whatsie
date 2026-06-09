import { Check } from 'lucide-react';

interface PlanCardProps {
  name: string;
  price: number;
  period: string;
  features: string[];
  isCurrent: boolean;
  popular: boolean;
}

export function PlanCard({ name, price, period, features, isCurrent, popular }: PlanCardProps) {
  return (
    <div
      className={`bg-[#0f0f11] rounded-lg border p-6 flex flex-col ${
        isCurrent
          ? 'border-green-500/30 ring-1 ring-green-500/10'
          : 'border-white/5'
      }`}
    >
      {popular && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-green-400 bg-green-500/10 px-2 py-0.5 rounded self-start mb-3">
          Popular
        </span>
      )}
      <h3 className="text-lg font-semibold text-white">{name}</h3>
      <div className="mt-2 mb-4">
        <span className="text-3xl font-bold text-white">${price}</span>
        {price > 0 && <span className="text-sm text-zinc-500">/{period}</span>}
        {price === 0 && <span className="text-sm text-zinc-500 ml-1">forever</span>}
      </div>

      <ul className="space-y-2 flex-1 mb-6">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-zinc-400">
            <Check className="w-4 h-4 text-green-400 shrink-0" />
            {feature}
          </li>
        ))}
      </ul>

      <button
        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          isCurrent
            ? 'bg-zinc-800 text-zinc-400 cursor-default'
            : 'bg-green-500 hover:bg-green-400 text-black'
        }`}
        disabled={isCurrent}
      >
        {isCurrent ? 'Current Plan' : price === 0 ? 'Downgrade' : 'Upgrade'}
      </button>
    </div>
  );
}
