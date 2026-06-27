"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { User, Cpu, Award, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  
  // Profile forms
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      setDisplayName(session.user.email.split("@")[0].toUpperCase());
      const saved = localStorage.getItem("sentry-avatar-" + session.user.email);
      setAvatar(saved);
    }
  }, [session]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarLoading(true);
    showToast("Uploading profile avatar...", "info");

    const reader = new FileReader();
    reader.onloadend = () => {
      // Simulate file upload delay
      setTimeout(() => {
        const base64 = reader.result as string;
        setAvatar(base64);
        if (session?.user?.email) {
          localStorage.setItem("sentry-avatar-" + session.user.email, base64);
          // Dispatch event to sync instantly across navbars/sidebars
          window.dispatchEvent(new Event("sentry-avatar-update"));
        }
        setAvatarLoading(false);
        showToast("Profile avatar updated successfully", "success");
      }, 1200);
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Saving profile details...", "info");
    
    setTimeout(() => {
      showToast("Profile updated successfully", "success");
    }, 1000);
  };

  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white/5 border border-white/5 h-64 animate-pulse rounded-2xl" />
        <div className="bg-white/5 border border-white/5 h-64 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="text-center py-12 text-zinc-500 font-semibold text-sm">
        Redirecting to Live Grid...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header Info Banner */}
      <Card className="border-white/5 bg-[#111116]/40 backdrop-blur-md p-6">
        <h1 className="text-lg font-bold text-zinc-100 flex items-center">
          <User className="w-5 h-5 mr-2.5 text-[#a3e635]" />
          My Profile
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5 font-medium leading-relaxed">
          Manage your profile, upload your photo, and update your display name.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Settings (2/3 width) */}
        <section className="lg:col-span-2">
          <Card className="bg-[#111116]/40 backdrop-blur-md border-white/5 p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 border-b border-white/5 pb-3 flex items-center mb-6">
              <User className="w-4 h-4 mr-2 text-[#a3e635]" />
              Account Credentials
            </h2>

            <form onSubmit={handleProfileSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Registered Email Address"
                  type="email"
                  value={session?.user?.email || ""}
                  disabled
                  className="opacity-50 cursor-not-allowed bg-zinc-950/40 border-white/5"
                />
                
                <Input
                  label="Display Name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="DISPLAY NAME"
                />
              </div>

              {/* Status information fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-zinc-400 pt-2">
                <div className="border border-white/5 bg-zinc-950/20 rounded-xl p-4 flex justify-between items-center">
                  <span>Clearance Level</span>
                  <span className="text-[#a3e635] font-bold bg-[#a3e635]/10 border border-[#a3e635]/25 rounded-md px-2 py-0.5 flex items-center text-[10px] tracking-wider uppercase">
                    <Award className="w-3.5 h-3.5 mr-1" /> STANDARD USER
                  </span>
                </div>
                <div className="border border-white/5 bg-zinc-950/20 rounded-xl p-4 flex justify-between items-center">
                  <span>Status</span>
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/25 rounded-md px-2 py-0.5 text-[10px] tracking-wider uppercase">
                    LOGGED IN
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </section>

        {/* Profile Avatar Upload (1/3 width) */}
        <section className="space-y-6">
          <Card className="flex flex-col items-center justify-center text-center p-6 bg-[#111116]/40 backdrop-blur-md border-white/5">
            <h2 className="w-full text-left text-xs font-bold uppercase tracking-wider text-zinc-300 border-b border-white/5 pb-3 flex items-center mb-6">
              <Cpu className="w-4 h-4 mr-2 text-[#a3e635]" />
              User Profile Image
            </h2>

            {/* Avatar Preview box */}
            <div className="relative group mb-5">
              <div
                className="w-24 h-24 rounded-full border border-white/10 bg-zinc-900 flex items-center justify-center overflow-hidden relative shadow-lg"
              >
                {avatarLoading ? (
                  <div className="absolute inset-0 bg-[#06060a]/80 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-[#a3e635] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-4xl select-none">
                    👤
                  </div>
                )}
              </div>
              
              {/* Floating upload overlay */}
              <label className="absolute bottom-0 right-0 p-2 bg-zinc-950 border border-white/10 rounded-full cursor-pointer hover:border-[#a3e635] hover:shadow-[0_0_12px_rgba(163,230,53,0.3)] transition-all">
                <Upload className="w-3.5 h-3.5 text-zinc-300 hover:text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                  disabled={avatarLoading}
                />
              </label>
            </div>

            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider max-w-[200px] mb-3">
              Upload a profile photo to customize your avatar.
            </p>
          </Card>
        </section>
      </div>
    </div>
  );
}
