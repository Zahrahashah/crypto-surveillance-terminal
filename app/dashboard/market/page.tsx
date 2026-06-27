"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  DollarSign, 
  Calendar, 
  Activity, 
  Info,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Star
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { CoinIcon } from "@/components/ui/coin-icon";
import { Sparkline } from "@/components/ui/sparkline";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface CoinGeckoMarketCoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  total_supply: number;
  max_supply?: number;
  ath: number;
  ath_change_percentage: number;
  ath_date: string;
  atl: number;
  atl_change_percentage: number;
  atl_date: string;
  last_updated: string;
  sparkline_in_7d?: {
    price: number[];
  };
  dbId?: string | null;
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Failed to fetch market data from node");
    }
    return res.json();
  });

// Formatters
const formatPrice = (price: number) => {
  if (price === 0) return "$0.00";
  if (price < 0.01) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}`;
  if (price < 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatLargeNum = (num: number) => {
  if (!num) return "N/A";
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
};

const formatSupply = (num: number) => {
  if (!num) return "N/A";
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  return num.toLocaleString();
};

interface WishlistCoin {
  id: string;
  coinGeckoId: string;
  name: string;
  symbol: string;
}

export default function MarketDataPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);

  // SWR polling every 60 seconds to match the Redis cache TTL
  const { data: coins, error, isLoading, mutate } = useSWR<CoinGeckoMarketCoin[]>(
    "/api/market",
    fetcher,
    {
      refreshInterval: 60000,
      revalidateOnFocus: false,
    }
  );

  // Fetch wishlist only if logged in
  const { data: wishlist, mutate: mutateWishlist } = useSWR<WishlistCoin[]>(
    session ? "/api/wishlist" : null,
    fetcher
  );

  const isWishlisted = (coinDbId: string | null) => {
    if (!coinDbId || !wishlist) return false;
    return wishlist.some((item) => item.id === coinDbId);
  };

  const handleWishlistToggle = async (coin: CoinGeckoMarketCoin) => {
    if (!session || !coin.dbId) return;

    const wishlisted = isWishlisted(coin.dbId);
    const method = wishlisted ? "DELETE" : "POST";
    const url = wishlisted ? `/api/wishlist?coinId=${coin.dbId}` : "/api/wishlist";
    const body = wishlisted ? undefined : JSON.stringify({ coinId: coin.dbId });

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
        await mutateWishlist();
      } else {
        showToast("Action failed: Unauthorized session status", "error");
      }
    } catch (err) {
      console.error("Wishlist toggle failed:", err);
      showToast("Network fault: Failed to write database registry", "error");
    }
  };

  // Filter list based on search
  const filteredCoins = coins
    ? coins.filter(
        (coin) =>
          coin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Automatically select the first coin when data loads if none selected
  useEffect(() => {
    if (coins && coins.length > 0 && !selectedCoinId) {
      setSelectedCoinId(coins[0].id);
    }
  }, [coins, selectedCoinId]);

  const selectedCoin = coins?.find((c) => c.id === selectedCoinId) || null;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Page Header */}
      <Card className="border-white/5 bg-[#111116]/40 backdrop-blur-md p-6 shrink-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-zinc-100 flex items-center">
              <Coins className="w-5 h-5 mr-2.5 text-[#a3e635]" />
              Market Surveillance
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5 font-medium leading-relaxed">
              Real-time global asset valuation, volume metrics, and capitalization telemetry from centralized price feeds.
            </p>
          </div>
          <Button
            onClick={() => mutate()}
            variant="outlined"
            className="flex items-center space-x-2 shrink-0 self-start md:self-auto"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-[#a3e635]" : ""}`} />
            <span className="text-[10px] uppercase font-semibold">Sync Feeds</span>
          </Button>
        </div>
      </Card>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Left Side: Coin Search & List */}
        <div className="lg:col-span-5 flex flex-col min-h-0 h-[500px] lg:h-[calc(100vh-250px)]">
          {/* Search bar */}
          <div className="relative shrink-0">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter assets by name or ticker..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111116]/60 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-xs font-sans text-white placeholder-zinc-500 focus:outline-none focus:border-[#a3e635] focus:ring-1 focus:ring-[#a3e635]/25 transition-all duration-200"
            />
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto pr-1 mt-4 space-y-2 select-none scrollbar-thin">
            {isLoading ? (
              // Skeletons
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 w-full rounded-xl bg-white/[0.02] border border-white/5 animate-pulse flex items-center justify-between px-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-16 bg-zinc-800 rounded" />
                      <div className="h-2 w-24 bg-zinc-800 rounded" />
                    </div>
                  </div>
                  <div className="space-y-1.5 flex flex-col items-end">
                    <div className="h-3 w-12 bg-zinc-800 rounded" />
                    <div className="h-2.5 w-10 bg-zinc-800 rounded" />
                  </div>
                </div>
              ))
            ) : error ? (
              <div className="text-center py-12 text-zinc-500 border border-red-500/10 bg-red-500/5 rounded-2xl p-6">
                <Info className="w-8 h-8 mx-auto text-red-400 mb-3" />
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Telemetry Failure</p>
                <p className="text-[11px] text-zinc-400 mt-1">Failed to read CoinGecko surveillance streams.</p>
                <Button onClick={() => mutate()} variant="outlined" className="mt-4 mx-auto text-[10px]">
                  Retry Connection
                </Button>
              </div>
            ) : filteredCoins.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 border border-white/5 bg-white/[0.01] rounded-2xl p-6">
                <Info className="w-8 h-8 mx-auto text-zinc-500 mb-3" />
                <p className="text-xs font-bold uppercase tracking-wider">No Matches Found</p>
                <p className="text-[11px] text-zinc-600 mt-1">No monitored assets fit the search parameters.</p>
              </div>
            ) : (
              filteredCoins.map((coin) => {
                const isSelected = coin.id === selectedCoinId;
                const isUp = coin.price_change_percentage_24h >= 0;
                return (
                  <div
                    key={coin.id}
                    onClick={() => setSelectedCoinId(coin.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-[#a3e635]/10 border-[#a3e635]/30 text-white shadow-[0_4px_12px_rgba(163,230,53,0.05)]"
                        : "bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="text-[10px] font-bold text-zinc-500 w-4 select-none shrink-0">
                        {coin.market_cap_rank}
                      </div>
                      <CoinIcon symbol={coin.symbol} size={30} />
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-bold text-white uppercase tracking-wide truncate">
                            {coin.symbol}
                          </span>
                          <span className="text-[10px] text-zinc-500 truncate hidden sm:inline">
                            {coin.name}
                          </span>
                        </div>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-semibold">
                          CAP RANK #{coin.market_cap_rank}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-white">{formatPrice(coin.current_price)}</div>
                      <div
                        className={`text-[10px] font-bold flex items-center justify-end space-x-0.5 mt-0.5 ${
                          isUp ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span>{Math.abs(coin.price_change_percentage_24h).toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Coin Detail Card */}
        <div className="lg:col-span-7 min-h-0 h-auto lg:h-[calc(100vh-250px)] lg:overflow-y-auto">
          {isLoading ? (
            <Card className="border-white/5 bg-[#111116]/40 backdrop-blur-md p-6 h-full animate-pulse">
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-800" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-zinc-800 rounded" />
                    <div className="h-3 w-16 bg-zinc-800 rounded" />
                  </div>
                </div>
                <div className="h-10 w-48 bg-zinc-800 rounded" />
                <div className="h-32 w-full bg-zinc-800/40 rounded-xl" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-16 bg-zinc-800/20 rounded-xl" />
                  <div className="h-16 bg-zinc-800/20 rounded-xl" />
                  <div className="h-16 bg-zinc-800/20 rounded-xl" />
                  <div className="h-16 bg-zinc-800/20 rounded-xl" />
                </div>
              </div>
            </Card>
          ) : selectedCoin ? (
            <Card className="border-white/5 bg-[#111116]/40 backdrop-blur-md p-6 h-full flex flex-col justify-between">
              <div className="space-y-6">
                {/* Detail Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center space-x-4">
                    <CoinIcon symbol={selectedCoin.symbol} size={44} />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-base font-extrabold text-white">{selectedCoin.name}</h2>
                        <span className="text-[10px] font-bold text-[#a3e635] bg-[#a3e635]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Rank #{selectedCoin.market_cap_rank}
                        </span>
                        {session && selectedCoin.dbId && (
                          <button
                            onClick={() => handleWishlistToggle(selectedCoin)}
                            className={`p-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
                              isWishlisted(selectedCoin.dbId)
                                ? "border-[#a3e635]/30 bg-[#a3e635]/10 text-[#a3e635] hover:bg-[#a3e635]/20"
                                : "border-white/10 text-zinc-500 hover:border-[#a3e635]/40 hover:text-white"
                            }`}
                            title={isWishlisted(selectedCoin.dbId) ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            <Star className="w-3.5 h-3.5 fill-current" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                        Ticker: {selectedCoin.symbol.toUpperCase()} • USD Trading Node
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">Last Sync</span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {new Date(selectedCoin.last_updated).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Price Display */}
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                    SURVEILLANCE PRICE FEED
                  </span>
                  <div className="flex items-baseline space-x-3.5">
                    <span className="text-3xl font-extrabold text-white tracking-tight">
                      {formatPrice(selectedCoin.current_price)}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1 ${
                        selectedCoin.price_change_percentage_24h >= 0
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {selectedCoin.price_change_percentage_24h >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 mr-1" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 mr-1" />
                      )}
                      {selectedCoin.price_change_percentage_24h.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Sparkline Visual Graph */}
                {selectedCoin.sparkline_in_7d?.price && selectedCoin.sparkline_in_7d.price.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                      7-Day Price Velocity Telemetry
                    </span>
                    <div className="bg-[#0a0a0e]/40 border border-white/5 rounded-xl p-4 flex items-center justify-center relative overflow-hidden h-36">
                      <Sparkline
                        data={selectedCoin.sparkline_in_7d.price}
                        width={480}
                        height={110}
                        color={selectedCoin.price_change_percentage_24h >= 0 ? "accent" : "danger"}
                        className="w-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-36 bg-[#0a0a0e]/40 border border-white/5 rounded-xl flex items-center justify-center text-[10px] text-zinc-600 font-semibold uppercase tracking-wider">
                    Velocity Sparkline Stream Unavailable
                  </div>
                )}

                {/* Telemetry Metrics Grid */}
                <div className="space-y-3">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">
                    VALUATION & Telemetry Metrics
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase block tracking-wider">
                          MARKET CAPITALIZATION
                        </span>
                        <span className="text-xs font-bold text-white mt-0.5 block">
                          {formatLargeNum(selectedCoin.market_cap)}
                        </span>
                      </div>
                      <DollarSign className="w-4 h-4 text-zinc-600" />
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-zinc-500 font-bold uppercase block tracking-wider">
                          24H TRADING VOLUME
                        </span>
                        <span className="text-xs font-bold text-white mt-0.5 block">
                          {formatLargeNum(selectedCoin.total_volume)}
                        </span>
                      </div>
                      <Activity className="w-4 h-4 text-zinc-600" />
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase block tracking-wider mb-0.5">
                        24H HIGH / LOW BOUNDS
                      </span>
                      <div className="flex justify-between text-xs font-bold text-white mt-0.5">
                        <span className="text-emerald-400">H: {formatPrice(selectedCoin.high_24h)}</span>
                        <span className="text-red-400">L: {formatPrice(selectedCoin.low_24h)}</span>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                      <span className="text-[9px] text-zinc-500 font-bold uppercase block tracking-wider mb-0.5">
                        CIRCULATING SUPPLY
                      </span>
                      <div className="flex justify-between items-baseline mt-0.5">
                        <span className="text-xs font-bold text-white">
                          {formatSupply(selectedCoin.circulating_supply)}
                        </span>
                        {selectedCoin.total_supply > 0 && (
                          <span className="text-[9px] text-[#a3e635] bg-[#a3e635]/5 px-1.5 py-0.5 rounded font-bold">
                            {(
                              (selectedCoin.circulating_supply / selectedCoin.total_supply) *
                              100
                            ).toFixed(1)}
                            % CIRC
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ATH / ATL records */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/5 pt-4">
                  <div className="flex items-center space-x-3 text-xs">
                    <Calendar className="w-4 h-4 text-[#a3e635]/60" />
                    <div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                        ALL-TIME HIGH record
                      </span>
                      <span className="font-bold text-zinc-200">
                        {formatPrice(selectedCoin.ath)}
                      </span>
                      <span className="text-[10px] text-zinc-500 ml-1.5 font-medium">
                        on {new Date(selectedCoin.ath_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <Calendar className="w-4 h-4 text-red-500/60" />
                    <div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">
                        ALL-TIME LOW record
                      </span>
                      <span className="font-bold text-zinc-200">
                        {formatPrice(selectedCoin.atl)}
                      </span>
                      <span className="text-[10px] text-zinc-500 ml-1.5 font-medium">
                        on {new Date(selectedCoin.atl_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-white/5 bg-[#111116]/40 backdrop-blur-md p-6 h-full flex flex-col items-center justify-center text-center">
              <Coins className="w-12 h-12 text-zinc-600 mb-3 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">No Asset Selected</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                Select an asset from the surveillance registry on the left to activate detailed telemetry monitoring.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
