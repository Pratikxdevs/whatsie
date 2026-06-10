import { useAuth } from "../../contexts/AuthContext";
import { User, Mail, Shield, Building2 } from "lucide-react";

const roleLabels: Record<string, string> = {
  admin: "Administrator",
  agent: "Agent",
  viewer: "Viewer",
};

const roleColors: Record<string, string> = {
  admin: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  agent: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  viewer: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export function ProfileTab() {
  const { user } = useAuth();

  if (!user) return null;

  const initials = user.email
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Profile</h2>
        <p className="text-sm text-zinc-500">Your account information and role.</p>
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-5 p-5 bg-zinc-900 border border-white/5 rounded-xl">
        <div className="w-16 h-16 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-lg font-semibold text-zinc-300">
          {initials}
        </div>
        <div>
          <p className="text-lg font-medium text-white">{user.email.split("@")[0]}</p>
          <p className="text-sm text-zinc-500">{user.email}</p>
        </div>
      </div>

      {/* Info fields */}
      <div className="space-y-4">
        <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
              <User className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">Display Name</p>
              <p className="text-sm text-zinc-200">{user.email.split("@")[0]}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Mail className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">Email</p>
              <p className="text-sm text-zinc-200">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Shield className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">Role</p>
              <span className={`inline-block px-2 py-0.5 text-[11px] font-semibold uppercase rounded border ${roleColors[user.role]}`}>
                {roleLabels[user.role]}
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border border-white/5 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">Workspace</p>
              <p className="text-sm text-zinc-200">{user.companyName}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
