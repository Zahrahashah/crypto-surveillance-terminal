"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Portal Area */}
      <div className="fixed bottom-6 right-6 z-[99999] flex flex-col space-y-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleAnimationEnd = () => {
    if (!visible) {
      onClose(toast.id);
    }
  };

  const colors = {
    success: {
      border: "border-emerald-500/20",
      bg: "bg-[#091b12]/90 backdrop-blur-md",
      text: "text-emerald-400",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
      glow: "shadow-[0_12px_40px_rgba(16,185,129,0.1)]",
      bar: "bg-emerald-500",
    },
    error: {
      border: "border-red-500/20",
      bg: "bg-[#1c0c0e]/90 backdrop-blur-md",
      text: "text-red-400",
      icon: <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />,
      glow: "shadow-[0_12px_40px_rgba(239,68,68,0.1)]",
      bar: "bg-red-500",
    },
    info: {
      border: "border-[#a3e635]/20",
      bg: "bg-[#13170e]/90 backdrop-blur-md",
      text: "text-[#a3e635]",
      icon: <Info className="w-4 h-4 text-[#a3e635] shrink-0" />,
      glow: "shadow-[0_12px_40px_rgba(163,230,53,0.1)]",
      bar: "bg-[#a3e635]",
    },
  };

  const style = colors[toast.type];

  return (
    <div
      onAnimationEnd={handleAnimationEnd}
      className={`pointer-events-auto border ${style.border} ${style.bg} ${style.glow} p-4 rounded-xl flex items-start justify-between font-sans text-xs transition-all duration-300 relative overflow-hidden ${
        visible ? "animate-[slideIn_0.25s_ease-out_forwards]" : "animate-[slideOut_0.25s_ease-in_forwards]"
      }`}
    >
      <div className={`absolute top-0 left-0 w-1 h-full ${style.bar}`} />
      <div className="flex items-center space-x-3 pr-2">
        {style.icon}
        <div className="font-semibold text-zinc-100 tracking-wide">{toast.message}</div>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
