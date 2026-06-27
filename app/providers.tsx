"use client";

import { SessionProvider } from "next-auth/react";
import React from "react";
import { ToastProvider } from "@/components/ui/toast";
import { TourProvider } from "@/components/tour-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <TourProvider>{children}</TourProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
