import { useState, useEffect, lazy, Suspense } from "react";
import { useSearchParams, Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { ArrowLeft, Filter, X, Sparkles, MapPin, LayoutList, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import {
  categorias,
  faixasPreco,
  getCategoryName,
} from "@/data/mockListings";
import { useNegocios, adaptNegocio } from "@/hooks/useNegocios";

const MapView = lazy(() => import("@/components/MapView"));

const FATURAMENTOS = [
  { label: "Qualquer faturamento", value: 0 },
  { label: "A partir de R$ 10.000/mês", value: 10000 },
  { label: "A partir de R$ 30.000/mês", value: 30000 },
  { label: "A partir de R$ 50.000/mês", value: 50000 },
  { label: "A partir de R$ 100.000/mês", value: 100000 },
];

const BAIRROS_SP = [
  "Centro", "Paulista", "Jardins", "Pinheiros", "Moema", "Itaim Bibi",
  "Vila Olímpia", "Vila Mariana", "Consolação", "Perdizes", "Lapa",
  "Santana", "Tatuapé", "Penha", "Ipiranga", "Santo André",
  "São Bernardo", "Guarulhos", "Osasco", "Zona Norte", "Zona Sul",
  "Zona Leste", "Zona Oeste",
];

const Busca = () => {
  usePageTitle("Oportunidades de Negócio");
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"lista" | "mapa">("lista");

  const query = searchParams.get("q") || "";
  const categoriaParam = searchParams.get("categoria") || "";
  const tipoParam = searchParams.get("tipo") || "";
  const precoParam = searchParams.get("preco") || "";
  const faturamentoParam = searchParams.get("faturamento") || "0";
  const bairroParam = searchParams.get("bairro") || "";

  const [categoria, setCategoria] = useState(categoriaParam);
  const [tipo, setTipo] = useState(tipoParam);
  const [preco, setPreco] = useState(precoParam);
  const [faturamento, setFaturamento] = useState(faturamentoParam);
  const [bairro, setBairro] = useState(bairroParam);
  const [busca, setBusca] = useState(query);

  useEffect(() => {
    setCategoria(categoriaParam);
    setTipo(tipoParam);
    setPreco(precoParam);
    setFaturamento(faturamentoParam);
    setBairro(bairroParam);
    setBusca(query);
  }, [categoriaParam, tipoParam, precoParam, faturamentoParam, bairroParam, query]);

  const faixa = faixasPreco.find((f) => f.label === preco);
  const faturamentoMin = parseInt(faturamento, 10) || 0;

  const { negocios: negociosRaw, loading } = useNegocios({
    categoria: categoria || undefined,
    tipo: tipo || undefined,
    busca: busca || undefined,
    preco_min: faixa?.min,
    preco_max: faixa?.max,
    faturamento_min: faturamentoMin > 0 ? faturamentoMin : undefined,
    bairro: bairro || undefined,
  });

  const filteredListings = negociosRaw.map(adaptNegocio);
  const hasActiveFilters = categoria || tipo || preco || busca || faturamentoMin > 0 || bairro;

  // Group listings by category for categorized view
  const listingsByCategory: Record<string, typeof filteredListings> = {};
  filteredListings.forEach((listing) => {
    if (!listingsByCategory[listing.categoria]) {
      listingsByCategory[listing.categoria] = [];
    }
    listingsByCategory[listing.categoria].push(listing);
  });

  const featuredListings = filteredListings.filter((l) => l.destaque);

  const handleSearch = (newQuery: string, newTipo?: string) => {
    setBusca(newQuery);
    const params = new URLSearchParams(searchParams);
    if (newQuery) {
      params.set("q", newQuery);
    } else {
      params.delete("q");
    }
    if (newTipo) {
      params.set("tipo", newTipo);
      setTipo(newTipo);
    } else {
      params.delete("tipo");
      setTipo("");
    }
    setSearchParams(params);
  };

  const handleFilterChange = (type: string, value: string) => {
    const params = new URLSearchParams(searchParams);

    if (value && value !== "all" && value !== "0") {
      params.set(type, value);
    } else {
      params.delete(type);
    }

    setSearchParams(params);

    if (type === "categoria") setCategoria(value === "all" ? "" : value);
    if (type === "preco") setPreco(value === "all" ? "" : value);
    if (type === "faturamento") setFaturamento(value === "0" ? "0" : value);
    if (type === "bairro") setBairro(value === "all" ? "" : value);
  };

  const clearFilters = () => {
    setSearchParams({});
    setCategoria("");
    setTipo("");
    setPreco("");
    setFaturamento("0");
    setBairro("");
    setBusca("");
  };

  // If a specific category is selected, show flat grid
  const isFilteredView = !!hasActiveFilters;

  const faturamentoLabel =
    FATURAMENTOS.find((f) => String(f.value) === faturamento)?.label ||
    "Qualquer faturamento";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container-app">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a Home
          </Link>

          {/* Page Header */}
          <div className="mt-6">
            <h1 className="font-display text-3xl font-bold text-foreground">
              Oportunidades de Negócio
            </h1>
            <p className="mt-2 text-muted-foreground">
              Explore as melhores oportunidades organizadas por segmento
            </p>
          </div>

          {/* Search Bar */}
          <div className="mt-6">
            <SearchBar initialValue={busca} onSearch={handleSearch} />
          </div>

          {/* Filters Toggle (Mobile) */}
          <div className="mt-6 flex items-center justify-between md:hidden">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {hasActiveFilters && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  !
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2 text-sm">
                <X className="h-4 w-4" />
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Filters */}
          <div
            className={`mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 ${
              showFilters ? "block" : "hidden md:grid"
            }`}
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Categoria
              </label>
              <Select
                value={categoria || "all"}
                onValueChange={(value) => handleFilterChange("categoria", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Faixa de Preço
              </label>
              <Select
                value={preco || "all"}
                onValueChange={(value) => handleFilterChange("preco", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer valor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer valor</SelectItem>
                  {faixasPreco.map((faixa) => (
                    <SelectItem key={faixa.label} value={faixa.label}>
                      {faixa.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Faturamento mínimo
              </label>
              <Select
                value={faturamento || "0"}
                onValueChange={(value) => handleFilterChange("faturamento", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer faturamento" />
                </SelectTrigger>
                <SelectContent>
                  {FATURAMENTOS.map((f) => (
                    <SelectItem key={f.value} value={String(f.value)}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Bairro / Região
              </label>
              <Select
                value={bairro || "all"}
                onValueChange={(value) => handleFilterChange("bairro", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer bairro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer bairro</SelectItem>
                  {BAIRROS_SP.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden items-end lg:flex">
              {hasActiveFilters ? (
                <Button variant="ghost" onClick={clearFilters} className="gap-2 w-full">
                  <X className="h-4 w-4" />
                  Limpar filtros
                </Button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground w-full">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  São Paulo — SP
                </div>
              )}
            </div>
          </div>

          {/* Active Filters Tags */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {busca && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                  Busca: "{busca}"
                  <button
                    onClick={() => handleSearch("")}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {categoria && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                  {getCategoryName(categoria)}
                  <button
                    onClick={() => handleFilterChange("categoria", "all")}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {tipo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                  {tipo === "negocio" ? "Negócio" : tipo === "imovel" ? "Imóvel" : tipo === "salao" ? "Salão Comercial" : tipo === "galeria" ? "Galeria" : tipo === "franquia" ? "Franquia" : tipo}
                  <button
                    onClick={() => handleSearch(busca, undefined)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {preco && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                  {preco}
                  <button
                    onClick={() => handleFilterChange("preco", "all")}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {faturamentoMin > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                  {faturamentoLabel}
                  <button
                    onClick={() => handleFilterChange("faturamento", "0")}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {bairro && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                  <MapPin className="h-3 w-3" />{bairro}
                  <button
                    onClick={() => handleFilterChange("bairro", "all")}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Results Count + View Toggle */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {loading ? "Carregando..." : `${filteredListings.length} oportunidade${filteredListings.length !== 1 ? "s" : ""} encontrada${filteredListings.length !== 1 ? "s" : ""}`}
            </div>

            {/* View mode toggle */}
            <div className="inline-flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("lista")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                  viewMode === "lista"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <LayoutList className="h-4 w-4" />
                Lista
              </button>
              <button
                onClick={() => setViewMode("mapa")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-l border-border transition-colors ${
                  viewMode === "mapa"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                <Map className="h-4 w-4" />
                Mapa
              </button>
            </div>
          </div>

          {/* Map View */}
          {viewMode === "mapa" ? (
            <div className="mt-6">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-[500px] rounded-xl border border-border bg-muted text-muted-foreground text-sm">
                    Carregando mapa...
                  </div>
                }
              >
                <MapView listings={filteredListings} />
              </Suspense>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="mt-12 text-center">
              <div className="mx-auto max-w-md">
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Nenhuma oportunidade encontrada
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Tente ajustar os filtros ou fazer uma nova busca.
                </p>
                <Button onClick={clearFilters} variant="outline" className="mt-4">
                  Limpar todos os filtros
                </Button>
              </div>
            </div>
          ) : isFilteredView ? (
            /* Filtered view - flat grid */
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            /* Categorized view - grouped by category */
            <div className="mt-8 space-y-12">
              {/* Featured Section */}
              {featuredListings.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                      <Sparkles className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">
                        Oportunidades em Destaque
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Negócios verificados com alto potencial de retorno
                      </p>
                    </div>
                  </div>
                  <Carousel opts={{ align: "start", loop: false }}>
                    <CarouselContent className="-ml-4">
                      {featuredListings.map((listing) => (
                        <CarouselItem key={listing.id} className="pl-4 sm:basis-1/2 lg:basis-1/3">
                          <ListingCard listing={listing} />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="-left-4 hidden md:flex" />
                    <CarouselNext className="-right-4 hidden md:flex" />
                  </Carousel>
                </section>
              )}

              {/* Category Sections */}
              {categorias
                .filter((cat) => listingsByCategory[cat.id]?.length > 0)
                .map((cat) => (
                  <section key={cat.id}>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="font-display text-xl font-bold text-foreground">
                          Oportunidades em {cat.nome}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {listingsByCategory[cat.id].length} negócio{listingsByCategory[cat.id].length !== 1 ? "s" : ""} disponível{listingsByCategory[cat.id].length !== 1 ? "is" : ""}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary"
                        onClick={() => handleFilterChange("categoria", cat.id)}
                      >
                        Ver todos
                      </Button>
                    </div>
                    <Carousel opts={{ align: "start", loop: false }}>
                      <CarouselContent className="-ml-4">
                        {listingsByCategory[cat.id].map((listing) => (
                          <CarouselItem key={listing.id} className="pl-4 sm:basis-1/2 lg:basis-1/3">
                            <ListingCard listing={listing} />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="-left-4 hidden md:flex" />
                      <CarouselNext className="-right-4 hidden md:flex" />
                    </Carousel>
                  </section>
                ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Busca;
