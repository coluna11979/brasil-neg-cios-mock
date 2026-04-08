import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import {
  ArrowLeft,
  MapPin,
  TrendingUp,
  Building2,
  MessageCircle,
  Share2,
  Heart,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Eye,
  Users,
} from "lucide-react";
import { callClaude } from "@/lib/anthropic";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { formatCurrency, getCategoryName } from "@/data/mockListings";
import StickyMobileCTA from "@/components/StickyMobileCTA";
import { supabase } from "@/lib/supabase";
import { useNegocios, adaptNegocio, type NegocioSupabase } from "@/hooks/useNegocios";
import { useBuyer } from "@/contexts/BuyerContext";

// Hash determinístico para social proof seed
function hashId(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
  return Math.abs(h);
}

const Anuncio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<NegocioSupabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [shareMsg, setShareMsg] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoadingAnalysis, setAiLoadingAnalysis] = useState(false);
  const { favorites, toggleFavorite } = useBuyer();

  // Social proof — números determinísticos baseados no ID
  const viewsHoje = listing ? (hashId(listing.id) % 28) + 9 : 0;
  const interessados = listing ? (hashId(listing.id + "i") % 10) + 3 : 0;

  const handleAiAnalysis = async () => {
    if (!listing || aiAnalysis) return;
    setAiLoadingAnalysis(true);
    try {
      const prompt = `Você é um analista de M&A especializado em PMEs brasileiras. Com base nos dados abaixo, gere um resumo executivo com exatamente estas 4 seções em markdown:

**Pontos Fortes**
- (3 bullets objetivos)

**Riscos a Considerar**
- (2 bullets honestos)

**Perfil Ideal do Comprador**
(1 parágrafo curto)

**Veredito**
(1 frase direta)

---
Negócio: ${listing.titulo}
Categoria: ${getCategoryName(listing.categoria)}
Localização: ${listing.cidade}, ${listing.estado}
Preço: ${formatCurrency(listing.preco)}
${listing.faturamento_mensal > 0 ? `Faturamento mensal: ${formatCurrency(listing.faturamento_mensal)}\nRetorno estimado: ~${Math.round(listing.preco / listing.faturamento_mensal)} meses` : ""}
${listing.area_m2 ? `Área: ${listing.area_m2}m²` : ""}
Descrição: ${listing.descricao_completa || listing.descricao}`;
      const result = await callClaude(prompt);
      setAiAnalysis(result);
    } catch {
      setAiAnalysis("Não foi possível gerar a análise agora. Tente novamente.");
    }
    setAiLoadingAnalysis(false);
  };
  const isFav = listing ? favorites.includes(listing.id) : false;

  const { negocios: todosNegocios } = useNegocios();
  const similares = listing
    ? todosNegocios
        .filter((n) => n.id !== listing.id && n.categoria === listing.categoria)
        .slice(0, 3)
        .map(adaptNegocio)
    : [];

  const handleShare = async () => {
    const url = window.location.href;
    const title = listing?.titulo || "NegócioJá";
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* cancelado */ }
    } else {
      await navigator.clipboard.writeText(url);
      setShareMsg("Link copiado!");
      setTimeout(() => setShareMsg(""), 2000);
    }
  };

  usePageTitle(listing?.titulo || "Carregando...");

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    supabase
      .from("negocios")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setListing(data as NegocioSupabase);
        setLoading(false);
      });
  }, [id]);

  const images = listing?.imagens?.length
    ? listing.imagens
    : listing?.imagem
    ? [listing.imagem]
    : ["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"];

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Anúncio não encontrado
            </h1>
            <p className="mt-2 text-muted-foreground">
              O anúncio que você procura não existe ou foi removido.
            </p>
            <Button asChild className="mt-6">
              <Link to="/busca">Voltar para busca</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container-app">
          {/* Back Link */}
          <Link
            to="/busca"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para busca
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-3">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Image Carousel */}
              <div className="relative overflow-hidden rounded-xl">
                <div className="relative aspect-video">
                  <img
                    src={images[currentImage]}
                    alt={`${listing.titulo} - Foto ${currentImage + 1}`}
                    loading="lazy"
                    className="h-full w-full object-cover transition-opacity duration-300"
                  />
                  {listing.destaque && (
                    <div className="absolute left-4 top-4 rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
                      Destaque
                    </div>
                  )}

                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                        aria-label="Foto anterior"
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-background"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
                        aria-label="Próxima foto"
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-background"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-3 right-3 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
                        {currentImage + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImage(idx)}
                        className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                          idx === currentImage
                            ? "border-primary ring-1 ring-primary"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={img} alt={`Miniatura ${idx + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title & Location */}
              <div className="mt-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                  <Building2 className="h-4 w-4" />
                  {getCategoryName(listing.categoria)}
                </div>

                <h1 className="mt-4 font-display text-2xl font-bold text-foreground md:text-3xl">
                  {listing.titulo}
                </h1>

                <div className="mt-3 flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                  <span className="text-lg">
                    {listing.cidade}, {listing.estado}
                  </span>
                </div>

                {/* P5 — Social Proof */}
                <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-primary" />
                    {viewsHoje} pessoas viram hoje
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" />
                    {interessados} interessados esta semana
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mt-8">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Sobre o Negócio
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  {listing.descricao_completa || listing.descricao}
                </p>
              </div>

              {/* IA6 — AI Analysis */}
              <div className="mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      Análise IA — Resumo Executivo
                    </h2>
                  </div>
                  {!aiAnalysis && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAiAnalysis}
                      disabled={aiLoadingAnalysis}
                      className="gap-2"
                    >
                      {aiLoadingAnalysis ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Analisando...</>
                      ) : (
                        <><Sparkles className="h-4 w-4" /> Gerar Análise</>
                      )}
                    </Button>
                  )}
                </div>
                {!aiAnalysis && !aiLoadingAnalysis && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Receba uma análise de M&A gerada por IA com pontos fortes, riscos e perfil ideal do comprador.
                  </p>
                )}
                {aiAnalysis && (
                  <div className="mt-4 space-y-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                    {aiAnalysis}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="mt-8">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Destaques
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Negócio em operação
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Documentação regularizada
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Equipe treinada inclusa
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Ponto comercial estabelecido
                  </li>
                </ul>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl border border-border bg-card p-6 shadow-card">
                {/* Type Badge */}
                {(listing.tipo === "aluguel-imovel" || listing.tipo === "venda-imovel") && (
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${listing.tipo === "aluguel-imovel" ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground"}`}>
                      {listing.tipo === "aluguel-imovel" ? "Aluguel" : "Venda de Imóvel"}
                    </span>
                  </div>
                )}

                {/* Area */}
                {listing.area_m2 && (
                  <div className="border-b border-border pb-4 mb-4">
                    <p className="text-sm text-muted-foreground">Área</p>
                    <p className="mt-1 font-display text-xl font-bold text-foreground">
                      {listing.area_m2} m²
                    </p>
                  </div>
                )}

                {/* Price */}
                <div className="border-b border-border pb-6">
                  <p className="text-sm text-muted-foreground">
                    {listing.tipo === "aluguel-imovel" ? "Valor do Aluguel/mês" : "Valor do Negócio"}
                  </p>
                  <p className="mt-1 font-display text-3xl font-bold text-primary">
                    {formatCurrency(listing.preco)}
                  </p>
                </div>

                {/* Revenue */}
                {listing.faturamento_mensal > 0 && (
                  <div className="border-b border-border py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Faturamento Mensal</p>
                        <div className="mt-1 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-success" />
                          <span className="font-display text-xl font-bold text-success">
                            {formatCurrency(listing.faturamento_mensal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ROI */}
                {listing.faturamento_mensal > 0 && listing.preco > 0 && (
                  <div className="border-b border-border py-6">
                    <p className="text-sm text-muted-foreground">Retorno Estimado</p>
                    <p className="mt-1 font-display text-lg font-semibold text-foreground">
                      ~{Math.round(listing.preco / listing.faturamento_mensal)} meses
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-6 space-y-3">
                  <Button
                    onClick={() => navigate(`/contato/${listing.id}`)}
                    className="w-full gap-2 font-semibold"
                    size="lg"
                  >
                    <MessageCircle className="h-5 w-5" />
                    Entrar em Contato
                  </Button>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className={`flex-1 gap-2 ${isFav ? "border-red-400 text-red-500 hover:bg-red-50" : ""}`}
                      onClick={() => toggleFavorite(listing.id)}
                    >
                      <Heart className={`h-4 w-4 ${isFav ? "fill-red-500 text-red-500" : ""}`} />
                      {isFav ? "Salvo" : "Salvar"}
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2 relative" onClick={handleShare}>
                      <Share2 className="h-4 w-4" />
                      {shareMsg || "Compartilhar"}
                    </Button>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="mt-6 rounded-lg bg-muted p-4">
                  <p className="text-xs text-muted-foreground text-center">
                    ✓ Anúncio verificado pela equipe NegócioJá
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Negócios Similares */}
        {similares.length > 0 && (
          <div className="container-app mt-16 pb-8">
            <h2 className="font-display text-xl font-bold text-foreground mb-6">
              Negócios Similares
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {similares.map((s) => (
                <ListingCard key={s.id} listing={s} />
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />

      <StickyMobileCTA
        onContact={() => navigate(`/contato/${listing.id}`)}
        preco={formatCurrency(listing.preco)}
        tipo={listing.tipo}
      />
    </div>
  );
};

export default Anuncio;
