"use client";

import React, { useState, useEffect } from "react";

interface DonutSegment {
  name: string;
  symbol: string;
  value: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  data?: DonutSegment[];
  size?: number;
  thickness?: number;
}

export function DonutChart({
  data = [
    { name: "Bitcoin", symbol: "BTC", value: 45000, percentage: 45, color: "#a3e635" }, // Vivid Lime Accent
    { name: "Ethereum", symbol: "ETH", value: 30000, percentage: 30, color: "#10b981" }, // Emerald Green
    { name: "Solana", symbol: "SOL", value: 15000, percentage: 15, color: "#22c55e" },   // Light Green
    { name: "Other", symbol: "OTH", value: 10000, percentage: 10, color: "#27272a" },    // Zinc Dark
  ],
  size = 180,
  thickness = 18,
}: DonutChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate cumulative percentages for offset positioning
  let accumulatedPercent = 0;

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-around gap-6 py-2">
      {/* SVG Donut */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Base shadow background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.02)"
            strokeWidth={thickness}
          />
          {data.map((segment, index) => {
            const segmentCircumference = (segment.percentage / 100) * circumference;
            const strokeDasharray = `${segmentCircumference} ${circumference}`;
            const rotationOffset = (accumulatedPercent / 100) * circumference;
            accumulatedPercent += segment.percentage;

            const isHovered = activeIndex === index;

            return (
              <circle
                key={segment.symbol}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={isHovered ? thickness + 4 : thickness}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={mounted ? rotationOffset : circumference}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer origin-center"
                style={{
                  transition: "stroke-width 0.3s ease, stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center overlay details */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center">
          <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">
            {activeIndex !== null ? data[activeIndex].name : "PORTFOLIO"}
          </span>
          <span className="text-xl font-bold text-zinc-100 mt-0.5">
            {activeIndex !== null
              ? `${data[activeIndex].percentage}%`
              : `$${totalValue.toLocaleString()}`}
          </span>
        </div>
      </div>

      {/* Interactive Legend */}
      <div className="space-y-2.5 flex-1 max-w-[200px]">
        {data.map((segment, index) => {
          const isHovered = activeIndex === index;
          return (
            <div
              key={segment.symbol}
              className={`flex items-center justify-between p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                isHovered ? "bg-white/5 pl-2.5" : "hover:bg-white/[0.02]"
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div className="flex items-center space-x-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-xs font-semibold text-zinc-200">{segment.symbol}</span>
                <span className="text-[10px] text-zinc-500 font-medium hidden xs:inline">
                  {segment.name}
                </span>
              </div>
              <span className="text-xs font-bold text-zinc-100">
                {segment.percentage}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
