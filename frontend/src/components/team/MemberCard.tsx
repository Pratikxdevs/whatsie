import { MoreHorizontal, Trash2, ChevronDown } from "lucide-react";
import { useState } from "react";

interface Member {
  id: string;
  name: string;
  email: string;
  role: "admin" | "agent" | "viewer";
  status: "online" | "offline";
  lastActive: string;
}

const roleColors: Record<string, string> = {
  admin: "bg-purple-500/10 text-purple-400",
  agent: "bg-blue-500/10 text-blue-400",
  viewer: "bg-zinc-500/10 text-zinc-400",
};

export function MemberCard({ member }: { member: Member }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-xl">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-300">
            {member.name.split(" ").map((n) => n[0]).join("")}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${member.status === "online" ? "bg-green-500" : "bg-zinc-600"}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{member.name}</p>
          <p className="text-xs text-zinc-500">{member.email}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase rounded ${roleColors[member.role]}`}>
          {member.role}
        </span>
        <span className="text-xs text-zinc-500">{member.lastActive}</span>
        <select
          defaultValue={member.role}
          className="bg-zinc-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="admin">Admin</option>
          <option value="agent">Agent</option>
          <option value="viewer">Viewer</option>
        </select>
        <button className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
