import { useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { ArrowLeft, Building2, Filter, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import SearchBar from "@/components/SearchBar";
import { faixasPreco } from "@/data/mockListings";
import { useNegocios, adaptNegocio } from "@/hooks/useNegocios";

const TIPOS_IMOVEL = [
  { value: "", label: "Todos" },
  { value: "salao", label: "Salão Comercial" },
  { value: "aluguel-imovel", label: "Imóvel para Alugar" },
  { value: "venda-imovel", label: "Imóvel à Venda" },
];

const BAIRROS_SP = [
  "Centro", "Paulista", "Jardins", "Pinheiros", "Moema", "Itaim Bibi",
  "Vila Olímpia", "Vila Mariana", "Consolação", "Perdizes", "Lapa",
  "Santana", "Tatuapé", "Penha", "Ipiranga", "Santo André",
  "São Bernardo", "Guarulhos", "Osasco", "Zona Norte", "Zona Sul",
  "Zona Leste", "Zona Oeste",
];

const ImoveisComerciais = () => {
  usePageTitle("Salões & Imóveis Comerciais");
  const [tipo, setTipo] = useState("");
  const [preco, setPreco] = useState("");
  const [bairro, setBairro] = useState("");
  const [busca, setBusca] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const faixa = faixasPreco.find((f) => f.label === preco);
  const { negocios: negociosRaw, loading } = useNegocios({
    categoria: "imoveis-comerciais",
    tipo: tipo || undefined,
    busca: busca || undefined,
    preco_min: faixa?.min,
    preco_max: faixa?.max,
    bairro: bairro || undefined,
  });

  const listings = negociosRaw.map(adaptNegocio);
  const hasFilters = tipo || preco || busca || bairro;

  const clearFilters = () => { setTipo(""); setPreco(""); setBairro(""); setBusca(""); };

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Hero */}
      <section className="gradient-hero py-12 md:py-16">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Building2 className="h-7 w-7 text-white" />
              </div>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-primary-foreground md:text-4xl">
              Salões & Imóveis Comerciais
            </h1>
            <p className="mt-3 text-primary-foreground/75">
              Salões de rua, lojas, galpões e imóveis comerciais para alugar ou comprar nos melhores bairros
            </p>
            <div className="mt-6">
              <SearchBar
                initialValue={busca}
                onSearch={(q) => setBusca(q)}
              />
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 py-8">
        <div className="container-app">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para a Home
          </Link>

          {/* Filtros */}
          <div className="mt-6 flex items-center justify-between md:hidden">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {hasFilters && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">!</span>}
            </Button>
            {hasFilters && (
              <Button variant="ghost" onClick={clearFilters} className="gap-2 text-sm">
                <X className="h-4 w-4" />Limpar
              </Button>
            )}
          </div>

          <div className={`mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4 ${showFilters ? "block" : "hidden md:grid"}`}>
            <div>
              <label className="mb-2 block text-sm font-medium">Tipo</label>
              <Select value={tipo || "all"} onValueChange={(v) => setTipo(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_IMOVEL.map((t) => (
                    <SelectItem key={t.value || "all"} value={t.value || "all"}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Faixa de Preço</label>
              <Select value={preco || "all"} onValueChange={(v) => setPreco(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Qualquer valor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer valor</SelectItem>
                  {faixasPreco.map((f) => (
                    <SelectItem key={f.label} value={f.label}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Bairro / Região</label>
              <Select value={bairro || "all"} onValueChange={(v) => setBairro(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Qualquer bairro" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Qualquer bairro</SelectItem>
                  {BAIRROS_SP.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden items-end md:flex">
              {hasFilters ? (
                <Button variant="ghost" onClick={clearFilters} className="gap-2 w-full">
                  <X className="h-4 w-4" />Limpar filtros
                </Button>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground w-full">
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  São Paulo e região
                </div>
              )}
            </div>
          </div>

          {/* Active filters */}
          {hasFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {busca && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
                  "{busca}"
                  <button onClick={() => setBusca("")} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              )}
              {tipo && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
                  {TIPOS_IMOVEL.find((t) => t.value === tipo)?.label}
                  <button onClick={() => setTipo("")} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              )}
              {preco && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
                  {preco}
                  <button onClick={() => setPreco("")} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              )}
              {bairro && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
                  <MapPin className="h-3 w-3" />{bairro}
                  <button onClick={() => setBairro("")} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                </span>
              )}
            </div>
          )}

          {/* Contagem */}
          <div className="mt-6 text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${listings.length} imóvel${listings.length !== 1 ? "is" : ""} encontrado${listings.length !== 1 ? "s" : ""}`}
          </div>

          {/* Grid */}
          {listings.length === 0 ? (
            <div className="mt-16 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="font-display text-xl font-semibold">Nenhum imóvel encontrado</h3>
              <p className="mt-2 text-muted-foreground">Tente ajustar os filtros.</p>
              <Button onClick={clearFilters} variant="outline" className="mt-4">Limpar filtros</Button>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {/* CTAs */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl gradient-hero p-8 text-center">
              <h2 className="font-display text-xl font-bold text-primary-foreground">
                Quero anunciar meu imóvel
              </h2>
              <p className="mt-2 text-primary-foreground/75 text-sm">
                Alcance milhares de empresários e investidores.
              </p>
              <Button asChild className="mt-5 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold">
                <Link to="/anunciar">Anunciar agora</Link>
              </Button>
            </div>
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
                <Building2 className="h-6 w-6 text-amber-600" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Tem um terreno comercial para vender?
              </h2>
              <p className="mt-2 text-muted-foreground text-sm">
                Conectamos você a investidores e construtoras em São Paulo.
              </p>
              <Button asChild className="mt-5 bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                <Link to="/vender-terreno">Quero vender meu terreno</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ImoveisComerciais;
