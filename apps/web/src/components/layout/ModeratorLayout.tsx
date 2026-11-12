import type { ReactNode } from "react";
import { ModeratorSidebar } from "@/components/layout/ModeratorSidebar";

interface ModeratorLayoutProps {
  children: ReactNode;
}

export function ModeratorLayout({ children }: ModeratorLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 lg:grid lg:grid-cols-[280px_1fr]">
      <ModeratorSidebar />
      <main className="min-w-0 bg-slate-100 text-slate-950">{children}</main>
    </div>
  );
}
