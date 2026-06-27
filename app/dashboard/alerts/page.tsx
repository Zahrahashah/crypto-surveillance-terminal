"use client";

import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { ShieldAlert, Filter, ChevronLeft, ChevronRight, RefreshCw, Cpu, ArrowUpDown, ChevronDown, ChevronUp } from "lucide-react";
import { PaginatedAlertsResponse, PriceData } from "@/types/api";
import { Button } from "@/components/ui/button";
import { CoinIcon } from "@/components/ui/coin-icon";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error("Unauthorized or server error");
    }
    return res.json();
  });

type SortKey = "timestamp" | "price" | "drop";
type SortOrder = "asc" | "desc";

export default function AlertsHistoryPage() {
  const { showToast } = useToast();
  
  const [page, setPage] = useState(1);
  const [selectedCoinId, setSelectedCoinId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [minDrop, setMinDrop] = useState<string>("all"); // "all", "2", "5"

  // Sorting state
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Get active coins list for the filter dropdown
  const { data: activeCoins } = useSWR<PriceData[]>("/api/prices", fetcher);

  // Construct URL with query parameters
  const queryParams = new URLSearchParams({
    page: page.toString(),
    pageSize: "12",
    coinId: selectedCoinId,
    from: fromDate,
    to: toDate,
  });

  const { data: historyData, error: historyError, mutate: mutateHistory } = useSWR<PaginatedAlertsResponse>(
    `/api/alerts/history?${queryParams.toString()}`,
    fetcher
  );

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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  // Client-side sorting and additional drop filtering
  const processedAlerts = useMemo(() => {
    if (!historyData?.alerts) return [];
    
    let items = [...historyData.alerts];
    if (minDrop !== "all") {
      const dropThreshold = parseFloat(minDrop);
      items = items.filter((alert) => Math.abs(alert.percentageDrop) >= dropThreshold);
    }

    items.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      if (sortKey === "timestamp") {
        aVal = new Date(a.triggeredAt).getTime();
        bVal = new Date(b.triggeredAt).getTime();
      } else if (sortKey === "price") {
        aVal = a.priceAtCrash;
        bVal = b.priceAtCrash;
      } else {
        aVal = Math.abs(a.percentageDrop);
        bVal = Math.abs(b.percentageDrop);
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return items;
  }, [historyData, minDrop, sortKey, sortOrder]);

  return (
    <div className="space-y-6">
      
      {/* Search Filter HUD */}
      <Card className="bg-[#111116]/40 backdrop-blur-md border-white/5 p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#a3e635] mb-4 flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          Filter Crash Logs
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-xs">
          
          {/* Coin filter */}
          <div className="space-y-1.5">
            <label className="block text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">Filter by Coin</label>
            <select
              value={selectedCoinId}
              onChange={(e) => {
                setSelectedCoinId(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#0a0a0f]/60 border border-white/5 text-zinc-200 py-2.5 px-3 rounded-xl focus:outline-none focus:border-[#a3e635] cursor-pointer text-xs transition-colors"
            >
              <option value="all" className="bg-[#111116] text-zinc-200">All Coins</option>
              {activeCoins?.map((coin) => (
                <option key={coin.id} value={coin.id} className="bg-[#111116] text-zinc-200">
                  {coin.name} ({coin.symbol.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Date from filter */}
          <div className="space-y-1.5">
            <label className="block text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#0a0a0f]/60 border border-white/5 text-zinc-200 py-2 px-3 rounded-xl focus:outline-none focus:border-[#a3e635] text-xs transition-colors"
            />
          </div>

          {/* Date to filter */}
          <div className="space-y-1.5">
            <label className="block text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#0a0a0f]/60 border border-white/5 text-zinc-200 py-2 px-3 rounded-xl focus:outline-none focus:border-[#a3e635] text-xs transition-colors"
            />
          </div>

          {/* Drop severity filter */}
          <div className="space-y-1.5">
            <label className="block text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">Drop Severity</label>
            <select
              value={minDrop}
              onChange={(e) => setMinDrop(e.target.value)}
              className="w-full bg-[#0a0a0f]/60 border border-white/5 text-zinc-200 py-2.5 px-3 rounded-xl focus:outline-none focus:border-[#a3e635] cursor-pointer text-xs transition-colors"
            >
              <option value="all" className="bg-[#111116] text-zinc-200">All Drops</option>
              <option value="2" className="bg-[#111116] text-zinc-200">At least 2% drop</option>
              <option value="5" className="bg-[#111116] text-zinc-200">At least 5% drop (Critical)</option>
            </select>
          </div>

          {/* Reset button */}
          <div className="flex items-end">
            <Button
              onClick={() => {
                setSelectedCoinId("all");
                setFromDate("");
                setToDate("");
                setMinDrop("all");
                setPage(1);
                showToast("Filters reset to default status", "info");
              }}
              variant="outlined"
              className="w-full rounded-xl py-2.5"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Database History Table */}
      <Card className="bg-[#111116]/40 backdrop-blur-md border-white/5 p-6">
        <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 flex items-center">
              <Cpu className="w-4 h-4 mr-2 text-[#a3e635]" />
              Flash Crash Logs
            </h2>
            <p className="text-[10px] text-zinc-500 mt-0.5">Historical records of flash crashes detected by the system.</p>
          </div>
          <button
            onClick={() => {
              showToast("Refreshing logs...", "info");
              mutateHistory();
            }}
            className="p-2 border border-white/5 hover:border-white/15 text-zinc-500 hover:text-zinc-300 rounded-xl cursor-pointer transition-all duration-200"
            title="Reload Logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {historyError ? (
          <div className="text-center py-10 border border-red-500/10 text-red-400 bg-red-950/5 rounded-2xl">
            <ShieldAlert className="w-8 h-8 mx-auto mb-2.5 animate-pulse" />
            Error: Failed to load logs.
          </div>
        ) : !historyData ? (
          /* Loading Skeletons */
          <div className="space-y-3.5 py-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between py-3 border-b border-white/5">
                <div className="h-4 bg-white/5 animate-pulse w-1/4 rounded" />
                <div className="h-4 bg-white/5 animate-pulse w-1/3 rounded" />
                <div className="h-4 bg-white/5 animate-pulse w-1/6 rounded" />
                <div className="h-4 bg-white/5 animate-pulse w-1/6 rounded" />
              </div>
            ))}
          </div>
        ) : processedAlerts.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 border border-white/5 bg-white/[0.01] rounded-2xl">
            No flash crashes found matching your filters.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500 uppercase tracking-wider text-[10px]">
                    <th
                      className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort("timestamp")}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span>Timestamp</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500/40" />
                        {sortKey === "timestamp" && (
                          sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#a3e635]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#a3e635]" />
                        )}
                      </div>
                    </th>
                    <th className="py-3 px-4 font-semibold">Asset Name</th>
                    <th className="py-3 px-4 font-semibold text-center">Alert Severity</th>
                    <th
                      className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort("price")}
                    >
                      <div className="flex items-center justify-end space-x-1.5">
                        <span>Price at Drop</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500/40" />
                        {sortKey === "price" && (
                          sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#a3e635]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#a3e635]" />
                        )}
                      </div>
                    </th>
                    <th
                      className="py-3 px-4 font-semibold text-right cursor-pointer hover:text-white transition-colors"
                      onClick={() => handleSort("drop")}
                    >
                      <div className="flex items-center justify-end space-x-1.5">
                        <span>Price Change</span>
                        <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500/40" />
                        {sortKey === "drop" && (
                          sortOrder === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#a3e635]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#a3e635]" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {processedAlerts.map((alert) => {
                    const isCritical = Math.abs(alert.percentageDrop) >= 5;
                    return (
                      <tr key={alert.id} className="hover:bg-white/[0.02] transition-colors duration-150 group">
                        <td className="py-4 px-4 text-zinc-400">
                          {new Date(alert.triggeredAt).toLocaleString()}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <CoinIcon symbol={alert.coin.symbol} size={24} />
                            <div className="flex items-baseline space-x-1.5">
                              <span className="font-bold text-zinc-200 group-hover:text-white transition-colors">{alert.coin.name}</span>
                              <span className="text-[10px] uppercase text-zinc-500 font-medium">{alert.coin.symbol}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex justify-center">
                            {isCritical ? (
                              <span className="px-3 py-1 text-[9px] font-bold rounded-full bg-red-500/15 text-red-500 tracking-wider uppercase border border-red-500/10 animate-pulse">
                                Critical Crash
                              </span>
                            ) : (
                              <span className="px-3 py-1 text-[9px] font-bold rounded-full bg-amber-500/15 text-amber-500 tracking-wider uppercase border border-amber-500/10">
                                Warning Drop
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-semibold text-zinc-200">
                          {formatPrice(alert.priceAtCrash)}
                        </td>
                        <td className="py-4 px-4 text-right font-extrabold text-red-500">
                          -{Math.abs(alert.percentageDrop).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {historyData.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/5 pt-4 text-[11px] text-zinc-500 font-medium">
                <div>
                  Page <span className="font-bold text-white">{historyData.currentPage}</span> of{" "}
                  <span className="font-bold text-white">{historyData.totalPages}</span> (
                  <span className="text-zinc-300 font-semibold">{historyData.totalCount}</span> flash crashes detected)
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex items-center space-x-1 px-3 py-1.5 border border-white/5 hover:border-white/15 text-zinc-400 hover:text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-200"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>
                  <button
                    disabled={page === historyData.totalPages}
                    onClick={() => setPage((p) => Math.min(historyData.totalPages, p + 1))}
                    className="flex items-center space-x-1 px-3 py-1.5 border border-white/5 hover:border-white/15 text-zinc-400 hover:text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-200"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
