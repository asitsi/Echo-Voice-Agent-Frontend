import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Echo — AI Meeting Intelligence",
  description: "Turn every conversation into clarity, decisions, and action.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
