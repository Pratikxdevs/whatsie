import { useState, useEffect } from "react";
import { MemberCard } from "../components/team/MemberCard";
import { InviteModal } from "../components/team/InviteModal";
import { teamApi } from "../services/api";
import { UserPlus } from "lucide-react";
import heroBg from "../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png";
import { toast } from "sonner";

export function TeamPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    teamApi.list()
      .then((data) => { if (!cancelled) setMembers(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) toast.error("Failed to load team members"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen" style={{ backgroundImage: `url('${heroBg}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex-1 flex flex-col justify-end pb-8">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-white font-semibold leading-[0.92] tracking-[-0.02em]" style={{ fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.92 }}>TEAM</h1>
              <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">Manage your workspace team members and roles.</p>
            </div>
            <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 px-5 py-2.5 bg-green-500 hover:bg-green-400 text-black font-semibold text-sm rounded-xl transition-all">
              <UserPlus className="w-4 h-4" /> Invite Member
            </button>
          </div>
        </div>
      </div>

      <div className="w-full px-6 md:px-12 lg:px-16 py-6 md:py-8 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Total Members", value: members.length },
            { label: "Online Now", value: members.filter((m) => m.status === "online").length },
            { label: "Admins", value: members.filter((m) => m.role === "admin").length },
          ].map((s) => (
            <div key={s.label} className="p-4 bg-[#0f0f11] border border-white/5 rounded-xl">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Member List */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            Loading team members...
          </div>
        ) : members.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            No team members
          </div>
        ) : (
          members.map((m) => <MemberCard key={m.id} member={m} />)
        )}
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvite={async (email, role) => {
            try {
              await teamApi.invite(email, role);
              toast.success("Invitation sent");
              const refreshed = await teamApi.list();
              setMembers(Array.isArray(refreshed) ? refreshed : []);
            } catch {
              toast.error("Failed to send invitation");
            }
          }}
        />
      )}
    </div>
  );
}
