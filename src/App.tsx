import { AboutSafetyPage } from "@/pages/AboutSafetyPage";
import { EvidenceFeedPage } from "@/pages/EvidenceFeedPage";
import { HomePage } from "@/pages/HomePage";
import { MapPage } from "@/pages/MapPage";
import { ModeratorDashboardPage } from "@/pages/ModeratorDashboardPage";
import { ModeratorLoginPage } from "@/pages/ModeratorLoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ReportDetailsPage } from "@/pages/ReportDetailsPage";
import { ReportPage } from "@/pages/ReportPage";
import { usePathname } from "@/utils/navigation";

export function App() {
  const pathname = usePathname();

  if (pathname === "/") return <HomePage />;
  if (pathname === "/map") return <MapPage />;
  if (pathname === "/report") return <ReportPage />;
  if (pathname === "/evidence") return <EvidenceFeedPage />;
  if (pathname === "/about") return <AboutSafetyPage />;
  if (pathname === "/moderator/login") return <ModeratorLoginPage />;
  if (pathname === "/moderator/dashboard") return <ModeratorDashboardPage />;

  const reportMatch = pathname.match(/^\/reports\/([^/]+)$/);
  if (reportMatch) return <ReportDetailsPage reportId={reportMatch[1]} />;

  return <NotFoundPage />;
}
