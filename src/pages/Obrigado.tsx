import { useSearchParams, Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { CheckCircle, MessageCircle, Search, Star, ArrowRight, Clock } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";

const Obrigado = () => {
  usePageTitle("Mensagem Enviada!");
  const [searchParams] = useSearchParams();

  const nome = searchParams.get("nome") || "você";
  const negocio = searchParams.get("negocio") || "o negócio";
  const telefone = searchParams.get("telefone") || "";
  const tipo = searchParams.get("tipo") || "negocio"; // "negocio" | "galeria"

  const waLink = telefone
    ? `https://wa.me/55${telefone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá ${nome}! Vi seu interesse em *${negocio}* aqui pela NegócioJá. Posso te ajudar com mais informações? 😊`)}`
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 md:py-24 bg-gradient-to-b from-primary/5 to-background">
          <div className="container-app">
            <div className="mx-auto max-w-lg text-center">
              {/* Ícone animado */}
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 ring-8 ring-green-50">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>

              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Mensagem enviada!
              </h1>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                Oi <strong className="text-foreground">{nome}</strong>! Recebemos seu interesse em{" "}
                <strong className="text-foreground">{negocio}</strong>.<br />
                Um corretor especializado vai entrar em contato pelo seu WhatsApp em breve.
              </p>

              {/* Timeline */}
              <div className="mt-10 rounded-2xl border border-border bg-card p-6 text-left space-y-4">
                <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wide text-center mb-2">
                  O que acontece agora?
                </h3>
                {[
                  { icon: Clock, label: "Agora", desc: "Seu interesse foi registrado e encaminhado ao corretor responsável." },
                  { icon: MessageCircle, label: "Em até 1h", desc: "O corretor entrará em contato pelo seu WhatsApp para entender seu perfil." },
                  { icon: Star, label: "Próximos dias", desc: "Se houver match, agendamos uma visita ou videochamada para negociação." },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                {waLink && (
                  <Button asChild size="lg" className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                    <a href={waLink} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-5 w-5" />
                      Falar no WhatsApp agora
                    </a>
                  </Button>
                )}
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link to="/busca">
                    <Search className="h-5 w-5" />
                    Ver outros negócios
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Nudge — outros negócios */}
        <section className="py-12 border-t border-border">
          <div className="container-app text-center">
            <p className="text-muted-foreground text-sm mb-4">
              Enquanto aguarda, que tal explorar mais oportunidades?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: "Restaurantes & Alimentação", to: "/busca?categoria=alimentacao" },
                { label: "Salões & Beleza", to: "/busca?categoria=beleza" },
                { label: "Imóveis Comerciais", to: "/imoveis" },
                { label: "Espaços em Galerias", to: "/galerias" },
              ].map(({ label, to }) => (
                <Link
                  key={label}
                  to={to}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted hover:border-primary/30 transition-colors"
                >
                  {label}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Obrigado;
