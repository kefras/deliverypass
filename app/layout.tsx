import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DeliveryPass — A better address for every delivery",
  description: "Collect delivery instructions, validate Nigerian postcodes, and prepare orders for dispatch.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
