import { useLocation } from "react-router-dom";
import ExitIntentPopup from "./ExitIntentPopup";
import TopNotificationBar from "./TopNotificationBar";
import AIChatbot from "./AIChatbot";

const GlobalCaptureWidgets = () => {
  const location = useLocation();

  // Don't show on admin or corretor pages
  if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/corretor")) {
    return null;
  }

  return (
    <>
      <TopNotificationBar />
      <AIChatbot />
      <ExitIntentPopup />
    </>
  );
};

export default GlobalCaptureWidgets;
