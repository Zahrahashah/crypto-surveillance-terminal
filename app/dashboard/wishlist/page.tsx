"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Star, ShieldAlert, Trash2, TrendingDown, TrendingUp, RefreshCw, X } from "lucide-react";
import { PriceData } from "@/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CoinIcon } from "@/components/ui/coin-icon";
import { Sparkline } from "@/components/ui/sparkline";
import { useToast } from "@/components/ui/toast";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Unauthorized or server error");
    }
    return res.json();
  });

export default function WishlistPage() {
  const { status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedCoin, setSelectedCoin] = useState<PriceData | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const { data: wishlist, error: wishlistError, mutate: mutateWishlist } = useSWR<PriceData[]>(
    status === "authenticated" ? "/api/wishlist" : null,
    fetcher,
    { refreshInterval: 10000 }
  );

  const handleRemove = async (coinId: string, coinName: string) => {
    try {
      const res = await fetch(`/api/wishlist?coinId=${coinId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast(`Removed ${coinName} from watchlist`, "success");
        mutateWishlist();
      } else {
        showToast("Action failed: Unauthorized session status", "error");
      }
    } catch (err) {
      console.error("Failed to remove from watchlist:", err);
      showToast("Network fault: Failed to write database registry", "error");
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
    if (change === null) return <span className="text-zinc-500 font-semibold">N/A</span>;
    const isNegative = change < 0;
    const colorClass = isNegative ? "text-red-500" : "text-[#a3e635]";
    const Icon = isNegative ? TrendingDown : TrendingUp;

    return (
      <span className={`flex items-center font-bold text-xs ${colorClass}`}>
        <Icon className="w-3.5 h-3.5 mr-1" />
        {isNegative ? "" : "+"}
        {change.toFixed(2)}%
      </span>
    );
  };

  const getMockPriceHistory = (coin: PriceData) => {
    const change = coin.percentageChange || 0;
    const current = coin.price;
    const history = [];
    const steps = 12;
    
    const tempPrice = current / (1 + change / 100);
    const stepDiff = (current - tempPrice) / steps;

    for (let i = 0; i <= steps; i++) {
      const noise = (Math.random() - 0.5) * (current * 0.003);
      history.push(tempPrice + stepDiff * i + noise);
    }
    return history;
  };

  if (status === "loading") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white/5 animate-pulse border border-white/5 rounded-2xl h-48" />
        ))}
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-zinc-100 flex items-center">
              <Star className="w-5 h-5 mr-2.5 text-[#a3e635] fill-current" />
              Watchlist Monitors
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">Custom monitoring list for high-priority cryptocurrencies.</p>
          </div>
          <button
            onClick={() => {
              showToast("Syncing watchlist metrics...", "info");
              mutateWishlist();
            }}
            className="p-2 border border-white/5 hover:border-white/15 text-zinc-500 hover:text-zinc-300 rounded-xl cursor-pointer transition-all duration-200"
            title="Force Sync"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>

      {wishlistError ? (
        <div className="text-center py-10 border border-red-500/10 text-red-400 bg-red-950/5 rounded-2xl">
          <ShieldAlert className="w-8 h-8 mx-auto mb-2.5 animate-pulse" />
          Error: Failed to load your watchlist log.
        </div>
      ) : !wishlist ? (
        /* Loading Skeletons */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white/5 border border-white/5 h-44 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : wishlist.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 border border-white/5 bg-white/[0.01] rounded-2xl">
          Your watchlist is empty. Go back to the Dashboard to track coins.
        </div>
      ) : (
        /* Watchlist cards grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.map((coin) => (
            <Card key={coin.id} className="flex flex-col justify-between h-48 bg-[#111116]/40 backdrop-blur-md border-white/5 hover:border-[#a3e635]/25">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <CoinIcon symbol={coin.symbol} size={32} />
                    <div>
                      <h3 className="font-bold text-sm text-zinc-100">{coin.name}</h3>
                      <span className="text-[10px] uppercase text-zinc-500 font-semibold">{coin.symbol}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(coin.id, coin.name)}
                    className="p-2 border border-white/5 hover:border-red-500/30 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl cursor-pointer transition-all duration-200"
                    title="Remove from Watchlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-base font-bold text-zinc-100">{formatPrice(coin.price)}</span>
                  {renderPercentage(coin.percentageChange)}
                </div>
              </div>

              {/* Sparkline & Details buttons */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <Sparkline
                  data={getMockPriceHistory(coin)}
                  color={coin.percentageChange && coin.percentageChange < 0 ? "danger" : "accent"}
                  width={110}
                  height={24}
                />
                <Button
                  onClick={() => setSelectedCoin(coin)}
                  variant="outlined"
                  size="sm"
                >
                  Details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* DETAIL MODAL INTERACTIVE VIEW */}
      {selectedCoin && (
        <div className="fixed inset-0 z-50 bg-[#020205]/75 backdrop-blur-md flex items-center justify-center p-4">
          <div
            className="w-full max-w-lg glass-panel shadow-2xl p-6 rounded-2xl relative flex flex-col font-sans text-xs"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
              <div className="flex items-center space-x-3">
                <CoinIcon symbol={selectedCoin.symbol} size={36} />
                <div>
                  <h3 className="text-sm font-bold text-zinc-100">{selectedCoin.name} ({selectedCoin.symbol.toUpperCase()})</h3>
                  <span className="text-[10px] text-zinc-500 font-medium">Watchlist Details</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCoin(null)}
                className="p-1.5 border border-white/5 hover:border-white/15 text-zinc-500 hover:text-zinc-300 rounded-xl cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-6">
              {/* Giant Price Overview */}
              <div className="flex items-baseline justify-between bg-[#0a0a0f]/60 border border-white/5 rounded-xl p-4">
                <div className="flex flex-col">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Live Market Price</span>
                  <span className="text-2xl font-extrabold text-zinc-100 mt-1">{formatPrice(selectedCoin.price)}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">30s Delta</span>
                  <div className="mt-1.5">{renderPercentage(selectedCoin.percentageChange)}</div>
                </div>
              </div>

              {/* Large Sparkline */}
              <div className="border border-white/5 bg-[#0a0a0f]/20 rounded-2xl p-6 flex flex-col items-center justify-center relative h-36">
                <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:10px_10px]" />
                <Sparkline
                  data={getMockPriceHistory(selectedCoin)}
                  color={selectedCoin.percentageChange && selectedCoin.percentageChange < 0 ? "danger" : "accent"}
                  width={380}
                  height={80}
                />
              </div>

              {/* Simulated 24h Stats */}
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-[10px] text-zinc-500 uppercase font-semibold">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>24h High:</span>
                  <span className="text-zinc-200 font-bold">{formatPrice(selectedCoin.price * 1.05)}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>24h Low:</span>
                  <span className="text-zinc-200 font-bold">{formatPrice(selectedCoin.price * 0.95)}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>Estimated Volume:</span>
                  <span className="text-zinc-200 font-bold">${(selectedCoin.price * 1500000).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>Market Capitalization:</span>
                  <span className="text-zinc-200 font-bold">${(selectedCoin.price * 85000000).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <Button
                  onClick={() => handleRemove(selectedCoin.id, selectedCoin.name).then(() => setSelectedCoin(null))}
                  variant="danger"
                  size="sm"
                >
                  Remove from Watchlist
                </Button>
                <Button
                  onClick={() => setSelectedCoin(null)}
                  variant="outlined"
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
