import React, { useMemo } from "react";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: "accent" | "danger";
  className?: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 40,
  color = "accent",
  className = "",
}: SparklineProps) {
  const points = useMemo(() => {
    if (!data || data.length < 2) {
      return [
        { x: 0, y: height / 2 },
        { x: width, y: height / 2 },
      ];
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min === 0 ? 1 : max - min;
    const padding = 2; // pixel padding

    return data.map((val, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = padding + (1 - (val - min) / range) * (height - padding * 2);
      return { x, y };
    });
  }, [data, width, height]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
  }, [points]);

  const fillD = useMemo(() => {
    if (points.length === 0) return "";
    return `${pathD} L ${width} ${height} L 0 ${height} Z`;
  }, [pathD, width, height, points]);

  const themeColors = {
    accent: {
      stroke: "#a3e635",
      gradientStart: "rgba(163, 230, 53, 0.15)",
      gradientEnd: "rgba(163, 230, 53, 0.0)",
    },
    danger: {
      stroke: "#ef4444",
      gradientStart: "rgba(239, 68, 68, 0.15)",
      gradientEnd: "rgba(239, 68, 68, 0.0)",
    },
  };

  const currentTheme = themeColors[color];
  const gradientId = `sparkline-gradient-${color}-${Math.random().toString(36).substring(2, 6)}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`overflow-visible ${className}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={currentTheme.gradientStart} />
          <stop offset="100%" stopColor={currentTheme.gradientEnd} />
        </linearGradient>
      </defs>
      
      {/* Area under line */}
      <path d={fillD} fill={`url(#${gradientId})`} />

      {/* Sparkline path */}
      <path
        d={pathD}
        fill="none"
        stroke={currentTheme.stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-[drawSparkline_1.5s_ease-out_forwards]"
        style={{
          strokeDasharray: 300,
          strokeDashoffset: 300,
          animation: "drawSparkline 1.2s ease-out forwards",
        }}
      />

      {/* Pulsing end dot */}
      {points.length > 0 && (
        <g>
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="2.5"
            fill={currentTheme.stroke}
          />
          <circle
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="5"
            fill="none"
            stroke={currentTheme.stroke}
            strokeWidth="1"
            className="animate-ping opacity-60"
            style={{ transformOrigin: `${points[points.length - 1].x}px ${points[points.length - 1].y}px` }}
          />
        </g>
      )}
    </svg>
  );
}
