import { useState } from "react";
import { Mail, ArrowRight, CheckCircle, X, Phone } from "lucide-react";
import { addLead } from "@/stores/leadStore";

const EmailCaptureBanner = () => {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || sessionStorage.getItem("email_banner_dismissed") === "true") return null;
  if (localStorage.getItem("negociaaky_subscribed") === "true") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    await addLead({
      nome: nome || "Assinante Newsletter",
      email,
      telefone: telefone || undefined,
      mensagem: "Inscrição na newsletter - quer receber oportunidades por e-mail",
      origem: "newsletter",
    });

    localStorage.setItem("negociaaky_subscribed", "true");
    setSubmitted(true);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("email_banner_dismissed", "true");
  };

  if (submitted) {
    return (
      <section className="relative bg-gradient-to-r from-primary/5 via-secondary to-primary/5 py-8">
        <div className="container-app text-center">
          <div className="inline-flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Pronto! Você receberá as melhores oportunidades.</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-primary/5 via-secondary to-primary/5 py-10">
      <button
        onClick={handleDismiss}
        className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="container-app">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            <Mail className="h-4 w-4" />
            Newsletter Exclusiva
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Receba Oportunidades no Seu E-mail
          </h2>
          <p className="mt-2 text-muted-foreground">
            Seja o primeiro a saber de novos negócios à venda na sua região e segmento.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3 mx-auto max-w-lg">
            {/* Linha 1: Nome + Email */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <input
                type="email"
                placeholder="Seu melhor e-mail *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {/* Linha 2: WhatsApp + Botão */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600" />
                <input
                  type="tel"
                  placeholder="WhatsApp *"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  required
                  className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                />
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
              >
                Quero Receber
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              📱 Enviaremos oportunidades diretamente no seu WhatsApp. Sem spam.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default EmailCaptureBanner;
