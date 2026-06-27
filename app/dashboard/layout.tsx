"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  Activity,
  Star,
  User,
  LogOut,
  Bell,
  Settings,
  Menu,
  X,
  TrendingUp,
} from "lucide-react";
import { CommandPalette } from "@/components/command-palette";
import { useTour } from "@/components/tour-provider";
import { motion } from "framer-motion";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { startTour } = useTour();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load avatar and sync changes
  useEffect(() => {
    const loadAvatar = () => {
      if (session?.user?.email) {
        const saved = localStorage.getItem("sentry-avatar-" + session.user.email);
        setAvatar(saved);
      } else {
        setAvatar(null);
      }
    };

    loadAvatar();

    window.addEventListener("sentry-avatar-update", loadAvatar);
    return () => window.removeEventListener("sentry-avatar-update", loadAvatar);
  }, [session]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    await signOut({ callbackUrl: "/dashboard" });
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: <Activity className="w-4 h-4" />, authRequired: false },
    { href: "/dashboard/market", label: "Market Data", icon: <TrendingUp className="w-4 h-4" />, authRequired: false },
    { href: "/dashboard/alerts", label: "Alerts Logs", icon: <Bell className="w-4 h-4" />, authRequired: false },
    { href: "/dashboard/wishlist", label: "Watchlist", icon: <Star className="w-4 h-4" />, authRequired: true },
    { href: "/dashboard/profile", label: "My Profile", icon: <User className="w-4 h-4" />, authRequired: true },
    { href: "/dashboard/settings", label: "Settings", icon: <Settings className="w-4 h-4" />, authRequired: true },
  ];

  const isActiveLink = (path: string) => pathname === path;

  return (
    <div id="dashboard-layout-root" className="min-h-screen flex bg-transparent text-zinc-100 font-sans overflow-hidden relative">
      {/* Soft Premium SaaS Ambient Glow Shapes */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full ambient-glow-1 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full ambient-glow-2 blur-[140px] pointer-events-none" />

      {/* Global Command Palette Trigger */}
      <CommandPalette onTriggerTour={startTour} />

      {/* Auth Gating Modal */}
      {authModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-[#020205]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel p-6 rounded-2xl shadow-2xl space-y-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#a3e635]/10 border border-[#a3e635]/25 flex items-center justify-center text-[#a3e635] mx-auto">
              <User className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Login Required</h3>
              <p className="text-xs text-zinc-400">Please log in or sign up to access this feature.</p>
            </div>
            <div className="flex flex-col space-y-2.5">
              <Link
                href="/login"
                onClick={() => setAuthModalOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#a3e635] text-black font-bold text-xs hover:bg-[#b4f246] transition-all text-center"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setAuthModalOpen(false)}
                className="w-full py-2.5 rounded-xl border border-white/10 hover:border-white/20 text-white font-bold text-xs transition-all text-center"
              >
                Sign Up
              </Link>
              <button
                onClick={() => setAuthModalOpen(false)}
                className="w-full py-2 text-zinc-500 hover:text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR NAVIGATION (Desktop) */}
      <aside
        id="sidebar-navigation"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#111116]/80 backdrop-blur-lg border-r border-white/5 flex flex-col transition-transform duration-300 md:translate-x-0 md:static md:h-screen ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#0a0a0f]/40">
          <div className="flex items-center space-x-3">
            <div id="hud-brand-logo" className="w-9 h-9 rounded-xl bg-[#a3e635]/10 border border-[#a3e635]/25 flex items-center justify-center text-[#a3e635] shrink-0">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[13px] font-extrabold tracking-wider uppercase text-zinc-100">
                Crypto Sentry
              </div>
              <div className="text-[10px] text-[#a3e635]/80 font-semibold tracking-wide">
                SURVEILLANCE NODE // ACTIVE
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-zinc-400 hover:text-zinc-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Routes */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 text-sm font-medium">
          {navLinks.map((link) => {
            const isGated = link.authRequired && status === "unauthenticated";
            const isActive = isActiveLink(link.href);
            
            if (isGated) {
              return (
                <button
                  key={link.href}
                  onClick={() => {
                    setIsSidebarOpen(false);
                    setAuthModalOpen(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 transition-all duration-200 rounded-xl text-left cursor-pointer font-medium text-sm group"
                >
                  <span className="text-zinc-400 group-hover:text-white transition-colors flex items-center">{link.icon}</span>
                  <span>{link.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`relative flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 z-10 text-sm font-medium group ${
                  isActive
                    ? "text-black font-bold shadow-[0_4px_12px_rgba(163,230,53,0.15)]"
                    : "text-white/85 hover:text-white hover:bg-white/5"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-[#a3e635] rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={isActive ? "text-black flex items-center" : "text-zinc-400 group-hover:text-white transition-colors flex items-center"}>
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile Card (Bottom) */}
        <div className="p-4 border-t border-white/5 bg-[#0a0a0f]/40">
          {status === "loading" ? (
            <div className="h-12 animate-pulse bg-white/5 border border-white/5 rounded-2xl" />
          ) : session && session.user ? (
            <div className="flex items-center space-x-3 bg-white/[0.02] border border-white/5 p-2.5 rounded-2xl">
              {avatar ? (
                <img
                  src={avatar}
                  alt="Profile Avatar"
                  className="w-8 h-8 rounded-full border border-white/10 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full border border-white/10 bg-zinc-850 flex items-center justify-center text-sm select-none">
                  👤
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-zinc-100 truncate tracking-wide">
                  {session.user.email?.split("@")[0]}
                </p>
                <p className="text-[9px] font-medium text-zinc-500 truncate">
                  CLEARANCE LEVEL 1
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="text-zinc-500 hover:text-red-400 p-1.5 hover:bg-red-500/10 rounded-lg cursor-pointer transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-2 p-1">
              <Link
                href="/login"
                className="w-full py-2.5 rounded-full border border-[#a3e635]/30 hover:border-[#a3e635] text-[#a3e635] hover:text-[#a3e635] bg-[#a3e635]/5 hover:bg-[#a3e635]/10 font-bold uppercase tracking-wider text-[10px] flex items-center justify-center transition-all duration-200 text-center"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="w-full py-2.5 rounded-full bg-[#a3e635] text-black font-bold uppercase tracking-wider text-[10px] flex items-center justify-center transition-all duration-200 text-center hover:bg-[#b4f246]"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div id="dashboard-main-container" className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        {/* TOP NAVBAR */}
        <header className="h-16 border-b border-white/5 bg-[#111116]/40 backdrop-blur-md flex items-center justify-between px-6 shrink-0 relative z-30">
          
          {/* Mobile hamburger */}
          <div className="flex items-center space-x-3 md:hidden">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="text-zinc-400 hover:text-zinc-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs font-extrabold tracking-widest text-[#a3e635]">
              CRYPTO SENTRY
            </div>
          </div>

          {/* Left space offset (Search bar removed entirely) */}
          <div className="hidden md:block" />

          {/* Right Status controls */}
          <div className="flex items-center space-x-6">
            
            {/* Live status indicator */}
            <div
              id="system-status-indicator"
              className="flex items-center space-x-2 text-[10px] font-semibold border border-emerald-500/10 bg-emerald-500/5 px-3 py-1.5 rounded-full text-emerald-400 cursor-help"
              title="Real-time link monitoring active. Firing notifications on threshold breaches."
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="tracking-wide uppercase">Connected</span>
            </div>

            {/* Profile Dropdown Menu */}
            {session && session.user && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className="flex items-center space-x-2 focus:outline-none cursor-pointer"
                >
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="User"
                      className="w-8 h-8 rounded-full border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full border border-white/10 bg-zinc-855 flex items-center justify-center text-sm select-none">
                      👤
                    </div>
                  )}
                </button>
                {/* Dropdown popup */}
                {isUserDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-48 glass-panel shadow-2xl py-2 text-xs select-none"
                  >
                    <div className="px-4 py-2 border-b border-white/5 text-zinc-500 text-[10px]">
                      Signed in as: <br />
                      <span className="text-zinc-200 font-semibold">{session.user.email}</span>
                    </div>
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="block px-4 py-2.5 text-zinc-300 hover:text-zinc-100 hover:bg-white/5"
                    >
                      My Profile
                    </Link>
                    <Link
                      href="/dashboard/settings"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="block px-4 py-2.5 text-zinc-300 hover:text-zinc-100 hover:bg-white/5"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left block px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 border-t border-white/5 cursor-pointer transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Pages Content Frame */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto relative z-10 bg-[#06060a]/20">
          {children}
        </main>
      </div>
    </div>
  );
}
