import {
  AdjustmentsHorizontalIcon,
  BriefcaseIcon,
  DevicePhoneMobileIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

export type BotStatus = "RUNNING" | "PAUSED" | "WARNING" | "STOPPED";

export interface BotCardProps {
  id?: string;
  name: string;
  phone: string;
  status: BotStatus;
  aiEngine: string;
  activeLeads: string;
  volume: string;
  warningMessage?: string;
  onDelete?: (id: string) => void;
}

export function BotCard({
  id,
  name,
  phone,
  status,
  aiEngine,
  activeLeads,
  volume,
  warningMessage,
  onDelete,
}: BotCardProps) {
  const isStopped = status === "STOPPED";
  const isWarning = status === "WARNING";

  /* ─── Status colours ─── */
  const dotColor =
    status === "RUNNING" ? "bg-[#4ADE80]"
    : status === "STOPPED" ? "bg-[#F87171]"
    : "bg-[#FBBF24]";

  const statusText =
    status === "RUNNING" ? "text-[#4ADE80]"
    : status === "STOPPED" ? "text-[#F87171]"
    : "text-[#FBBF24]";


  return (
    /*
      Card: bg #09090B · radius 8px · padding 20px · subtle white border
      Full-height via flex-col + mt-auto button so all cards in a row align
    */
    <div
      className="flex flex-col w-full h-full"
      style={{
        padding: 20,
      }}
    >
      {/* ── TOP ROW ── */}
      <div className="flex items-center justify-between mb-4">

        {/* WARNING → plain text + icon, no background, no pill */}
        {isWarning && warningMessage ? (
          <div className="flex items-center gap-2 text-[#FBBF24]">
            <ExclamationTriangleIcon
              className="w-4 h-4 shrink-0"
              style={{ strokeWidth: 1.25 }}
            />
            <span className="text-[12px] font-medium">{warningMessage}</span>
          </div>
        ) : (
          /* RUNNING / PAUSED / STOPPED → dot + text, no background */
          <div className="flex items-center gap-[7px]">
            <div className={`w-[5px] h-[5px] rounded-full shrink-0 ${dotColor}`} />
            <span className={`text-[11px] font-semibold uppercase tracking-[0.07em] ${statusText}`}>
              {status}
            </span>
          </div>
        )}

        {/* Sliders and Trash icons */}
        <div className="flex items-center gap-3">
          {onDelete && id && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(id); }}
              className="text-[#606068] hover:text-[#EF4444] transition-colors"
              title="Delete Bot"
            >
              <TrashIcon className="w-[16px] h-[16px]" style={{ strokeWidth: 1.25 }} />
            </button>
          )}
          <button className="text-[#606068] hover:text-white transition-colors">
            <AdjustmentsHorizontalIcon
              className="w-[16px] h-[16px]"
              style={{ strokeWidth: 1.25 }}
            />
          </button>
        </div>
      </div>

      {/* ── BOT IDENTITY ── */}
      <div className="flex items-center gap-4 mb-4">
        {/* 40×40 icon box, radius 10 */}
        <div
          className="flex items-center justify-center shrink-0 text-[#BBBBC4]"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "#131316",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <BriefcaseIcon className="w-[18px] h-[18px]" style={{ strokeWidth: 1.25 }} />
        </div>

        <div className="flex flex-col gap-[3px] min-w-0">
          <h3 className="text-[#EBEBF0] font-semibold text-[15px] leading-tight truncate">
            {name}
          </h3>
          <div className="flex items-center gap-[5px] text-[12px] text-[#909099]">
            <DevicePhoneMobileIcon className="w-[11px] h-[11px] shrink-0" style={{ strokeWidth: 1.25 }} />
            <span className="truncate">{phone}</span>
          </div>
        </div>
      </div>

      {/* ── METRICS PANEL ── */}
      <div
        className="flex items-stretch overflow-hidden"
        style={{
          background: "#101012",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 12,
        }}
      >
        {/* AI Engine */}
        <div
          className="flex flex-col justify-center gap-[5px] flex-1 px-3 py-3"
          style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-[9px] uppercase font-semibold tracking-[0.07em] text-[#7D7D8A]">
            AI Engine
          </span>
          <div className={`flex items-center gap-[5px] text-[12.5px] font-medium ${isStopped ? "text-[#606068]" : "text-[#CCCCD4]"}`}>
            <BoltIcon
              className="w-[12px] h-[12px] shrink-0"
              style={{ strokeWidth: 1.25, color: isStopped ? "#606068" : "#60A5FA" }}
            />
            {aiEngine}
          </div>
        </div>

        {/* Active Leads */}
        <div
          className="flex flex-col justify-center gap-[5px] flex-1 px-3 py-3"
          style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-[9px] uppercase font-semibold tracking-[0.07em] text-[#7D7D8A]">
            Active Leads
          </span>
          <div className={`flex items-center gap-[5px] text-[12.5px] font-medium ${isStopped ? "text-[#606068]" : "text-[#CCCCD4]"}`}>
            <ArrowTrendingUpIcon
              className="w-[12px] h-[12px] shrink-0"
              style={{ strokeWidth: 1.25, color: isStopped ? "#606068" : "#4ADE80" }}
            />
            {isStopped ? "—" : activeLeads}
          </div>
        </div>

        {/* 24H Volume */}
        <div className="flex flex-col justify-center gap-[5px] flex-1 px-3 py-3">
          <span className="text-[9px] uppercase font-semibold tracking-[0.07em] text-[#7D7D8A]">
            24H Volume
          </span>
          <div className={`flex items-center gap-[5px] text-[12.5px] font-medium ${isStopped ? "text-[#606068]" : "text-[#CCCCD4]"}`}>
            <ChartBarIcon
              className="w-[12px] h-[12px] shrink-0"
              style={{ strokeWidth: 1.25, color: isStopped ? "#606068" : isWarning ? "#FBBF24" : "#4ADE80" }}
            />
            {volume}
          </div>
        </div>
      </div>
    </div>
  );
}
