import React from "react";

interface ToggleProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, checked, onChange, className = "", ...props }: ToggleProps) {
  return (
    <label className={`flex items-center justify-between cursor-pointer font-sans text-xs select-none ${className}`}>
      <span className="text-zinc-300 font-medium tracking-wide">{label}</span>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
          {...props}
        />
        {/* Track */}
        <div
          className={`w-9 h-5 rounded-full transition-all duration-200 border ${
            checked
              ? "bg-[#a3e635] border-[#a3e635] shadow-[0_0_12px_rgba(163,230,53,0.25)]"
              : "bg-zinc-800/40 border-white/5"
          }`}
        >
          {/* Thumb */}
          <div
            className={`w-3.5 h-3.5 rounded-full absolute top-[3px] transition-all duration-200 ${
              checked ? "translate-x-4.5 bg-black" : "translate-x-1 bg-zinc-500"
            }`}
          />
        </div>
      </div>
    </label>
  );
}
