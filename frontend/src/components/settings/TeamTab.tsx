import { useState, useEffect } from "react";
import { UserPlus, Trash2, X } from "lucide-react";
import { teamApi } from "../../services/api";
import { toast } from "sonner";

const roleColors: Record<string, string> = {
  admin: "bg-purple-500/10 text-purple-400",
  agent: "bg-blue-500/10 text-blue-400",
  viewer: "bg-zinc-500/10 text-zinc-400",
};

export function TeamTab() {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("agent");

  useEffect(() => {
    let cancelled = false;
    teamApi.list()
      .then((data) => { if (!cancelled) setTeam(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) toast.error("Failed to load team members"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleInvite = async () => {
    try {
      await teamApi.invite(inviteEmail, inviteRole);
      toast.success("Invitation sent");
      const refreshed = await teamApi.list();
      setTeam(Array.isArray(refreshed) ? refreshed : []);
      setInviteEmail("");
      setInviteRole("agent");
      setShowInvite(false);
    } catch {
      toast.error("Failed to send invitation");
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await teamApi.updateRole(userId, role);
      toast.success("Role updated");
      setTeam((prev) => prev.map((m: any) => m.id === userId ? { ...m, role } : m));
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      await teamApi.remove(userId);
      setTeam((prev) => prev.filter((m: any) => m.id !== userId));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Team Members</h2>
          <p className="text-sm text-zinc-500">{team.length} members in your workspace</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Invite User
        </button>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            Loading team members...
          </div>
        ) : team.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            No team members
          </div>
        ) : (
          team.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-300">
                  {member.name.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{member.name}</p>
                  <p className="text-xs text-zinc-500">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${roleColors[member.role]}`}>
                  {member.role}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${member.status === "online" ? "bg-green-500" : "bg-zinc-600"}`} />
                  <span className="text-xs text-zinc-500">{member.lastActive}</span>
                </div>
                <select
                  defaultValue={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value)}
                  className="bg-zinc-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="admin">Admin</option>
                  <option value="agent">Agent</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button onClick={() => handleRemove(member.id)} className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Invite Team Member</h3>
              <button onClick={() => setShowInvite(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                >
                  <option value="admin">Admin — Full access</option>
                  <option value="agent">Agent — Manage conversations & leads</option>
                  <option value="viewer">Viewer — Read-only access</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowInvite(false)} className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-xl transition-all">
                  Cancel
                </button>
                <button onClick={handleInvite} className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all">
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
