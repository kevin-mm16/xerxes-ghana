"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { PublicNavbar } from "@/components/layout/PublicNavbar";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const pathname = usePathname();
  const immersiveMap = pathname === "/map";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <PublicNavbar />
      <main>{children}</main>
      {!immersiveMap ? <Footer /> : null}
    </div>
  );
}
