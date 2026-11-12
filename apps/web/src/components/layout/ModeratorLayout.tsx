import type { ReactNode } from "react";
import { ModeratorSidebar } from "@/components/layout/ModeratorSidebar";

interface ModeratorLayoutProps {
  children: ReactNode;
}

export function ModeratorLayout({ children }: ModeratorLayoutProps) {
  return (
    <div className="min-h-screen min-w-0 bg-[#172021] font-sans text-[#172021] lg:grid lg:grid-cols-[208px_minmax(0,1fr)]">
      <ModeratorSidebar />
      <main id="operations-main" className="min-w-0 bg-[#f5f3ed]">
        {children}
      </main>
    </div>
  );
}
