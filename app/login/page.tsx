"use client";

import React, { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Globe, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [systemError, setSystemError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Read error parameter from NextAuth redirection
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "CredentialsSignin") {
      setSystemError("Login failed: Invalid email or password.");
      showToast("Access Denied: Invalid credentials", "error");
    } else if (errorParam) {
      setSystemError(`Authentication error: ${errorParam}`);
      showToast(`Error: ${errorParam}`, "error");
    }
  }, [searchParams, showToast]);

  const validateForm = () => {
    const tempErrors: { email?: string; password?: string } = {};
    if (!email) {
      tempErrors.email = "Email address is required.";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = "Please enter a valid email address.";
    }
    if (!password) {
      tempErrors.password = "Password is required.";
    } else if (password.length < 6) {
      tempErrors.password = "Password must be at least 6 characters.";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSystemError(null);
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setSystemError("Login failed: The email or password is incorrect.");
        showToast("Login Failed", "error");
        setLoading(false);
      } else {
        showToast("Welcome Back.", "success");
        const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setSystemError("System Error: Failed to contact the authentication server.");
      showToast("Connection Failure", "error");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    showToast("Connecting to Google Authentication...", "info");
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (err) {
      console.error(err);
      showToast("Failed to connect to Google", "error");
      setGoogleLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-screen flex items-center justify-center bg-transparent text-zinc-100 relative overflow-hidden px-4">
      {/* Background Ambient Glow Shapes */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full ambient-glow-1 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full ambient-glow-2 blur-[140px] pointer-events-none" />

      {/* Centered Glassmorphic login box */}
      <Card hoverGlow={true} className="w-full max-w-md p-8 bg-[#0a140a]/30 border-[#a3e635]/18 shadow-2xl rounded-2xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-[#a3e635]/10 border border-[#a3e635]/25 flex items-center justify-center text-[#a3e635] shadow-[0_0_15px_rgba(163,230,53,0.1)]">
            <Globe className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white mt-2">Login</h2>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-semibold">Crypto Sentry Account</p>
          </div>
        </div>

        {/* Error panel */}
        {systemError && (
          <div className="p-4 border border-red-500/10 bg-red-950/5 text-red-400 flex items-start space-x-3 text-xs rounded-xl border-l-2 border-l-red-500">
            <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold uppercase tracking-wider">Warning</div>
              <div className="mt-0.5 leading-relaxed">{systemError}</div>
            </div>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              label="Email"
              type="email"
              placeholder="name@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
            />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[38px] text-zinc-600 hover:text-zinc-400 cursor-pointer z-10"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              className="pr-10"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              loading={loading}
              className="w-full rounded-xl py-3"
            >
              Login
            </Button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/5"></div>
          </div>
          <span className="relative bg-[#030e03] px-3 text-[10px] uppercase font-bold text-[#a3e635]/80 tracking-widest z-10">
            or
          </span>
        </div>

        {/* Google login button */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full py-2.5 rounded-xl bg-transparent hover:bg-white/5 text-zinc-300 hover:text-white border border-white/5 hover:border-white/15 font-semibold text-xs transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 select-none active:scale-[0.98] cursor-pointer"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Action Link Footer */}
        <div className="pt-4 border-t border-white/5 text-center flex flex-col space-y-2 text-xs font-semibold">
          <Link
            href="/register"
            className="text-[#a3e635] hover:text-[#b4f246] transition-colors"
          >
            Create Account
          </Link>
          <Link
            href="/dashboard"
            className="text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-wider text-[9px]"
          >
            Continue as Guest
          </Link>
        </div>
      </Card>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen w-screen flex flex-col items-center justify-center p-4 bg-transparent relative">
        <div className="text-zinc-500 font-semibold text-xs uppercase animate-pulse">
          Connecting to gateway...
        </div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
