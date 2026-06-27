"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Settings, ShieldAlert, Sparkles, Volume2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toast";
import { useTour } from "@/components/tour-provider";

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const { startTour } = useTour();

  // Settings State
  const [crashThreshold, setCrashThreshold] = useState(2);
  const [audioAlerts, setAudioAlerts] = useState(true);
  const [pollInterval, setPollInterval] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  // Load preferences from API & localStorage on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.crashThreshold !== undefined) setCrashThreshold(data.crashThreshold);
          if (data.pollInterval !== undefined) setPollInterval(data.pollInterval);
        }
      } catch (err) {
        console.error("Failed to load settings from database:", err);
      }
    };

    if (status === "authenticated") {
      fetchSettings();
    }

    const savedAudio = localStorage.getItem("sentry-audio-alerts");

    if (savedAudio) setAudioAlerts(savedAudio === "true");
  }, [status]);

  const handleCommitChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    showToast("Saving settings...", "info");

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crashThreshold,
          pollInterval,
        }),
      });

      if (res.ok) {
        // Save local delivery choices
        localStorage.setItem("sentry-audio-alerts", audioAlerts.toString());
        
        showToast("Settings saved successfully", "success");
      } else {
        showToast("Failed to save settings to server", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Network fault: Failed to commit changes", "error");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/5 border border-white/5 h-64 animate-pulse rounded-2xl" />
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
          <Settings className="w-5 h-5 mr-2.5 text-[#a3e635]" />
          System Configuration
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5 font-medium leading-relaxed">
          Configure price drops thresholds, polling speeds, and telemetry delivery channels.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Threshold Adjustment Forms */}
        <section className="space-y-6">
          <Card className="bg-[#111116]/40 backdrop-blur-md border-white/5 p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 border-b border-white/5 pb-3 flex items-center mb-6">
              <ShieldAlert className="w-4 h-4 mr-2 text-[#a3e635]" />
              Surveillance Threshold Rules
            </h2>

            <form onSubmit={handleCommitChanges} className="space-y-6">
              <Slider
                label="Crash Alert Trigger"
                min={1}
                max={15}
                unit="%"
                value={crashThreshold}
                onChange={setCrashThreshold}
              />
              <p className="text-[10px] text-zinc-500 font-medium uppercase leading-relaxed">
                * Records alert logs if a tracked coin drops by this percentage or more in a 10s poll cycle.
              </p>

              <Slider
                label="Poll Interval Speed"
                min={5}
                max={60}
                unit="s"
                value={pollInterval}
                onChange={setPollInterval}
              />
              <p className="text-[10px] text-zinc-500 font-medium uppercase leading-relaxed">
                * Query update interval from price cache nodes. Recommended: 10s.
              </p>

              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">Commit rules</span>
                <Button type="submit" loading={loading}>
                  Save Settings
                </Button>
              </div>
            </form>
          </Card>
        </section>

        {/* Channels & Onboarding section */}
        <section className="space-y-6">
          <Card className="bg-[#111116]/40 backdrop-blur-md border-white/5 p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300 border-b border-white/5 pb-3 flex items-center mb-6">
              <Volume2 className="w-4 h-4 mr-2 text-[#a3e635]" />
              Delivery Channels
            </h2>

            <div className="space-y-5">
              <Toggle
                label="Audio warnings logs"
                checked={audioAlerts}
                onChange={setAudioAlerts}
              />
              
              <div className="pt-5 border-t border-white/5 space-y-3.5">
                <h3 className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">Onboarding Guide</h3>
                <p className="text-[10px] text-zinc-500 font-medium uppercase leading-relaxed">
                  Re-execute the spotlight onboarding tour of the desk user interfaces.
                </p>
                <Button
                  onClick={startTour}
                  variant="outlined"
                  className="w-full flex items-center justify-center space-x-2 rounded-xl"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#a3e635]" />
                  <span>Replay Onboarding Tour</span>
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
