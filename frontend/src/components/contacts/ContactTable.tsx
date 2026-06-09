import { formatDistanceToNow } from "date-fns";
import { TagBadge } from "./TagBadge";
import { MessageCircle, Send, Headphones, MessageSquare, Camera, Users, Bird } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  tags: string[];
  leadStatus: string;
  platforms: string[];
  lastInteraction: string;
  avatar?: string;
}

interface ContactTableProps {
  contacts: Contact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
}

const platformIcons: Record<string, { icon: any; color: string }> = {
  whatsapp: { icon: MessageCircle, color: "text-[#25D366]" },
  telegram: { icon: Send, color: "text-[#0088cc]" },
  discord: { icon: Headphones, color: "text-[#5865F2]" },
  messenger: { icon: MessageSquare, color: "text-[#0078FF]" },
  instagram: { icon: Camera, color: "text-[#E4405F]" },
  teams: { icon: Users, color: "text-[#6264A7]" },
  twitter: { icon: Bird, color: "text-[#1DA1F2]" },
};

const statusColors: Record<string, string> = {
  new: "bg-zinc-500/15 text-zinc-400",
  contacted: "bg-blue-500/15 text-blue-400",
  qualified: "bg-yellow-500/15 text-yellow-400",
  converted: "bg-green-500/15 text-green-400",
  lost: "bg-red-500/15 text-red-400",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ContactTable({
  contacts,
  selectedId,
  onSelect,
  page,
  perPage,
  total,
  onPageChange,
}: ContactTableProps) {
  const totalPages = Math.ceil(total / perPage);

  return (
    <div className="bg-[#0f0f11] border border-white/5 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Contact</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Company</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Phone</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Platforms</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Status</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Tags</th>
              <th className="text-left py-3 px-4 text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">Last Interaction</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                onClick={() => onSelect(contact.id)}
                className={`border-b border-white/5 hover:bg-[#141415] cursor-pointer transition-colors ${
                  selectedId === contact.id ? "bg-[#1f1f22]" : ""
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-medium text-zinc-300 flex-shrink-0">
                      {getInitials(contact.name)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{contact.name}</p>
                      <p className="text-[11px] text-zinc-500">{contact.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-zinc-300">{contact.company}</td>
                <td className="py-3 px-4 text-zinc-400 font-mono text-xs">{contact.phone}</td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    {contact.platforms.map((p) => {
                      const cfg = platformIcons[p];
                      if (!cfg) return null;
                      const Icon = cfg.icon;
                      return (
                        <div key={p} className={`p-1 rounded ${cfg.color}`} title={p}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                      );
                    })}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium ${statusColors[contact.leadStatus] || statusColors.new}`}>
                    {contact.leadStatus}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1">
                    {contact.tags.slice(0, 2).map((tag) => (
                      <TagBadge key={tag} tag={tag} />
                    ))}
                    {contact.tags.length > 2 && (
                      <span className="text-[10px] text-zinc-500">+{contact.tags.length - 2}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-zinc-500 text-xs">
                  {formatDistanceToNow(new Date(contact.lastInteraction), { addSuffix: true })}
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-500 text-sm">
                  No contacts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
          <span className="text-xs text-zinc-500">
            Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total} contacts
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 rounded-md text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                  p === page
                    ? "bg-green-500/15 text-green-400 border border-green-500/20"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded-md text-xs text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
