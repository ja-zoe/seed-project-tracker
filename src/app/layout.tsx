import type { Metadata } from "next";
import { Inter, Gloock, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Body copy.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Display serif for editorial headings & big metrics.
const gloock = Gloock({ subsets: ["latin"], weight: "400", variable: "--font-gloock", display: "swap" });
// Technical labels / metadata.
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-jb", display: "swap" });

export const metadata: Metadata = {
  title: "SEED Project Tracker",
  description:
    "Accountability and progress tracking for Rutgers SEED club projects — weekly check-ins, milestones, and health at a glance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${gloock.variable} ${jetbrains.variable}`}>{children}</body>
    </html>
  );
}
