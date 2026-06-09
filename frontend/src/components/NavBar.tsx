import { Link, useLocation } from "react-router-dom";
import {
  HomeIcon,
  CpuChipIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  MegaphoneIcon,
  UsersIcon,
  DocumentChartBarIcon,
  UserIcon,
  PuzzlePieceIcon,
} from "@heroicons/react/24/outline";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: "/dashboard", label: "Dashboard", icon: <HomeIcon className="w-5 h-5" /> },
  { path: "/bots", label: "Bots", icon: <CpuChipIcon className="w-5 h-5" /> },
  { path: "/campaigns", label: "Campaigns", icon: <MegaphoneIcon className="w-5 h-5" /> },
  { path: "/leads", label: "Leads", icon: <UserGroupIcon className="w-5 h-5" /> },
  { path: "/contacts", label: "Contacts", icon: <UsersIcon className="w-5 h-5" /> },
  { path: "/conversations", label: "Conversations", icon: <ChatBubbleLeftRightIcon className="w-5 h-5" /> },
  { path: "/analytics", label: "Analytics", icon: <ChartBarIcon className="w-5 h-5" /> },
  { path: "/reports", label: "Reports", icon: <DocumentChartBarIcon className="w-5 h-5" /> },
  { path: "/billing", label: "Billing", icon: <CreditCardIcon className="w-5 h-5" /> },
  { path: "/team", label: "Team", icon: <UserIcon className="w-5 h-5" /> },
  { path: "/integrations", label: "Integrations", icon: <PuzzlePieceIcon className="w-5 h-5" /> },
  { path: "/settings", label: "Settings", icon: <Cog6ToothIcon className="w-5 h-5" /> },
];

export function NavBar() {
  const location = useLocation();

  return (
    <nav className="w-full flex items-center justify-between px-6 md:px-12 lg:px-16 pt-6 bg-transparent relative z-50">
      {/* Logo/Brand */}
      <Link to="/dashboard" className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <span className="text-white font-semibold text-lg hidden md:block">CRM</span>
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center bg-[#141415] rounded-[16px] border border-white/5 p-1.5 gap-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-2 px-3 py-2 rounded-[12px] transition-colors text-sm font-medium ${
              location.pathname === item.path
                ? "bg-[#27272a] text-white"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-[#1f1f22]"
            }`}
          >
            {item.icon}
            <span className="hidden lg:inline">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Right side: Avatar */}
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1f1f22] flex items-center justify-center text-sm font-medium text-zinc-300 ring-1 ring-white/5 hover:ring-white/20 transition-all">
          A
        </button>
      </div>
    </nav>
  );
}
