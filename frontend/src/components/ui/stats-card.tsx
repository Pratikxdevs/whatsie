import { cn } from "../../lib/utils";
import type { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function StatsCard({ label, value, change, trend = "neutral", icon, className, onClick }: StatsCardProps) {
  const trendColors = {
    up: "text-green-400",
    down: "text-red-400",
    neutral: "text-zinc-500",
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex flex-col justify-between gap-2 p-4 rounded-xl bg-zinc-900 border border-white/5 hover:border-white/10 transition-all min-h-[120px]",
        onClick && "cursor-pointer hover:bg-zinc-800/50",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">{label}</span>
        {icon && <div className="text-zinc-600">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-white">{value}</span>
        {change && (
          <span className={cn("flex items-center gap-1 text-xs font-medium", trendColors[trend])}>
            <TrendIcon className="w-3 h-3" />
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

interface StatsGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  const colClasses = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    6: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  };

  return (
    <div className={cn("grid gap-3", colClasses[columns], className)}>
      {children}
    </div>
  );
}
