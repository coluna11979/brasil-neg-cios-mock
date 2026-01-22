import { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { ArrowLeft, Filter, X } from "lucide-react";
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
import SearchBar from "@/components/SearchBar";
import ListingCard from "@/components/ListingCard";
import {
  categorias,
  estados,
  faixasPreco,
  filterListings,
  getCategoryName,
} from "@/data/mockListings";

const Busca = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  const query = searchParams.get("q") || "";
  const categoriaParam = searchParams.get("categoria") || "";
  const estadoParam = searchParams.get("estado") || "";
  const precoParam = searchParams.get("preco") || "";

  const [categoria, setCategoria] = useState(categoriaParam);
  const [estado, setEstado] = useState(estadoParam);
  const [preco, setPreco] = useState(precoParam);
  const [busca, setBusca] = useState(query);

  useEffect(() => {
    setCategoria(categoriaParam);
    setEstado(estadoParam);
    setPreco(precoParam);
    setBusca(query);
  }, [categoriaParam, estadoParam, precoParam, query]);

  const filteredListings = useMemo(() => {
    const faixa = faixasPreco.find((f) => f.label === preco);
    return filterListings(
      categoria || undefined,
      estado || undefined,
      faixa?.min,
      faixa?.max,
      busca || undefined
    );
  }, [categoria, estado, preco, busca]);

  const handleSearch = (newQuery: string) => {
    setBusca(newQuery);
    const params = new URLSearchParams(searchParams);
    if (newQuery) {
      params.set("q", newQuery);
    } else {
      params.delete("q");
    }
    setSearchParams(params);
  };

  const handleFilterChange = (type: string, value: string) => {
    const params = new URLSearchParams(searchParams);

    if (value && value !== "all") {
      params.set(type, value);
    } else {
      params.delete(type);
    }

    setSearchParams(params);

    if (type === "categoria") setCategoria(value === "all" ? "" : value);
    if (type === "estado") setEstado(value === "all" ? "" : value);
    if (type === "preco") setPreco(value === "all" ? "" : value);
  };

  const clearFilters = () => {
    setSearchParams({});
    setCategoria("");
    setEstado("");
    setPreco("");
    setBusca("");
  };

  const hasActiveFilters = categoria || estado || preco || busca;

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
              Buscar Negócios
            </h1>
            <p className="mt-2 text-muted-foreground">
              Encontre a oportunidade perfeita para você
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
            className={`mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4 ${
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
                Estado
              </label>
              <Select
                value={estado || "all"}
                onValueChange={(value) => handleFilterChange("estado", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {estados.map((est) => (
                    <SelectItem key={est} value={est}>
                      {est}
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

            <div className="hidden items-end md:flex">
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} className="gap-2 w-full">
                  <X className="h-4 w-4" />
                  Limpar filtros
                </Button>
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
              {estado && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground">
                  {estado}
                  <button
                    onClick={() => handleFilterChange("estado", "all")}
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
            </div>
          )}

          {/* Results Count */}
          <div className="mt-6 text-sm text-muted-foreground">
            {filteredListings.length} negócio(s) encontrado(s)
          </div>

          {/* Results Grid */}
          {filteredListings.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="mt-12 text-center">
              <div className="mx-auto max-w-md">
                <h3 className="font-display text-xl font-semibold text-foreground">
                  Nenhum negócio encontrado
                </h3>
                <p className="mt-2 text-muted-foreground">
                  Tente ajustar os filtros ou fazer uma nova busca.
                </p>
                <Button onClick={clearFilters} variant="outline" className="mt-4">
                  Limpar todos os filtros
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Busca;
