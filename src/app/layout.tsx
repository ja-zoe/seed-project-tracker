import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// "Google Sans" isn't freely distributable; Inter is the closest open stand-in
// and is exposed through the same --font-sans token the design system expects.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "SEED Project Tracker",
  description:
    "Accountability and progress tracking for Rutgers SEED club projects — weekly check-ins, milestones, and health at a glance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  );
}
