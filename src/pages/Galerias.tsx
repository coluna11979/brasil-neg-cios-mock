import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { ArrowLeft, MapPin, Maximize2, Building2, DollarSign, Store, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { formatCurrency } from "@/data/mockListings";
import { useGalerias, type EspacoSupabase } from "@/hooks/useNegocios";

const getTipoEspacoLabel = (tipo: EspacoSupabase["tipo"]) => {
  const labels = { loja: "Loja", sala: "Sala", quiosque: "Quiosque", box: "Box" };
  return labels[tipo];
};

const getTipoEspacoColor = (tipo: EspacoSupabase["tipo"]) => {
  const colors = {
    loja: "bg-blue-100 text-blue-700",
    sala: "bg-purple-100 text-purple-700",
    quiosque: "bg-amber-100 text-amber-700",
    box: "bg-green-100 text-green-700",
  };
  return colors[tipo];
};

const Galerias = () => {
  usePageTitle("Espaços em Galerias");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const galeriaIdParam = searchParams.get("id");

  const { galerias: todasGalerias, loading } = useGalerias();

  // Se veio com ?id=, mostra só aquela galeria já expandida
  const galeriasParaExibir = galeriaIdParam
    ? todasGalerias.filter(g => g.id === galeriaIdParam)
    : todasGalerias;

  const [expandedGaleria, setExpandedGaleria] = useState<string | null>(galeriaIdParam);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container-app">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Home
          </Link>

          <div className="mt-6 mx-auto max-w-4xl">
            {/* Dobra explicativa */}
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    {galeriaIdParam && galeriasParaExibir.length > 0
                      ? galeriasParaExibir[0].nome
                      : "Espaços em Galeria"}
                  </h1>
                  <p className="mt-2 text-muted-foreground">
                    {galeriaIdParam && galeriasParaExibir.length > 0
                      ? galeriasParaExibir[0].descricao
                      : "Encontre o ponto ideal para o seu negócio! Navegue pelas galerias comerciais disponíveis e escolha entre lojas, salas, boxes e quiosques com diferentes tamanhos e valores."}
                  </p>
                </div>
              </div>
            </div>

            {/* Link para ver todas quando está filtrando */}
            {galeriaIdParam && (
              <div className="mt-4">
                <Link
                  to="/galerias"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Ver todas as galerias
                </Link>
              </div>
            )}

            {/* Lista de Galerias */}
            <div className="mt-8 space-y-4">
              {galeriasParaExibir.map((galeria) => {
                const livres = galeria.espacos.filter(e => e.disponivel).length;
                const isExpanded = expandedGaleria === galeria.id;

                return (
                  <div
                    key={galeria.id}
                    id={`galeria-${galeria.id}`}
                    className={`rounded-lg border transition-all ${
                      isExpanded
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedGaleria(isExpanded ? null : galeria.id)}
                      className="flex w-full items-start gap-4 p-4 text-left"
                    >
                      <img
                        src={galeria.imagem ?? "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"}
                        alt={galeria.nome}
                        className="h-20 w-20 shrink-0 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="font-display font-bold text-foreground">
                            {galeria.nome}
                          </h2>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground" />
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {galeria.endereco} — {galeria.cidade}/{galeria.estado}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {galeria.descricao}
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                            {livres} espaço{livres !== 1 ? "s" : ""} disponível{livres !== 1 ? "is" : ""}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {galeria.espacos.length} total
                          </span>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border px-4 pb-4 pt-3">
                        <h3 className="mb-3 text-sm font-semibold text-foreground">
                          Espaços Disponíveis
                        </h3>
                        {livres === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhum espaço disponível nesta galeria no momento.
                          </p>
                        ) : (
                          <Carousel opts={{ align: "start", loop: false }}>
                            <CarouselContent className="-ml-3">
                              {galeria.espacos
                                .filter((e) => e.disponivel)
                                .map((espaco) => (
                                  <CarouselItem key={espaco.id} className="pl-3 basis-[85%] sm:basis-1/2 lg:basis-1/3">
                                    <div className="rounded-lg border border-border bg-background p-4 transition-shadow hover:shadow-md h-full flex flex-col">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-foreground">
                                          {espaco.numero}
                                        </span>
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${getTipoEspacoColor(
                                            espaco.tipo
                                          )}`}
                                        >
                                          {getTipoEspacoLabel(espaco.tipo)}
                                        </span>
                                      </div>

                                      <p className="mt-2 text-sm text-muted-foreground flex-1">
                                        {espaco.descricao}
                                      </p>

                                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                          <Maximize2 className="h-3.5 w-3.5" />
                                          {espaco.area_m2}m²
                                        </div>
                                        {espaco.andar && (
                                          <div className="flex items-center gap-1 text-muted-foreground">
                                            <Building2 className="h-3.5 w-3.5" />
                                            {espaco.andar}
                                          </div>
                                        )}
                                        <div className="flex items-center gap-1 font-semibold text-primary">
                                          <DollarSign className="h-3.5 w-3.5" />
                                          {formatCurrency(espaco.valor_aluguel)}/mês
                                        </div>
                                      </div>

                                      <Button
                                        type="button"
                                        size="sm"
                                        className="mt-3 w-full"
                                        onClick={() =>
                                          navigate(`/contato/galeria?galeriaId=${galeria.id}&espacoId=${espaco.id}`)
                                        }
                                      >
                                        Tenho Interesse
                                      </Button>
                                    </div>
                                  </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="-left-3 hidden md:flex" />
                            <CarouselNext className="-right-3 hidden md:flex" />
                          </Carousel>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Galerias;
