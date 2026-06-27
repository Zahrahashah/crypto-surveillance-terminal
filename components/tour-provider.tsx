"use client";

import React, { createContext, useContext, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

interface TourContextType {
  startTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const startTour = () => {
    if (pathname !== "/dashboard") {
      router.push("/dashboard");
      // Wait for navigation
      setTimeout(() => runDriver(), 600);
    } else {
      runDriver();
    }
  };

  const runDriver = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: "rgba(2, 2, 5, 0.8)",
      doneBtnText: "Finish Tour",
      nextBtnText: "Next Tip",
      prevBtnText: "Back",
      popoverClass: "driverjs-theme",
      onHighlightStarted: (element) => {
        // Reset scroll shifts of parents to ensure element coordinates are accurate
        window.scrollTo(0, 0);
        document.body.scrollTo(0, 0);
        document.documentElement.scrollTo(0, 0);
        const layoutRoot = document.getElementById("dashboard-layout-root");
        if (layoutRoot) {
          layoutRoot.scrollLeft = 0;
          layoutRoot.scrollTop = 0;
        }
        const mainContainer = document.getElementById("dashboard-main-container");
        if (mainContainer) {
          mainContainer.scrollLeft = 0;
          mainContainer.scrollTop = 0;
        }

        // Add stacking context override class to ancestors of the highlighted element
        if (element) {
          let parent = element.parentElement;
          while (parent && parent !== document.body) {
            parent.classList.add("driver-stacking-fix");
            parent = parent.parentElement;
          }
        }
      },
      onHighlighted: () => {
        // Double reset immediately after highlight rendering to correct any programmatic scroll jump
        window.scrollTo(0, 0);
        document.body.scrollTo(0, 0);
        document.documentElement.scrollTo(0, 0);
        const layoutRoot = document.getElementById("dashboard-layout-root");
        if (layoutRoot) {
          layoutRoot.scrollLeft = 0;
          layoutRoot.scrollTop = 0;
        }
        const mainContainer = document.getElementById("dashboard-main-container");
        if (mainContainer) {
          mainContainer.scrollLeft = 0;
          mainContainer.scrollTop = 0;
        }
      },
      onDeselected: (element) => {
        // Remove stacking context override class from ancestors when element is deselected
        if (element) {
          let parent = element.parentElement;
          while (parent && parent !== document.body) {
            parent.classList.remove("driver-stacking-fix");
            parent = parent.parentElement;
          }
        }
      },
      onDestroyed: () => {
        // Clean up stacking context overrides on all elements
        document.querySelectorAll(".driver-stacking-fix").forEach((el) => {
          el.classList.remove("driver-stacking-fix");
        });

        window.scrollTo(0, 0);
        document.body.scrollTo(0, 0);
        document.documentElement.scrollTo(0, 0);
        
        const mainEl = document.querySelector("main");
        if (mainEl) {
          mainEl.scrollTo(0, 0);
        }
        
        const layoutRoot = document.getElementById("dashboard-layout-root");
        if (layoutRoot) {
          layoutRoot.scrollLeft = 0;
          layoutRoot.scrollTop = 0;
        }

        const mainContainer = document.getElementById("dashboard-main-container");
        if (mainContainer) {
          mainContainer.scrollLeft = 0;
          mainContainer.scrollTop = 0;
        }

        // Clean up any other potential scrolled layout elements
        document.querySelectorAll("*").forEach((el) => {
          if (el.tagName !== "MAIN" && (el.scrollLeft > 0 || el.scrollTop > 0)) {
            el.scrollLeft = 0;
            el.scrollTop = 0;
          }
        });
      },
      steps: [
        {
          element: "#hud-brand-logo",
          popover: {
            title: "Crypto Sentry Dashboard",
            description: "Welcome to Crypto Sentry. This is your main control panel for tracking real-time cryptocurrency price changes.",
            side: "bottom",
          },
        },
        {
          element: "#top-navbar-search",
          popover: {
            title: "Search & Command Bar",
            description: "Quickly search for any cryptocurrency (like BTC, ETH, or Solana) to view its live price chart and details, or type commands.",
            side: "bottom",
          },
        },
        {
          element: "#system-status-indicator",
          popover: {
            title: "System Status",
            description: "Shows if the dashboard is currently connected to our real-time price monitoring system.",
            side: "bottom",
          },
        },
        {
          element: "#sidebar-navigation",
          popover: {
            title: "Navigation Menu",
            description: "Easily switch between the Live Prices board, Price Drops alert logs, Watchlist, and settings.",
            side: "right",
          },
        },
        {
          element: "#live-price-grid",
          popover: {
            title: "Live Prices board",
            description: "View live prices, 30-second trend charts, and track your favorite coins.",
            side: "top",
          },
        },
        {
          element: "#recent-price-drops",
          popover: {
            title: "Price Drops Feed",
            description: "A live feed of coins that dropped by 2% or more, letting you spot market drops instantly.",
            side: "left",
          },
        },
      ],
    });

    driverObj.drive();
    localStorage.setItem("sentry-onboarding-completed", "true");
  };

  // Auto-start on first dashboard mount
  useEffect(() => {
    if (pathname === "/dashboard") {
      const completed = localStorage.getItem("sentry-onboarding-completed");
      if (!completed) {
        const timer = setTimeout(() => {
          runDriver();
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname]);

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
