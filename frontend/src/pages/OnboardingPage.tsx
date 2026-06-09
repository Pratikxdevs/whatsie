import { useState } from "react";
import { WelcomeStep } from "../components/onboarding/WelcomeStep";
import { PlatformStep } from "../components/onboarding/PlatformStep";
import { BotStep } from "../components/onboarding/BotStep";
import { CompleteStep } from "../components/onboarding/CompleteStep";
import { Check } from "lucide-react";
import heroBg from "../assets/ChatGPT Image Apr 6, 2026, 02_58_13 AM.png";

const steps = [
  { id: 1, label: "Welcome" },
  { id: 2, label: "Platform" },
  { id: 3, label: "Bot" },
  { id: 4, label: "Complete" },
];

export function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: "",
    platform: "",
    botName: "",
    systemPrompt: "",
    aiModel: "groq",
  });

  const handleNext = (data: Record<string, string>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    setCurrentStep((s) => s - 1);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-white/10 overflow-x-hidden">
      <div className="relative w-full h-[280px] md:h-[320px] overflow-hidden flex flex-col border-b border-white/5">
        <div className="absolute inset-0 w-full h-full bg-no-repeat bg-cover bg-center opacity-30 mix-blend-screen" style={{ backgroundImage: `url('${heroBg}')` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex-1 flex flex-col justify-end pb-8">
          <h1 className="text-white font-semibold leading-[0.92] tracking-[-0.02em]" style={{ fontSize: "clamp(52px, 9vw, 108px)", lineHeight: 0.92 }}>GET STARTED</h1>
          <p className="text-zinc-400 mt-4 text-lg md:text-xl max-w-2xl">Set up your first bot in minutes. Follow the wizard to connect your platforms.</p>
        </div>
      </div>

      <div className="w-full px-6 md:px-12 lg:px-16 py-6 md:py-8">
        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="flex items-center justify-between">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep > step.id
                      ? "bg-green-500 text-black"
                      : currentStep === step.id
                      ? "bg-green-500/20 text-green-400 border border-green-500/50"
                      : "bg-zinc-800 text-zinc-500"
                  }`}>
                    {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <span className={`text-xs font-medium hidden md:block ${
                    currentStep >= step.id ? "text-white" : "text-zinc-500"
                  }`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 md:w-20 h-0.5 mx-2 ${
                    currentStep > step.id ? "bg-green-500" : "bg-zinc-800"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 && <WelcomeStep onNext={handleNext} />}
        {currentStep === 2 && <PlatformStep onNext={handleNext} onBack={handleBack} />}
        {currentStep === 3 && <BotStep onNext={handleNext} onBack={handleBack} />}
        {currentStep === 4 && <CompleteStep />}
      </div>
    </div>
  );
}
