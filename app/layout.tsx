import type { Metadata } from "next";
import { Radio_Canada } from "next/font/google";
import type { ReactNode } from "react";
import "react-day-picker/style.css";
import "./globals.css";

const radioCanada = Radio_Canada({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-radio-canada",
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "PDX Shows",
  description: "Upcoming concerts and live music in Portland, Oregon.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={radioCanada.variable}>
      <body>{children}</body>
    </html>
  );
}
