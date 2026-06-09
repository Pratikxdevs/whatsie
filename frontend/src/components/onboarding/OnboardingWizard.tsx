import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { type Workspace, botApi } from "../../services/api";

const STEPS = [
  { label: "Welcome", number: 1 },
  { label: "Create Bot", number: 2 },
  { label: "Configure", number: 3 },
  { label: "Connect", number: 4 },
  { label: "Complete", number: 5 },
];

const DEFAULT_SYSTEM_PROMPT = "You are a helpful sales assistant...";

export function OnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [botName, setBotName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [createdBot, setCreatedBot] = useState<Workspace | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>("STARTING");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start polling when entering step 3 (Connect)
  useEffect(() => {
    if (currentStep !== 3 || !createdBot) return;

    let failCount = 0;
    const poll = async () => {
      try {
        const res = await botApi.getConnectionStatus(createdBot.id);
        failCount = 0;
        if (res.sessionInfo?.status === "connected") {
          setConnectionStatus("connected");
          setQrUrl(null);
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (res.screenshotUrl) {
          setQrUrl(`${res.screenshotUrl}&t=${Date.now()}`);
          setConnectionStatus(res.sessionInfo?.status || "SCAN_QR_CODE");
        }
      } catch {
        failCount++;
        if (failCount >= 5) {
          if (pollRef.current) clearInterval(pollRef.current);
          setConnectionStatus("error");
        }
      }
    };

    // Initial poll
    poll();
    pollRef.current = setInterval(poll, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [currentStep, createdBot]);

  // Auto-advance to Complete when connected
  useEffect(() => {
    if (currentStep === 3 && connectionStatus === "connected") {
      const timer = setTimeout(() => setCurrentStep(4), 1500);
      return () => clearTimeout(timer);
    }
  }, [currentStep, connectionStatus]);

  const canGoNext = () => {
    if (currentStep === 0) return true;
    if (currentStep === 1) return botName.trim().length > 0;
    if (currentStep === 2) return systemPrompt.trim().length > 0;
    return false;
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      // Moving from Create Bot to Configure — nothing to do yet
    }
    if (currentStep === 2) {
      // Moving from Configure to Connect — create the workspace
      try {
        const ws = await botApi.createWorkspace(botName.trim());
        setCreatedBot(ws);
        setConnectionStatus(ws.whatsapp_status || "STARTING");
      } catch (err) {
        console.error("Failed to create workspace", err);
        return;
      }
    }
    setCurrentStep((s) => Math.min(s + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  };

  const handleSkip = () => {
    setCurrentStep((s) => Math.min(s + 1, 4));
  };

  // ── Step Indicator ────────────────────────────────────────────────
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = i < currentStep;
        return (
          <div key={step.number} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white"
                  : isCompleted
                    ? "bg-green-600 text-white"
                    : "bg-zinc-800 text-zinc-500"
              }`}
            >
              {isCompleted ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-1 ${
                  isCompleted ? "bg-green-600" : "bg-zinc-800"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // ── Step Content ──────────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold text-zinc-200">
              Welcome to CrmV2
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              Set up your first AI-powered WhatsApp sales bot in just a few
              steps. We will guide you through naming, configuring, and
              connecting your bot.
            </p>
            <button
              onClick={handleNext}
              className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Get Started
            </button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-200">
              Name your bot
            </h2>
            <p className="text-zinc-400 text-sm">
              Choose a display name for your WhatsApp sales bot.
            </p>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              placeholder="e.g. Sales Assistant (US)"
              className="w-full px-3 py-2.5 bg-[#141415] border border-white/5 rounded-lg text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-200">
              Configure your bot
            </h2>
            <p className="text-zinc-400 text-sm">
              Define how your bot should behave when talking to customers.
            </p>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              System Prompt / Persona
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 bg-[#141415] border border-white/5 rounded-lg text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-600 transition-colors resize-none leading-relaxed"
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 text-center">
            <h2 className="text-lg font-semibold text-zinc-200">
              Connect WhatsApp
            </h2>
            <p className="text-zinc-400 text-sm">
              Scan the QR code with WhatsApp to link your bot.
            </p>

            {/* QR Code Area */}
            <div className="flex justify-center">
              <div className="relative w-52 h-52 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                {connectionStatus === "connected" ? (
                  <div className="absolute inset-0 bg-[#09090b] flex flex-col items-center justify-center gap-3">
                    <div className="flex items-center justify-center w-14 h-14 bg-green-600 rounded-full">
                      <svg
                        className="w-7 h-7 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <span className="text-green-400 font-medium text-sm">
                      Connected!
                    </span>
                  </div>
                ) : qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="WhatsApp QR Code"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-zinc-500 text-sm">
                    Waiting for QR code...
                  </div>
                )}
              </div>
            </div>

            {/* Status badge */}
            <div className="flex justify-center">
              {connectionStatus === "connected" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-900/30 border border-green-800/40 rounded-full text-green-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-800 border border-white/5 rounded-full text-zinc-400 text-xs font-medium">
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-pulse" />
                  Waiting to connect...
                </span>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="flex items-center justify-center w-16 h-16 bg-green-600 rounded-full">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-zinc-200">
              You're all set!
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              Your bot <span className="text-zinc-200 font-medium">{botName}</span> is
              connected and ready to start handling customer conversations.
            </p>
            <button
              onClick={() => navigate("/bots")}
              className="mt-4 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        );
    }
  };

  // ── Navigation Buttons ────────────────────────────────────────────
  const showBack = currentStep > 0 && currentStep < 4;
  const showNext = currentStep >= 1 && currentStep <= 2;
  const showSkip = currentStep === 1 || currentStep === 2;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {renderStepIndicator()}

      <div className="bg-[#141415] border border-white/5 rounded-xl p-6 min-h-[280px] flex flex-col justify-center">
        {renderStep()}
      </div>

      {/* Navigation Row */}
      {(showBack || showNext || showSkip) && (
        <div className="flex items-center justify-between mt-4">
          <div>
            {showBack && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {showSkip && (
              <button
                onClick={handleSkip}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Skip
              </button>
            )}
            {showNext && (
              <button
                onClick={handleNext}
                disabled={!canGoNext()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
