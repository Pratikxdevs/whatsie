import { X } from "lucide-react";

const tagColors: Record<string, string> = {
  vip: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  enterprise: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  startup: "bg-green-500/15 text-green-400 border-green-500/20",
  premium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  churned: "bg-red-500/15 text-red-400 border-red-500/20",
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  lead: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  customer: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  partner: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  prospect: "bg-orange-500/15 text-orange-400 border-orange-500/20",
};

const defaultColor = "bg-zinc-500/15 text-zinc-400 border-zinc-500/20";

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
}

export function TagBadge({ tag, onRemove }: TagBadgeProps) {
  const color = tagColors[tag.toLowerCase()] || defaultColor;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${color}`}>
      {tag}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}
    </span>
  );
}
