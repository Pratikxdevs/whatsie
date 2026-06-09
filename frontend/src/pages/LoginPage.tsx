import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../contexts/AuthContext";
import { Eye, EyeOff, Loader2, Bot } from "lucide-react";
import { loginFormSchema, type LoginFormInput } from "../schemas/auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInput>({
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit = async (data: LoginFormInput) => {
    setServerError("");
    setLoading(true);

    const result = await login(data.email, data.password);
    setLoading(false);

    if (result.success) {
      navigate("/dashboard");
    } else {
      setServerError(result.error || "Login failed");
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
            AI-Powered CRM<br />
            <span className="text-green-400">for Modern Teams</span>
          </h1>
          <p className="text-zinc-400 text-lg max-w-md">
            Manage conversations across 7 messaging platforms with intelligent bots,
            automated workflows, and real-time analytics.
          </p>
        </div>

        <div className="flex items-center gap-5 text-zinc-500 text-xs">
          {[
            { name: "WhatsApp", color: "bg-green-500" },
            { name: "Telegram", color: "bg-blue-500" },
            { name: "Discord", color: "bg-indigo-500" },
            { name: "Messenger", color: "bg-sky-500" },
            { name: "Instagram", color: "bg-pink-500" },
            { name: "Teams", color: "bg-purple-500" },
            { name: "Twitter/X", color: "bg-zinc-300" },
          ].map((p) => (
            <div key={p.name} className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${p.color}`} />
              {p.name}
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

          <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-zinc-400 text-sm mb-8">Sign in to your account to continue</p>

          {serverError && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
                Email
              </label>
              <input
                type="email"
                {...register("email")}
                placeholder="you@company.com"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all"
              />
              {errors.email && (
                <p className="text-[10px] text-red-400 mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                  Password
                </label>
                <button type="button" className="text-xs text-green-400 hover:text-green-300 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="Enter your password"
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
              {errors.password && (
                <p className="text-[10px] text-red-400 mt-1">{errors.password.message}</p>
              )}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-green-500 focus:ring-green-500/50"
              />
              <span className="text-sm text-zinc-400">Remember me for 30 days</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-green-500/50 text-black font-semibold text-sm py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Sign in"}
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
            Don't have an account?{" "}
            <Link to="/register" className="text-green-400 hover:text-green-300 font-medium transition-colors">
              Create account
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
