"use client";

import React, { useState, useEffect, useRef } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Search, Star, ShieldAlert, Cpu, TrendingDown, TrendingUp, RefreshCw, Activity, BarChart2 } from "lucide-react";
import { PriceData, AlertData } from "@/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoinIcon } from "@/components/ui/coin-icon";
import { Sparkline } from "@/components/ui/sparkline";
import { useToast } from "@/components/ui/toast";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 350, damping: 25 },
  },
} as const;

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Unauthorized or server error");
    }
    return res.json();
  });

// CountUp component for animating stats on mount
function CountUp({ end, duration = 1000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const endValue = end;
    if (start === endValue) {
      setCount(endValue);
      return;
    }

    const totalMiliseconds = duration;
    const incrementTime = Math.max(Math.floor(totalMiliseconds / Math.max(endValue, 1)), 25);
    
    const timer = setInterval(() => {
      start += Math.ceil(endValue / (totalMiliseconds / incrementTime));
      if (start >= endValue) {
        clearInterval(timer);
        setCount(endValue);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PriceData[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Price Flash state
  const [priceFlash, setPriceFlash] = useState<Record<string, "up" | "down" | null>>({});
  const prevPricesRef = useRef<Record<string, number>>({});

  // SWR polling every 10 seconds
  const { data: prices, error: pricesError, mutate: mutatePrices } = useSWR<PriceData[]>(
    "/api/prices",
    fetcher,
    { refreshInterval: 10000 }
  );

  const { data: latestAlerts, error: alertsError } = useSWR<AlertData[]>(
    "/api/alerts/latest",
    fetcher,
    { refreshInterval: 10000 }
  );

  // Fetch wishlist only if logged in
  const { data: wishlist, mutate: mutateWishlist } = useSWR<PriceData[]>(
    session ? "/api/wishlist" : null,
    fetcher
  );

  // Detect price changes and trigger flash updates
  useEffect(() => {
    if (prices && prices.length > 0) {
      const newFlashes: Record<string, "up" | "down" | null> = {};
      let hasChanges = false;

      prices.forEach((coin) => {
        const prevPrice = prevPricesRef.current[coin.id];
        if (prevPrice !== undefined && prevPrice !== coin.price) {
          newFlashes[coin.id] = coin.price > prevPrice ? "up" : "down";
          hasChanges = true;
        }
        // Save current price for next tick
        prevPricesRef.current[coin.id] = coin.price;
      });

      if (hasChanges) {
        setPriceFlash((prev) => ({ ...prev, ...newFlashes }));

        // Clear flashes after 1 second
        const timer = setTimeout(() => {
          setPriceFlash({});
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [prices]);

  const isWishlisted = (coinId: string) => {
    return wishlist?.some((item) => item.id === coinId) || false;
  };

  const handleWishlistToggle = async (coin: PriceData) => {
    if (!session) {
      showToast("Access Denied: Please log in to manage your watchlist", "error");
      return;
    }

    const wishlisted = isWishlisted(coin.id);
    const method = wishlisted ? "DELETE" : "POST";
    const url = wishlisted ? `/api/wishlist?coinId=${coin.id}` : "/api/wishlist";
    const body = wishlisted ? undefined : JSON.stringify({ coinId: coin.id });

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (res.ok) {
        showToast(
          wishlisted
            ? `Removed ${coin.name} from watchlist`
            : `Added ${coin.name} to watchlist`,
          "success"
        );
        await Promise.all([mutateWishlist(), mutatePrices()]);
      } else {
        showToast("Action failed: Unauthorized session status", "error");
      }
    } catch (err) {
      console.error("Wishlist toggle failed:", err);
      showToast("Network fault: Failed to write database registry", "error");
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const res = await fetch(`/api/coins/search?query=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) {
        throw new Error("Failed to scan registry database.");
      }
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        setSearchError("No results found in database catalog.");
        showToast("No matching tickers found", "info");
      } else {
        showToast(`Scan complete: Found ${data.length} coins`, "success");
      }
      mutatePrices();
    } catch (err) {
      setSearchError((err as Error).message);
      showToast("Search failed", "error");
    } finally {
      setSearching(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price === 0) return "$0.00";
    if (price >= 1) {
      return `$${price.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return `$${price.toFixed(6)}`;
  };

  const renderPercentage = (change: number | null) => {
    if (change === null) return <span className="text-zinc-500 font-medium">N/A</span>;
    const isNegative = change < 0;
    const colorClass = isNegative ? "text-red-500" : "text-[#a3e635]";
    const Icon = isNegative ? TrendingDown : TrendingUp;

    return (
      <span className={`flex items-center justify-end font-semibold text-xs ${colorClass}`}>
        <Icon className="w-3.5 h-3.5 mr-1" />
        {isNegative ? "" : "+"}
        {change.toFixed(2)}%
      </span>
    );
  };

  // Helper to generate deterministic price history
  const getMockPriceHistory = (coin: PriceData) => {
    const change = coin.percentageChange || 0;
    const current = coin.price;
    const history = [];
    const steps = 10;
    
    const tempPrice = current / (1 + change / 100);
    const stepDiff = (current - tempPrice) / steps;

    for (let i = 0; i <= steps; i++) {
      const noise = (Math.random() - 0.5) * (current * 0.003);
      history.push(tempPrice + stepDiff * i + noise);
    }
    return history;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      
      {/* Search form / top panel - closes search results automatically on hover out */}
      <motion.div variants={itemVariants}>
        <Card
          hoverGlow={true}
          className="border-white/5 bg-[#111116]/40 backdrop-blur-md"
          onMouseLeave={() => setSearchResults([])}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-zinc-100 flex items-center">
                <Cpu className="w-5 h-5 mr-2.5 text-[#a3e635] pulse-live" />
                Surveillance Desk
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5">Real-time cryptocurrency price scanning & crash alert metrics.</p>
            </div>

            <form id="top-navbar-search" onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md w-full">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search coin (e.g. BTC, Ethereum)..."
                  className="w-full bg-[#0a0a0f]/60 border border-white/5 focus:border-[#a3e635] focus:outline-none rounded-full py-2 pl-9 pr-4 text-xs text-zinc-200 placeholder-zinc-600 transition-all duration-200"
                />
              </div>
              <Button
                type="submit"
                loading={searching}
                size="sm"
              >
                Scan
              </Button>
            </form>
          </div>

          {/* Search Results Display */}
          {searchResults.length > 0 && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <h3 className="text-[10px] uppercase font-bold text-zinc-500 mb-2.5 tracking-wider">Search Results</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((coin) => (
                  <div key={coin.id} className="border border-white/5 bg-[#0e0e12]/60 p-3 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <CoinIcon symbol={coin.symbol} size={28} />
                      <div>
                        <div className="font-bold text-xs text-zinc-200">{coin.name}</div>
                        <div className="text-[9px] uppercase text-zinc-500">{coin.symbol}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-xs text-zinc-200 font-bold">{coin.price !== null ? formatPrice(coin.price) : "..."}</div>
                      </div>
                      {session && (
                        <button
                          onClick={() => handleWishlistToggle(coin)}
                          className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                            isWishlisted(coin.id)
                              ? "border-[#a3e635]/30 bg-[#a3e635]/10 text-[#a3e635] hover:bg-[#a3e635]/20"
                              : "border-white/10 text-zinc-500 hover:border-[#a3e635]/40 hover:text-white"
                          }`}
                          title={isWishlisted(coin.id) ? "Remove Watchlist" : "Add Watchlist"}
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {searchError && (
            <div className="mt-3 text-xs text-red-400 border border-red-500/10 bg-red-950/5 p-3 rounded-xl">
              {searchError}
            </div>
          )}
        </Card>
      </motion.div>

      {/* ASYMMETRIC BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Left Section: Price table (2/3 width) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 flex">
          <Card hoverGlow={true} id="live-price-grid" className="p-6 bg-[#0a140a]/20 backdrop-blur-md border-[#a3e635]/18 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-[#a3e635] flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-[#a3e635] animate-pulse" />
                  Cryptocurrency Pricing Matrix
                </h2>
                <p className="text-[10px] text-zinc-400 mt-0.5">Scanned from database registries every 10s.</p>
              </div>
              <button
                onClick={() => {
                  showToast("Reloading price matrix...", "info");
                  mutatePrices();
                }}
                className="p-2 border border-[#a3e635]/15 hover:border-[#a3e635]/40 text-[#a3e635]/70 hover:text-[#a3e635] rounded-xl cursor-pointer transition-all duration-200"
                title="Force Reload"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {pricesError ? (
              <div className="text-center py-10 border border-red-500/10 text-red-400 bg-red-950/5 rounded-2xl flex-1 flex flex-col items-center justify-center">
                <ShieldAlert className="w-8 h-8 mx-auto mb-2.5 animate-pulse" />
                Error: Failed to connect to price surveillance stream.
              </div>
            ) : !prices ? (
              /* Loading Skeletons */
              <div className="space-y-3.5 py-2 flex-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center py-3 border-b border-white/5">
                    <div className="flex items-center space-x-3 w-1/3">
                      <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse" />
                      <div className="h-4 bg-white/5 animate-pulse w-2/3 rounded" />
                    </div>
                    <div className="h-4 bg-white/5 animate-pulse w-1/4 rounded" />
                    <div className="h-4 bg-white/5 animate-pulse w-1/6 rounded" />
                  </div>
                ))}
              </div>
            ) : !Array.isArray(prices) || prices.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 border border-white/5 bg-white/[0.01] rounded-2xl flex-1 flex flex-col items-center justify-center">
                No active monitors found. Search above to track assets.
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 text-[#a3e635]/85 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 font-bold tracking-wider">Asset</th>
                      <th className="py-3 px-4 font-bold tracking-wider text-center">Trend (30s)</th>
                      <th className="py-3 px-4 font-bold tracking-wider text-right">Value (USD)</th>
                      <th className="py-3 px-4 font-bold tracking-wider text-right">30s Delta</th>
                      {session && <th className="py-3 px-4 font-bold tracking-wider text-center">Track</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {prices.map((coin) => {
                      const flashType = priceFlash[coin.id];
                      const flashClass = flashType === "up" 
                        ? "price-flash-up" 
                        : flashType === "down" 
                        ? "price-flash-down" 
                        : "";

                      return (
                        <tr key={coin.id} className="hover:bg-[#a3e635]/5 transition-colors duration-150 group">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <CoinIcon symbol={coin.symbol} size={28} />
                              <div>
                                <span className="font-bold text-white group-hover:text-white transition-colors">{coin.name}</span>
                                <span className="text-[10px] uppercase text-[#a3e635]/65 ml-1.5 font-mono">{coin.symbol}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center">
                              <Sparkline
                                data={getMockPriceHistory(coin)}
                                color={coin.percentageChange && coin.percentageChange < 0 ? "danger" : "accent"}
                                width={100}
                                height={28}
                              />
                            </div>
                          </td>
                          <td className={`py-3.5 px-4 text-right font-semibold text-white transition-all rounded-lg ${flashClass}`}>
                            {formatPrice(coin.price)}
                          </td>
                          <td className="py-3.5 px-4 text-right">{renderPercentage(coin.percentageChange)}</td>
                          {session && (
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleWishlistToggle(coin)}
                                className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                                  isWishlisted(coin.id)
                                    ? "border-[#a3e635]/40 bg-[#a3e635]/15 text-[#a3e635] hover:bg-[#a3e635]/25"
                                    : "border-white/10 text-zinc-500 hover:border-[#a3e635]/40 hover:text-white"
                                }`}
                              >
                                <Star className="w-3.5 h-3.5 fill-current" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Right Section Bento Stack (1/3 width) */}
        <motion.div variants={itemVariants} className="space-y-6 flex flex-col">
          
          {/* Stats Bento Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Active Monitors */}
            <Card hoverGlow className="p-5 bg-[#0a140a]/10 border-[#a3e635]/18 flex flex-col justify-between h-[115px] relative group overflow-hidden">
              <div className="flex items-center justify-between text-[#a3e635]/85">
                <span className="text-[10px] font-bold uppercase tracking-wider">Active Monitors</span>
                <Cpu className="w-4 h-4 text-[#a3e635]/70 group-hover:text-[#a3e635] transition-colors" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-white tracking-tight">
                {prices ? <CountUp end={prices.length} /> : "---"}
              </div>
              <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-[#a3e635]/5 rounded-full blur-xl transition-all duration-500" />
            </Card>

            {/* Crash Logs */}
            <Card hoverGlow className="p-5 bg-[#0a140a]/10 border-[#a3e635]/18 flex flex-col justify-between h-[115px] relative group overflow-hidden">
              <div className="flex items-center justify-between text-[#a3e635]/85">
                <span className="text-[10px] font-bold uppercase tracking-wider">Crash Logs</span>
                <ShieldAlert className="w-4 h-4 text-red-500/70 group-hover:text-red-400 transition-colors" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-red-500 tracking-tight">
                {latestAlerts ? <CountUp end={latestAlerts.length} /> : "---"}
              </div>
              <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-red-500/5 rounded-full blur-xl transition-all duration-500" />
            </Card>

            {/* Watchlist */}
            <Card hoverGlow className="p-5 bg-[#0a140a]/10 border-[#a3e635]/18 flex flex-col justify-between h-[115px] relative group overflow-hidden">
              <div className="flex items-center justify-between text-[#a3e635]/85">
                <span className="text-[10px] font-bold uppercase tracking-wider">User Watchlist</span>
                <Star className="w-4 h-4 text-[#a3e635]/70 group-hover:text-[#a3e635] transition-colors" />
              </div>
              <div className="mt-2 text-3xl font-extrabold text-white tracking-tight">
                {wishlist ? <CountUp end={wishlist.length} /> : session ? "---" : "0"}
              </div>
              <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-[#a3e635]/5 rounded-full blur-xl transition-all duration-500" />
            </Card>

            {/* Telemetry Status */}
            <Card
              hoverGlow
              className="p-5 bg-[#0a140a]/10 border-[#a3e635]/18 flex flex-col justify-between h-[115px] relative group overflow-hidden cursor-help"
              title="Real-time surveillance monitoring active. Firing alerts on threshold breaches."
            >
              <div className="flex items-center justify-between text-[#a3e635]/85">
                <span className="text-[10px] font-bold uppercase tracking-wider">Telemetry Status</span>
                <Activity className="w-4 h-4 text-[#a3e635]/70 group-hover:text-[#a3e635] transition-colors" />
              </div>
              <div className="mt-2.5 flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#a3e635] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#a3e635]"></span>
                </span>
                <span className="text-xs font-extrabold text-[#a3e635] uppercase tracking-wider animate-pulse">ONLINE</span>
              </div>
              <div className="absolute -bottom-8 -right-8 w-16 h-16 bg-[#a3e635]/5 rounded-full blur-xl transition-all duration-500" />
            </Card>
          </div>

          {/* Flash Crash Detected Card */}
          <Card hoverGlow={true} id="recent-price-drops" className="p-5 bg-[#0a140a]/20 backdrop-blur-md border-[#a3e635]/18 flex flex-col min-h-[300px]">
            <h3 className="text-sm font-bold text-[#a3e635] mb-4 border-b border-white/5 pb-3 flex items-center justify-between shrink-0">
              <span className="flex items-center">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Flash Crash Stream
              </span>
              <span className="text-[9px] text-[#a3e635] font-semibold uppercase tracking-wider bg-[#0a140a]/80 border border-[#a3e635]/20 px-2.5 py-0.5 rounded-full shadow-[0_0_10px_rgba(163,230,53,0.05)]">
                Real-Time
              </span>
            </h3>

            {alertsError ? (
              <div className="text-center py-6 text-red-400 border border-red-500/10 bg-red-950/5 rounded-xl flex-1 flex flex-col items-center justify-center">
                Failed to load crash logs
              </div>
            ) : !latestAlerts ? (
              /* Loading Skeletons */
              <div className="space-y-3 py-1 flex-1">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-3 border border-white/5 bg-white/[0.01] animate-pulse rounded-xl h-20" />
                ))}
              </div>
            ) : latestAlerts.length === 0 ? (
              <div className="text-center py-10 text-zinc-500 bg-white/[0.01] border border-white/5 rounded-xl flex-1 flex flex-col items-center justify-center space-y-1.5">
                <BarChart2 className="w-5 h-5 text-zinc-700" />
                <span className="text-[10px] font-medium">No alerts detected in active cycle.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 flex-1">
                <AnimatePresence initial={false}>
                  {latestAlerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, height: 0, y: -10 }}
                      animate={{ opacity: 1, height: "auto", y: 0 }}
                      exit={{ opacity: 0, height: 0, y: 10 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="p-3.5 bg-[#0a140a]/40 border border-[#a3e635]/15 hover:border-[#a3e635]/35 hover:bg-[#0e200e]/50 rounded-xl transition-all duration-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/15 uppercase tracking-wider">
                          Crash
                        </span>
                        <span className="text-[10px] text-zinc-400 font-medium">
                          {new Date(alert.triggeredAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <CoinIcon symbol={alert.coin.symbol} size={22} />
                          <div>
                            <span className="text-white font-bold text-xs">{alert.coin.name}</span>
                            <span className="text-[#a3e635]/70 text-[10px] uppercase ml-1.5 font-semibold font-mono">{alert.coin.symbol}</span>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 border border-red-500/15 text-red-400">
                          -{Math.abs(alert.percentageDrop).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400 border-t border-white/5 pt-2">
                        <span>Price: <span className="font-semibold text-zinc-200">{formatPrice(alert.priceAtCrash)}</span></span>
                        <span className="text-[#a3e635]/65 font-medium">Live Surveillance Active</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Card>

        </motion.div>

      </div>
    </motion.div>
  );
}
