import { CreditCard, ArrowUpRight } from "lucide-react";

export function BillingTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Billing & Usage</h2>
        <p className="text-sm text-zinc-500">Manage your subscription and monitor usage.</p>
      </div>

      {/* Current Plan */}
      <div className="p-5 bg-zinc-900 border border-white/5 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Current Plan</p>
            <p className="text-2xl font-bold text-white mt-1">Professional</p>
          </div>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all">
            Upgrade
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Messages/mo</p>
            <p className="text-lg font-semibold text-white">5,000</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">AI Tokens/mo</p>
            <p className="text-lg font-semibold text-white">100,000</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">Team Members</p>
            <p className="text-lg font-semibold text-white">Unlimited</p>
          </div>
        </div>
      </div>

      {/* Usage Meters */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">This Month's Usage</h3>
        {[
          { label: "Messages", used: 2847, total: 5000, unit: "" },
          { label: "AI Tokens", used: 67420, total: 100000, unit: "" },
          { label: "Storage", used: 1.2, total: 5, unit: "GB" },
        ].map((meter) => {
          const pct = Math.round((meter.used / meter.total) * 100);
          return (
            <div key={meter.label} className="p-4 bg-zinc-900 border border-white/5 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-300">{meter.label}</span>
                <span className="text-sm text-zinc-400">
                  {meter.used.toLocaleString()}{meter.unit} / {meter.total.toLocaleString()}{meter.unit}
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct > 80 ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">{pct}% used</p>
            </div>
          );
        })}
      </div>

      {/* Invoices */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Recent Invoices</h3>
        <div className="space-y-2">
          {[
            { date: "May 1, 2026", amount: "$299.00", status: "paid" },
            { date: "Apr 1, 2026", amount: "$299.00", status: "paid" },
            { date: "Mar 1, 2026", amount: "$299.00", status: "paid" },
          ].map((inv, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-zinc-900 border border-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-300">{inv.date}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-white">{inv.amount}</span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-green-500/10 text-green-400 rounded uppercase">
                  {inv.status}
                </span>
                <button className="text-xs text-zinc-500 hover:text-white transition-colors">Download</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
