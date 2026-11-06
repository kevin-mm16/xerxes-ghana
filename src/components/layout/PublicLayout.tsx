import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { PublicNavbar } from "@/components/layout/PublicNavbar";

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <PublicNavbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
