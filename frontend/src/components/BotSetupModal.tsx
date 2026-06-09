import { useState, useEffect } from "react";
import {
  Cog8ToothIcon,
  XMarkIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { type Workspace, botApi } from "../services/api";

export interface BotSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot?: Workspace | null;
  initialQrUrl?: string | null;
  initialConnectionStatus?: string;
}

export function BotSetupModal({ isOpen, onClose, bot, initialQrUrl, initialConnectionStatus }: BotSetupModalProps) {
  const [status, setStatus] = useState<"waiting" | "connected" | "error">("waiting");
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bot && isOpen) {
       setName(bot.name);
       setSystemPrompt(bot.system_prompt || "You are a helpful sales assistant...");
       setStatus(initialConnectionStatus === 'connected' ? 'connected' : 'waiting');
       setQrUrl(initialQrUrl || null);
    }
  }, [bot, initialConnectionStatus, initialQrUrl, isOpen]);

  // Poll for QR updates
  useEffect(() => {
     if (isOpen && bot && status === 'waiting') {
        let failCount = 0;
        const interval = setInterval(async () => {
           try {
              const res = await botApi.getConnectionStatus(bot.id);
              failCount = 0;
              if (res.sessionInfo?.status === 'connected') {
                 setStatus('connected');
                 setQrUrl(null);
                 clearInterval(interval);
              } else if (res.screenshotUrl) {
                 setQrUrl(`${res.screenshotUrl}&t=${Date.now()}`);
              }
           } catch(e) {
              failCount++;
              if (failCount >= 5) {
                 clearInterval(interval);
                 setStatus('error');
              }
           }
        }, 3000);
        return () => clearInterval(interval);
     }
  }, [isOpen, bot, status]);

  if (!isOpen) return null;

  const handleSave = async () => {
     if (!bot) return;
     setIsSaving(true);
     try {
       await botApi.updateWorkspace(bot.id, {
          name,
          system_prompt: systemPrompt
       });
       onClose();
     } catch (e) {
       console.error("Failed to save", e);
       alert("Failed to save changes.");
     } finally {
       setIsSaving(false);
     }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#000000B3] backdrop-blur-[2px]" 
        onClick={onClose} 
      />

      {/* Modal Container */}
      <div
        className="relative flex flex-col w-full max-w-[500px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{
          background: "#09090B",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.04)] sticky top-0 bg-[#09090B] z-10">
          <div className="flex items-center gap-2 text-[#EBEBF0]">
            <Cog8ToothIcon className="w-[18px] h-[18px]" strokeWidth={1.5} />
            <h2 className="text-[15px] font-semibold tracking-tight">Bot Setup</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-[#7D7D8A] hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col p-4 sm:p-5 gap-5">
          
          {/* Top Row: QR + Quick Connect Badge */}
          <div className="flex flex-col sm:flex-row items-start gap-4">
            
            {/* QR Code Container */}
            <div
              className="relative shrink-0 flex items-center justify-center w-full sm:w-[216px] h-[216px] bg-white rounded-[10px] p-[10px] overflow-hidden"
            >
              {status === 'connected' ? (
                <div className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 transition-all duration-500">
                  <div className="flex items-center justify-center w-[64px] h-[64px] bg-[#22C55E] rounded-full shadow-[0_0_20px_rgba(34,197,94,0.3)]">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-[#22C55E] font-medium text-[14px] tracking-tight">Connected</span>
                </div>
              ) : status === 'error' ? (
                <div className="absolute inset-0 bg-[#09090B] flex flex-col items-center justify-center gap-3">
                  <div className="flex items-center justify-center w-[64px] h-[64px] bg-red-500/20 rounded-full">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </div>
                  <span className="text-red-400 font-medium text-[14px] tracking-tight">Connection Failed</span>
                </div>
              ) : qrUrl && status === 'waiting' ? (
                <img src={qrUrl} alt="WhatsApp QR Code" className="w-full h-full object-contain" />
              ) : (
                <div 
                  className="w-full h-full border border-black"
                  style={{
                    background: `
                      linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee), 
                      linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee)
                    `,
                    backgroundSize: '15px 15px',
                    backgroundPosition: '0 0, 7.5px 7.5px'
                  }}
                >
                  <div className="absolute top-[15px] left-[15px] w-12 h-12 border-[5px] border-black bg-white"><div className="w-4 h-4 bg-black m-[9px]"></div></div>
                  <div className="absolute top-[15px] right-[15px] w-12 h-12 border-[5px] border-black bg-white"><div className="w-4 h-4 bg-black m-[9px]"></div></div>
                  <div className="absolute bottom-[15px] left-[15px] w-12 h-12 border-[5px] border-black bg-white"><div className="w-4 h-4 bg-black m-[9px]"></div></div>
                </div>
              )}
            </div>

            {/* Right side connection badge info */}
            <div className="flex flex-col gap-1 w-full mt-1">
              <label className="text-[12px] font-semibold text-[#EBEBF0]">
                Bot Display Name <span className="font-normal text-[#7D7D8A]">(Preview)</span>
              </label>
              <div 
                className="text-[14px] text-[#A1A1AA] px-3 py-2 flex items-center mb-1 truncate"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6
                }}
              >
                {name || "Sales Assistant (US)"}
              </div>

              {/* Dynamic Status Badge */}
              {status === "waiting" ? (
                <div 
                  className="flex items-center gap-2 px-3 py-[7px]"
                  style={{
                    background: "#182C1F", 
                    border: "1px solid rgba(74,222,128,0.15)",
                    borderRadius: 6
                  }}
                >
                  <svg className="w-[14px] h-[14px] text-[#4ADE80] animate-spin opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  <span className="text-[12.5px] font-medium text-[#4ADE80] opacity-90">Waiting to connect...</span>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-2 px-3 py-[7px]"
                  style={{
                    background: "#1D2E23", 
                    border: "1px solid #1D2E23",
                    borderRadius: 6
                  }}
                >
                  <div className="bg-[#4ADE80] text-[#1D2E23] rounded-full p-[2px]">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <span className="text-[12.5px] font-medium text-[#4ADE80]">Connected successfully</span>
                </div>
              )}

            </div>
          </div>

          {/* Form Fields */}
          <div className="flex flex-col gap-[18px]">
            {/* Input 1 */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-[#EBEBF0]">
                Bot Display Name <span className="font-normal text-[#7D7D8A]">(required)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex items-center justify-between text-[14px] text-[#CCCCD4] px-3 py-[9px] w-full focus:outline-none"
                style={{
                  background: "#131316",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6
                }}
              />
            </div>

            {/* Input 2 */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-[#EBEBF0]">
                AI Model <span className="font-normal text-[#7D7D8A]">(read-only)</span>
              </label>
              <div 
                className="flex items-center justify-between text-[14px] text-[#CCCCD4] px-3 py-[9px]"
                style={{
                  background: "#131316",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6,
                  opacity: 0.7
                }}
              >
                <div className="flex items-center gap-2">
                  <SparklesIcon className="w-4 h-4 text-[#A1A1AA]" strokeWidth={1.5} />
                  <span>{bot?.groq_api_key ? "Groq Configured" : "Llama-3-70b"}</span>
                </div>
              </div>
            </div>

            {/* Textarea */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12px] font-semibold text-[#EBEBF0]">
                System Prompt / Persona <span className="font-normal text-[#7D7D8A]">(required)</span>
              </label>
              <textarea 
                className="w-full text-[13.5px] text-[#A1A1AA] placeholder:text-[#606068] px-3 py-[10px] leading-relaxed resize-none focus:outline-none"
                rows={4}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                style={{
                  background: "#131316",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between gap-3 p-4 sm:p-5 pt-0 sticky bottom-0 bg-[#09090B]">
          <button 
            onClick={onClose}
            className="flex-1 text-[13.5px] font-medium text-[#CCCCD4] hover:text-white transition-colors"
            style={{
              height: 40,
              background: "#1C1C20",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 8
            }}
          >
            Cancel
          </button>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 text-[13.5px] font-medium text-[#EBEBF0] transition-colors"
            style={{
              height: 40,
              background: status === "connected" ? "#1D2E23" : "#182C1F",
              border: status === "connected" ? "1px solid #1D2E23" : "1px solid rgba(74,222,128,0.15)",
              borderRadius: 8,
              opacity: isSaving ? 0.7 : 1,
              cursor: isSaving ? "not-allowed" : "pointer"
            }}
          >
            {isSaving ? "Saving..." : status === "connected" ? "Save (Connected)" : "Save"}
          </button>
        </div>

      </div>
    </div>
  );
}
