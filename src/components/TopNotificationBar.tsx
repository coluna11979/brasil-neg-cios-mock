import { useState } from "react";
import { Link } from "react-router-dom";
import { X, Sparkles } from "lucide-react";

const TopNotificationBar = () => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || sessionStorage.getItem("top_bar_dismissed") === "true") {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("top_bar_dismissed", "true");
  };

  return (
    <div className="relative bg-gradient-to-r from-primary via-primary to-accent text-white">
      <div className="container-app flex items-center justify-center gap-2 py-2.5 pr-8 text-center text-sm">
        <Sparkles className="h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">12 novos negócios esta semana!</span>
          <span className="hidden sm:inline"> — </span>
          <Link
            to="/busca"
            className="underline underline-offset-2 hover:no-underline font-medium"
          >
            Explore as oportunidades
          </Link>
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
        aria-label="Fechar barra de notificação"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default TopNotificationBar;
