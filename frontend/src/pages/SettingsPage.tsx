import { useState } from "react";
import heroBg from "../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png";
import { GeneralTab } from "../components/settings/GeneralTab";
import { ProfileTab } from "../components/settings/ProfileTab";
import { TeamTab } from "../components/settings/TeamTab";
import { APIKeysTab } from "../components/settings/APIKeysTab";
import { BillingTab } from "../components/settings/BillingTab";
import { DangerZoneTab } from "../components/settings/DangerZoneTab";
import { Settings, User, Users, Key, CreditCard, AlertTriangle } from "lucide-react";

const tabs = [
  { id: "general", label: "General", icon: Settings },
  { id: "profile", label: "Profile", icon: User },
  { id: "team", label: "Team", icon: Users },
  { id: "api", label: "API Keys", icon: Key },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle },
];

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div
          className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen"
          style={{ backgroundImage: `url('${heroBg}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="relative z-20 w-full">
        </div>
        <div className="relative z-10 w-full page-padding flex-1 flex flex-col justify-end pb-8">
          <h1 className="text-white font-semibold leading-[0.92] tracking-[-0.02em]" style={{ fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.92 }}>
            SETTINGS
          </h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">
            Manage your workspace, team, integrations, and billing.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full page-padding py-6 md:py-8">
        <div className="flex gap-4">
          {/* Sidebar Tabs */}
          <div className="w-56 flex-shrink-0">
            <div className="bg-[#0f0f11] border border-white/5 rounded-xl p-2 sticky top-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors text-sm ${
                      activeTab === tab.id
                        ? "bg-white/10 text-white"
                        : "text-zinc-500 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <div className="bg-[#0f0f11] border border-white/5 rounded-xl p-6">
              {activeTab === "general" && <GeneralTab />}
              {activeTab === "profile" && <ProfileTab />}
              {activeTab === "team" && <TeamTab />}
              {activeTab === "api" && <APIKeysTab />}
              {activeTab === "billing" && <BillingTab />}
              {activeTab === "danger" && <DangerZoneTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
