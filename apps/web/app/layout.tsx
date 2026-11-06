import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XERSXES Ghana | Environmental Intelligence",
  description: "Environmental monitoring research platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
