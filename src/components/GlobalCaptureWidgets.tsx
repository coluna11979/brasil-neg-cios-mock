import { useLocation } from "react-router-dom";
import ExitIntentPopup from "./ExitIntentPopup";
import TopNotificationBar from "./TopNotificationBar";
import WhatsAppButton from "./WhatsAppButton";

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

  return (
    <>
      <TopNotificationBar />
      <WhatsAppButton />
      <ExitIntentPopup />
    </>
  );
};

export default GlobalCaptureWidgets;
