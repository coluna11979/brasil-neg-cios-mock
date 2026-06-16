import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";

/**
 * Botão "Instalar app" — aparece quando o navegador dispara o evento
 * `beforeinstallprompt` (Android/Chrome/Edge/Brave). No iPhone/Safari
 * mostramos instruções manuais (não há API nativa).
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPWAButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    // Já instalado (rodando em standalone)?
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (isStandalone) setInstalled(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosHelp(true);
    }
  };

  // Esconde se não houver prompt e não for iOS
  if (!deferredPrompt && !isIos) return null;

  return (
    <>
      <button
        onClick={handleInstall}
        className="flex w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
        title="Instale o NegociaAky como app no celular"
      >
        <Download className="h-4 w-4" />
        Instalar app no celular
      </button>

      {showIosHelp && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowIosHelp(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-bold">Instalar no iPhone</h3>
            </div>
            <ol className="space-y-2 text-sm text-foreground">
              <li>1. No Safari, toque no botão <strong>Compartilhar</strong> (📤) na barra inferior</li>
              <li>2. Role e toque em <strong>"Adicionar à Tela de Início"</strong></li>
              <li>3. Confirme o nome <strong>NegociaAky</strong> e toque em <strong>Adicionar</strong></li>
            </ol>
            <p className="mt-3 text-xs text-muted-foreground">
              ⚠️ Funciona apenas no <strong>Safari</strong>. No Chrome iOS o navegador não permite instalar.
            </p>
            <button
              onClick={() => setShowIosHelp(false)}
              className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPWAButton;
