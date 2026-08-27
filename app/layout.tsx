import type { Metadata } from "next";
import type { ReactNode } from "react";
import "react-day-picker/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDX Shows",
  description: "Upcoming concerts and live music in Portland, Oregon.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
