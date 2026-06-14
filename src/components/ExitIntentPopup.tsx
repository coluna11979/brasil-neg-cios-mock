import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { X, Gift, ArrowRight, Phone } from "lucide-react";
import { addLead, isLeadCaptured } from "@/stores/leadStore";
import { supabase } from "@/lib/supabase";

const ExitIntentPopup = () => {
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Não mostra o popup pra quem está logado (admin/corretor têm sessão Supabase)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsStaff(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setIsStaff(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Em rotas de painel nunca mostra (mesmo que a sessão demore a carregar)
  const isPainel = location.pathname.startsWith("/admin") || location.pathname.startsWith("/corretor");

  const handleMouseLeave = useCallback((e: MouseEvent) => {
    if (e.clientY <= 5) {
      if (isStaff || isPainel) return;            // logado ou em painel
      if (isLeadCaptured()) return;               // já virou lead
      if (sessionStorage.getItem("exit_popup_shown") === "true") return;
      sessionStorage.setItem("exit_popup_shown", "true");
      setShow(true);
    }
  }, [isStaff, isPainel]);

  useEffect(() => {
    if (isStaff || isPainel) return; // nem registra o listener pra staff
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 5000);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [handleMouseLeave, isStaff, isPainel]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !telefone.trim()) return;

    await addLead({
      nome: nome || "Lead Exit Intent",
      email,
      telefone: telefone || undefined,
      mensagem: "Capturado via exit intent popup",
      origem: "exit-intent",
    });

    localStorage.setItem("negociaaky_subscribed", "true");
    setSubmitted(true);
    setTimeout(() => setShow(false), 2500);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setShow(false)}
      />

      <div className="relative animate-fade-in w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        <button
          onClick={() => setShow(false)}
          className="absolute right-4 top-4 z-10 text-muted-foreground hover:text-foreground"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="gradient-hero px-6 py-8 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm mb-4">
            <Gift className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-display text-2xl font-bold text-white">
            Espere! Não vá ainda
          </h2>
          <p className="mt-2 text-white/80 text-sm">
            Cadastre-se e receba oportunidades exclusivas antes de todo mundo.
          </p>
        </div>

        {/* Form */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-4">
              <p className="font-semibold text-green-600">Cadastro realizado com sucesso!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Você receberá nossas melhores oportunidades.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <input
                type="email"
                placeholder="Seu melhor e-mail *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {/* WhatsApp — campo novo */}
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600" />
                <input
                  type="tel"
                  placeholder="WhatsApp *"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
              </div>
              <p className="text-[11px] text-muted-foreground px-1">
                📱 Se informar o WhatsApp, um consultor pode entrar em contato direto com você.
              </p>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-accent-foreground hover:bg-accent/90 transition-colors"
              >
                Quero Receber Oportunidades
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShow(false)}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1"
              >
                Não, obrigado
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExitIntentPopup;
