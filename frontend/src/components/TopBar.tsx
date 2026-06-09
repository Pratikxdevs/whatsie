import { NavLink } from "react-router-dom";
import { Bot, Users, MessageSquare, BarChart3, CreditCard, UserPlus } from "lucide-react";

const navItems = [
  { to: "/bots", label: "Bots", icon: Bot },
  { to: "/leads", label: "Leads", icon: Users },
  { to: "/conversations", label: "Conversations", icon: MessageSquare },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/onboarding", label: "Onboarding", icon: UserPlus },
];

export function TopBar() {
  return (
    <div className="w-full flex items-center justify-between px-6 md:px-12 lg:px-16 py-4 bg-[#09090b] border-b border-white/5">
      <NavLink to="/" className="text-[#EBEBF0] font-semibold text-[18px] tracking-tight">
        CRM V2
      </NavLink>
      <nav className="flex items-center gap-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isActive
                  ? "bg-[#1f1f22] text-[#EBEBF0]"
                  : "text-[#7D7D8A] hover:text-[#CCCCD4] hover:bg-[#141415]"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="w-8 h-8 rounded-full bg-[#1f1f22] flex items-center justify-center text-sm font-medium text-zinc-300 ring-1 ring-white/5">
        A
      </div>
    </div>
  );
}
