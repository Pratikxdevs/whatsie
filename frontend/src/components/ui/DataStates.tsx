/**
 * Reusable empty, error, and loading state components for data pages.
 */
import { AlertCircle, RefreshCw, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-zinc-700/40 flex items-center justify-center mb-4">
        {icon ?? <Inbox className="w-6 h-6 text-zinc-500" />}
      </div>
      <h3 className="text-base font-semibold text-zinc-300 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-xs">{description}</p>
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      <h3 className="text-base font-semibold text-zinc-300 mb-1">Something went wrong</h3>
      <p className="text-sm text-zinc-500 max-w-xs mb-5">
        {message ?? "Failed to load data. Please try again."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium px-4 py-2 rounded-xl transition-all"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded w-1/3 mb-3" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-3 bg-zinc-800/70 rounded mb-2" style={{ width: `${80 - i * 10}%` }} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
