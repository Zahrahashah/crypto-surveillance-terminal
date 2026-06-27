import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: "accent" | "default";
  hoverGlow?: boolean;
  children?: React.ReactNode;
}

export function Card({
  children,
  variant = "default",
  hoverGlow = true,
  className = "",
  ...props
}: CardProps) {
  // Extract flex and grid layout classes to apply them to the inner wrapper
  const flexLayoutClasses = className
    .split(" ")
    .filter((c) => 
      c.startsWith("flex") || 
      c.startsWith("justify-") || 
      c.startsWith("items-") || 
      c.startsWith("gap-") || 
      c.startsWith("space-")
    )
    .join(" ");

  return (
    <motion.div
      className={`glass-panel rounded-2xl p-6 relative overflow-hidden ${
        variant === "accent" ? "border-[#a3e635]/35 shadow-[0_0_20px_rgba(163,230,53,0.08)]" : ""
      } ${className}`}
      whileHover={
        hoverGlow
          ? {
              y: -4,
              borderColor: "rgba(163, 230, 53, 0.55)",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(163, 230, 53, 0.18), inset 0 1px 0 rgba(163, 230, 53, 0.2)",
            }
          : undefined
      }
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
      {...props}
    >
      {/* Decorative ambient corner flare */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-full blur-2xl pointer-events-none" />
      {variant === "accent" && (
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#a3e635]/5 rounded-full blur-xl pointer-events-none" />
      )}
      <div className={`relative z-10 h-full w-full ${flexLayoutClasses}`}>{children}</div>
    </motion.div>
  );
}
