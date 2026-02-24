import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getListingById, formatCurrency, getCategoryName } from "@/data/mockListings";

const Anuncio = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const listing = getListingById(id || "");
  const images = listing?.imagens?.length ? listing.imagens : listing ? [listing.imagem] : [];
  const [currentImage, setCurrentImage] = useState(0);

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
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-background"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setCurrentImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
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
              </div>

              {/* Description */}
              <div className="mt-8">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  Sobre o Negócio
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  {listing.descricaoCompleta}
                </p>
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
                {listing.areaM2 && (
                  <div className="border-b border-border pb-4 mb-4">
                    <p className="text-sm text-muted-foreground">Área</p>
                    <p className="mt-1 font-display text-xl font-bold text-foreground">
                      {listing.areaM2} m²
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
                {listing.faturamentoMensal > 0 && (
                  <div className="border-b border-border py-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Faturamento Mensal</p>
                        <div className="mt-1 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-success" />
                          <span className="font-display text-xl font-bold text-success">
                            {formatCurrency(listing.faturamentoMensal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ROI */}
                {listing.faturamentoMensal > 0 && (
                  <div className="border-b border-border py-6">
                    <p className="text-sm text-muted-foreground">Retorno Estimado</p>
                    <p className="mt-1 font-display text-lg font-semibold text-foreground">
                      ~{Math.round(listing.preco / listing.faturamentoMensal)} meses
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
                    <Button variant="outline" className="flex-1 gap-2">
                      <Heart className="h-4 w-4" />
                      Salvar
                    </Button>
                    <Button variant="outline" className="flex-1 gap-2">
                      <Share2 className="h-4 w-4" />
                      Compartilhar
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
      </main>

      <Footer />
    </div>
  );
};

export default Anuncio;
