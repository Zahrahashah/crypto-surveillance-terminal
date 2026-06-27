import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={`w-full bg-[#0a0a0e]/60 border rounded-xl ${
              error
                ? "border-red-500/40 focus:border-red-500 focus:ring-1 focus:ring-red-500/20"
                : "border-white/10 focus:border-[#a3e635] focus:ring-1 focus:ring-[#a3e635]/20"
            } focus:outline-none py-2.5 px-4 text-xs font-sans text-white placeholder-zinc-600 transition-all duration-200 ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[10px] font-medium text-red-500 tracking-wide animate-pulse">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
