import type { ReactNode } from "react";
import { ModeratorLayout } from "@/components/layout/ModeratorLayout";

export default function Layout({ children }: { children: ReactNode }) {
  return <ModeratorLayout>{children}</ModeratorLayout>;
}
