import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Crypto Surveillance Terminal",
  description: "Futuristic Real-Time Cyberpunk Crypto Price Monitoring and Flash Crash Survelliance Terminal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased select-none bg-transparent">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
