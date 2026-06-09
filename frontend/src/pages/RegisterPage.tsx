import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../contexts/AuthContext";
import { registerFormSchema, type RegisterFormInput } from "../schemas/auth";
import { Eye, EyeOff, Loader2, Bot, Check, X } from "lucide-react";

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { label: "Weak", color: "bg-red-500", width: "w-1/4" };
  if (score === 2) return { label: "Fair", color: "bg-yellow-500", width: "w-2/4" };
  if (score === 3) return { label: "Good", color: "bg-blue-500", width: "w-3/4" };
  return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: authRegister } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterFormInput>({
    resolver: zodResolver(registerFormSchema),
  });

  const password = watch("password", "");
  const strength = getPasswordStrength(password);

  const onSubmit = async (data: RegisterFormInput) => {
    const result = await authRegister(data.tenantName, data.email, data.password);
    if (result.success) {
      navigate("/dashboard");
    } else {
      setError("root", { message: result.error || "Registration failed" });
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0c0c0e] border-r border-white/5 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-xl font-semibold text-white">CrmV2</span>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4">
            Start closing deals<br />
            <span className="text-green-400">in minutes, not months</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-md">
            Connect your messaging platforms, deploy AI bots, and watch your
            lead pipeline grow — all from one dashboard.
          </p>
        </div>

        <div className="space-y-3 text-sm text-zinc-400">
          {[
            "Free tier — 100 messages/day",
            "7 platform integrations",
            "AI-powered lead qualification",
            "No credit card required",
          ].map((text) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-green-400" />
              </div>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-bold text-emerald-400 tracking-tight">CrmV2</h1>
          </div>

          <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
          <p className="text-zinc-400 text-sm mb-8">Set up your workspace in under a minute</p>

          {errors.root && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {errors.root.message}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
                Company Name
              </label>
              <input
                type="text"
                {...register("tenantName")}
                placeholder="Acme Corp"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
              />
              {errors.tenantName && (
                <p className="mt-1 text-xs text-red-400">{errors.tenantName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                {...register("email")}
                placeholder="you@company.com"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="Create a strong password"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full ${strength.color} ${strength.width} transition-all duration-300 rounded-full`} />
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">{strength.label}</span>
                </div>
              )}
              {errors.password && (
                <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  {...register("confirmPassword" as any)}
                  placeholder="Confirm your password"
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 mt-0.5 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/50"
              />
              <span className="text-xs text-zinc-400 leading-relaxed">
                I agree to the{" "}
                <button type="button" className="text-green-400 hover:text-green-300">Terms of Service</button>
                {" "}and{" "}
                <button type="button" className="text-green-400 hover:text-green-300">Privacy Policy</button>
              </span>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Create account"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#09090b] px-3 text-zinc-600">or</span>
            </div>
          </div>

          <p className="text-center text-sm text-zinc-400">
            Already have an account?{" "}
            <Link to="/login" className="text-green-400 hover:text-green-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
