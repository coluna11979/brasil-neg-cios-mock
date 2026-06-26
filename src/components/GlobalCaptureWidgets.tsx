import { useLocation } from "react-router-dom";
import ExitIntentPopup from "./ExitIntentPopup";
import TopNotificationBar from "./TopNotificationBar";

const GlobalCaptureWidgets = () => {
  const location = useLocation();

  // Don't show on admin, corretor, or /links pages
  if (
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/corretor") ||
    location.pathname === "/links"
  ) {
    return null;
  }

  // Chat flutuante: usa apenas o FloatingAgentHost (DB-driven, configuravel
  // em /admin/agentes). SofiaChat legado removido pra nao duplicar bolha.
  return (
    <>
      <TopNotificationBar />
      <ExitIntentPopup />
    </>
  );
};

export default GlobalCaptureWidgets;
