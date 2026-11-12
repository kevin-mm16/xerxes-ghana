import type { Metadata } from "next";
import localFont from "next/font/local";
import "leaflet/dist/leaflet.css";
import "@/styles/globals.css";

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
  fallback: ["Arial", "sans-serif"],
});
const newsreader = localFont({
  src: "./fonts/newsreader-latin.woff2",
  variable: "--font-newsreader",
  weight: "200 800",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const metadata: Metadata = {
  title: "XERSXES Ghana | Environmental Intelligence",
  description:
    "Map-first environmental intelligence and civic evidence platform for Ghana.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
