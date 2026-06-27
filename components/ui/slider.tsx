import React from "react";

interface SliderProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  className?: string;
}

export function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit = "",
  className = "",
}: SliderProps) {
  // Calculate percentage for active track background
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className={`space-y-2 font-sans text-xs w-full ${className}`}>
      <div className="flex justify-between items-center text-zinc-400">
        <span className="font-medium tracking-wide uppercase text-[11px]">{label}</span>
        <span className="text-[#a3e635] font-semibold bg-[#a3e635]/10 border border-[#a3e635]/25 rounded-md px-2 py-0.5">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative flex items-center group py-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-[#a3e635] focus:outline-none"
          style={{
            background: `linear-gradient(to right, #a3e635 0%, #a3e635 ${percentage}%, #27272a ${percentage}%, #27272a 100%)`
          }}
        />
      </div>
    </div>
  );
}
