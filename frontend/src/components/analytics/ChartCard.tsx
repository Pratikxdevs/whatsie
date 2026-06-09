import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  controls?: ReactNode;
}

export function ChartCard({ title, description, children, className = '', controls }: ChartCardProps) {
  return (
    <div className={`bg-[#0f0f11] rounded-lg border border-white/5 ${className}`}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
        </div>
        {controls && <div className="flex items-center gap-2">{controls}</div>}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}
