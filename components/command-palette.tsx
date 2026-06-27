"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Terminal, Search, Activity, Bell, Star, User, Settings, LogOut, Sparkles } from "lucide-react";

interface CommandPaletteProps {
  onTriggerTour?: () => void;
}

export function CommandPalette({ onTriggerTour }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setSearch("");
    }
  }, [isOpen]);

  // Click outside close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const commands = [
    {
      category: "Navigation",
      items: [
        {
          name: "Go to Live Grid Dashboard",
          icon: <Activity className="w-4 h-4 text-[#a3e635]" />,
          action: () => {
            router.push("/dashboard");
            setIsOpen(false);
          },
        },
        {
          name: "Go to Alerts Logs",
          icon: <Bell className="w-4 h-4 text-zinc-400" />,
          action: () => {
            router.push("/dashboard/alerts");
            setIsOpen(false);
          },
        },
        {
          name: "Go to My Watchlist",
          icon: <Star className="w-4 h-4 text-[#a3e635]" />,
          action: () => {
            router.push("/dashboard/wishlist");
            setIsOpen(false);
          },
        },
        {
          name: "Go to Account Profile",
          icon: <User className="w-4 h-4 text-zinc-400" />,
          action: () => {
            router.push("/dashboard/profile");
            setIsOpen(false);
          },
        },
        {
          name: "Go to System Settings",
          icon: <Settings className="w-4 h-4 text-zinc-400" />,
          action: () => {
            router.push("/dashboard/settings");
            setIsOpen(false);
          },
        },
      ],
    },
    {
      category: "System Actions",
      items: [
        {
          name: "Run Onboarding Spotlight Tour",
          icon: <Sparkles className="w-4 h-4 text-[#a3e635] animate-pulse" />,
          action: () => {
            setIsOpen(false);
            if (onTriggerTour) onTriggerTour();
          },
        },
        {
          name: "Disconnect / Sign Out",
          icon: <LogOut className="w-4 h-4 text-red-400" />,
          action: () => {
            setIsOpen(false);
            signOut({ callbackUrl: "/dashboard" });
          },
        },
      ],
    },
  ];

  const filteredCommands = commands
    .map((group) => {
      const filteredItems = group.items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-[#020205]/75 backdrop-blur-md flex items-start justify-center pt-[15vh] px-4">
      <div
        ref={paletteRef}
        className="w-full max-w-lg bg-[#111116] border border-white/5 shadow-[0_24px_50px_rgba(0,0,0,0.8)] rounded-2xl flex flex-col overflow-hidden relative"
      >
        {/* Glow border overlay */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#a3e635] to-transparent opacity-40" />

        {/* Input Header */}
        <div className="flex items-center px-4 border-b border-white/5 bg-[#0a0a0f]/40">
          <Search className="w-4 h-4 text-zinc-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or destination..."
            className="w-full bg-transparent border-none outline-none py-4 text-xs text-zinc-200 placeholder-zinc-600 focus:ring-0 font-sans"
          />
          <kbd className="px-2 py-0.5 border border-white/10 text-zinc-500 bg-white/5 text-[9px] font-sans rounded-md shrink-0">
            ESC
          </kbd>
        </div>

        {/* List Body */}
        <div className="max-h-[300px] overflow-y-auto p-4 space-y-4 font-sans text-xs">
          {filteredCommands.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 uppercase tracking-widest font-semibold text-[10px]">
              No routes found
            </div>
          ) : (
            filteredCommands.map((group) => (
              <div key={group.category} className="space-y-2">
                <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-2">
                  {group.category}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <button
                      key={item.name}
                      onClick={item.action}
                      className="w-full text-left flex items-center justify-between p-2.5 rounded-xl hover:bg-[#a3e635]/5 border border-transparent hover:border-[#a3e635]/10 text-zinc-300 hover:text-white transition-all duration-150 cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        {item.icon}
                        <span className="font-semibold">{item.name}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase opacity-0 group-hover:opacity-100">Go</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-3.5 border-t border-white/5 bg-[#0a0a0f]/40 flex items-center justify-between text-[10px] text-zinc-500">
          <span className="flex items-center font-medium">
            <Terminal className="w-3.5 h-3.5 mr-1.5" /> Command Console V1.0
          </span>
          <span>Ctrl+K to close</span>
        </div>
      </div>
    </div>
  );
}
