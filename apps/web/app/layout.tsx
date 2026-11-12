import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "XERSXES Ghana | Environmental Intelligence",
  description:
    "Map-first environmental intelligence and civic evidence platform for Ghana.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="bg-amber-50 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
          Development | demonstration monitoring boundaries
        </div>
        {children}
      </body>
    </html>
  );
}
