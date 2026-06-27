import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "outlined" | "ghost" | "danger" | "warning";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  children,
  variant = "solid",
  size = "md",
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle =
    "relative inline-flex items-center justify-center font-sans font-semibold tracking-wide transition-all duration-250 rounded-full focus:outline-none focus:ring-2 focus:ring-[#a3e635]/40 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]";

  const sizes = {
    sm: "px-4 py-1.5 text-[11px]",
    md: "px-5 py-2.5 text-xs",
    lg: "px-7 py-3 text-sm",
  };

  const variants = {
    solid:
      "bg-[#a3e635] text-black hover:bg-[#b4f246] hover:shadow-[0_0_20px_rgba(163,230,53,0.35)]",
    outlined:
      "bg-transparent text-[#fafafa] border border-white/10 hover:border-[#a3e635] hover:bg-[#a3e635]/5 hover:text-[#a3e635] hover:shadow-[0_0_15px_rgba(163,230,53,0.1)]",
    ghost:
      "bg-transparent text-zinc-400 hover:text-white hover:bg-white/5",
    danger:
      "bg-red-500 text-white hover:bg-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.35)]",
    warning:
      "bg-amber-500 text-black hover:bg-amber-400 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseStyle} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      <span className="pointer-events-none flex items-center justify-center gap-2">
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Syncing...</span>
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}
