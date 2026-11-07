import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "xersxes | Ghana Galamsey Watch",
  description: "Environmental monitoring research platform",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><div className="bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">xersxes development demo: sample data only. Reports, uploads, and moderator access are simulated.</div>{children}</body>
    </html>
  );
}
