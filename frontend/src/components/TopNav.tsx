import { Squares2X2Icon, ListBulletIcon, PlusIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

export interface TopNavProps {
  onAddBotClick?: () => void;
  botCount?: number;
  isCreatingBot?: boolean;
}

export function TopNav({ onAddBotClick, botCount = 0, isCreatingBot = false }: TopNavProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid');

  return (
    <div className="w-full flex items-center justify-between px-6 md:px-12 lg:px-16 pt-6 bg-transparent relative z-50">
      
      {/* Left side: View toggles and bot count in a pill */}
      <div className="flex items-center bg-[#141415] rounded-[16px] border border-white/5 p-1.5 gap-4 md:gap-6 shadow-sm">
        {/* Toggles */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setView('grid')}
            className={`p-2.5 rounded-[12px] transition-colors ${
              view === 'grid' 
                ? 'bg-[#27272a] text-zinc-200' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1f1f22]'
            }`}
          >
            <Squares2X2Icon strokeWidth={2} className="w-5 h-5" />
          </button>
          <button
            onClick={() => setView('list')}
            className={`p-2.5 rounded-[12px] transition-colors ${
              view === 'list' 
                ? 'bg-[#27272a] text-zinc-200' 
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#1f1f22]'
            }`}
          >
            <ListBulletIcon strokeWidth={2} className="w-5 h-5" />
          </button>
        </div>

        {/* Bot Count */}
        <div className="flex items-center gap-4 shrink-0 pr-3">
          <div className="text-[15px] font-medium text-zinc-400 whitespace-nowrap">
            {botCount} Bots
          </div>
        </div>
      </div>

      {/* Right side: Add New Bot Button and Avatar */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onAddBotClick}
          disabled={isCreatingBot}
          className={`flex items-center gap-2 bg-[#141415] hover:bg-[#1f1f22] transition-colors px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-[12px] ring-1 ring-white/5 shadow-sm text-[14px] sm:text-[15px] font-medium text-zinc-200 hover:text-white shrink-0 ${isCreatingBot ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isCreatingBot ? (
            <ArrowPathIcon strokeWidth={2.5} className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
          ) : (
            <PlusIcon strokeWidth={2.5} className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
          <span className="hidden sm:inline">{isCreatingBot ? 'Creating...' : 'Add New Bot'}</span>
        </button>

        {/* Original vertical divider and avatar */}
        <div className="w-px h-6 bg-white/5 hidden sm:block"></div>
        <button className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#1f1f22] items-center justify-center text-sm font-medium text-zinc-300 ring-1 ring-white/5 hover:ring-white/20 transition-all hidden sm:flex">
          A
        </button>
      </div>
      
    </div>
  );
}
