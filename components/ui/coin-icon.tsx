"use client";

import React, { useState } from "react";

interface CoinIconProps {
  symbol: string;
  className?: string;
  size?: number;
}

export function CoinIcon({ symbol, className = "", size = 32 }: CoinIconProps) {
  const [error, setError] = useState(false);
  const cleanSymbol = symbol.toUpperCase();
  const firstLetter = cleanSymbol.charAt(0);

  // CoinCap's reliable icon library
  const primaryCdnUrl = `https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`;

  // Color mapping based on ticker letters for placeholder variety matching our clean theme
  const getPlaceholderColor = (char: string) => {
    const code = char.charCodeAt(0);
    if (code % 2 === 0) return "border-[#a3e635]/30 text-[#a3e635] bg-[#a3e635]/5 shadow-[0_0_10px_rgba(163,230,53,0.08)]";
    return "border-zinc-700 text-zinc-300 bg-zinc-900/40";
  };

  if (error || !symbol) {
    return (
      <div
        className={`flex items-center justify-center rounded-full border font-semibold tracking-tighter shrink-0 select-none ${getPlaceholderColor(
          firstLetter
        )} ${className}`}
        style={{ width: `${size}px`, height: `${size}px`, fontSize: `${size * 0.45}px` }}
      >
        {firstLetter}
      </div>
    );
  }

  return (
    <div
      className="rounded-full border border-white/5 shrink-0 bg-zinc-900 overflow-hidden flex items-center justify-center"
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <img
        src={primaryCdnUrl}
        alt={cleanSymbol}
        onError={() => setError(true)}
        className={`w-full h-full object-cover select-none ${className}`}
      />
    </div>
  );
}
