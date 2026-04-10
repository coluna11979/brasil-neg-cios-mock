import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { addLead } from "@/stores/leadStore";

const WHATSAPP_NUMBER = "5511999999999"; // Replace with real number

const WhatsAppButton = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [sent, setSent] = useState(false);

  const handleWhatsApp = () => {
    if (!showForm) {
      setShowForm(true);
      return;
    }

    // Capture lead before redirecting
    if (nome.trim()) {
      addLead({
        nome,
        email: "",
        telefone,
        mensagem: "Contato via WhatsApp",
        origem: "whatsapp",
      });
    }

    const message = encodeURIComponent(
      `Olá! Sou ${nome || "um visitante"} e gostaria de saber mais sobre as oportunidades no NegociaAky.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
    setSent(true);
    setTimeout(() => {
      setShowForm(false);
      setSent(false);
      setNome("");
      setTelefone("");
    }, 2000);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Mini form */}
      {showForm && !sent && (
        <div className="animate-fade-in w-72 rounded-2xl border border-border bg-card p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display font-semibold text-foreground text-sm">
              Fale conosco no WhatsApp
            </p>
            <button
              onClick={() => setShowForm(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Preencha seu nome para iniciar a conversa.
          </p>
          <input
            type="text"
            placeholder="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 mb-2"
          />
          <input
            type="tel"
            placeholder="Telefone (opcional)"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 mb-3"
          />
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Iniciar Conversa
          </button>
        </div>
      )}

      {sent && (
        <div className="animate-fade-in w-72 rounded-2xl border border-green-200 bg-green-50 p-4 shadow-xl text-center">
          <p className="text-sm font-medium text-green-700">Abrindo WhatsApp...</p>
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => (showForm ? handleWhatsApp() : setShowForm(true))}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="group flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-all hover:bg-green-600 hover:scale-110 hover:shadow-xl"
        aria-label="Falar no WhatsApp"
      >
        <MessageCircle className="h-6 w-6" fill="currentColor" />
        {/* Pulse */}
        <span className="absolute h-14 w-14 animate-ping rounded-full bg-green-500 opacity-20" />
      </button>

      {/* Tooltip */}
      {showTooltip && !showForm && (
        <div className="absolute bottom-16 right-0 whitespace-nowrap rounded-lg bg-foreground px-3 py-1.5 text-xs font-medium text-background shadow-lg">
          Fale conosco
        </div>
      )}
    </div>
  );
};

export default WhatsAppButton;
