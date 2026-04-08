import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

const TIPOS = [
  { value: "", label: "Todos os tipos" },
  { value: "negocio", label: "Negócio / Empresa" },
  { value: "salao", label: "Salão Comercial" },
  { value: "imovel", label: "Imóvel Comercial" },
  { value: "galeria", label: "Galeria Comercial" },
  { value: "franquia", label: "Franquia" },
];

const SUGESTOES_CATEGORIAS = [
  "Padaria / Confeitaria",
  "Restaurante",
  "Cafeteria",
  "Clínica",
  "Salão de Beleza",
  "Academia",
  "Pet Shop",
  "Farmácia",
  "Escola",
  "Loja de Roupas",
  "Oficina Mecânica",
  "Supermercado",
  "Bar / Pub",
  "Pizzaria",
  "Hamburgueria",
];

const SUGESTOES_CIDADES = [
  "Pinheiros",
  "Vila Madalena",
  "Jardins",
  "Moema",
  "Brooklin",
  "Tatuapé",
  "Mooca",
  "Santo André",
  "São Bernardo",
  "Guarulhos",
];

const SUGESTOES_TIPOS = [
  "Negócio à venda",
  "Salão para alugar",
  "Imóvel comercial",
  "Franquia disponível",
];

const ALL_SUGGESTIONS = [
  ...SUGESTOES_CATEGORIAS,
  ...SUGESTOES_CIDADES,
  ...SUGESTOES_TIPOS,
];

interface SearchBarProps {
  initialValue?: string;
  onSearch?: (query: string, tipo?: string) => void;
  size?: "default" | "large";
}

const SearchBar = ({ initialValue = "", onSearch }: SearchBarProps) => {
  const [query, setQuery] = useState(initialValue);
  const [tipo, setTipo] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Sync initialValue when it changes from outside
  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuggestions =
    query.length >= 2
      ? ALL_SUGGESTIONS.filter((s) =>
          s.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 6)
      : [];

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(value.length >= 2);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    // Submit immediately
    if (onSearch) {
      onSearch(suggestion, tipo || undefined);
    } else {
      const params = new URLSearchParams();
      params.set("q", suggestion);
      if (tipo) params.set("tipo", tipo);
      navigate(`/busca?${params.toString()}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(query, tipo || undefined);
    } else {
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (tipo) params.set("tipo", tipo);
      navigate(`/busca${params.toString() ? "?" + params.toString() : ""}`);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="w-full">
        {/* Mobile: input simples + botão */}
        <div className="flex sm:hidden items-center gap-2 rounded-2xl border border-border bg-card shadow-lg px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Buscar negócios, salões, imóveis..."
            aria-label="Buscar negócios"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50 text-foreground text-sm min-w-0"
          />
          <button
            type="submit"
            className="flex items-center justify-center rounded-xl bg-[#5a7a3a] text-white hover:bg-[#4a6830] transition-colors shrink-0 h-9 w-9"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {/* Desktop: dois campos + botão */}
        <div className="hidden sm:flex items-stretch rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
          {/* Keyword */}
          <div className="flex flex-1 items-center px-5">
            <div className="flex flex-col justify-center min-w-0 flex-1 py-3">
              <span className="text-[10px] font-semibold text-foreground/60 leading-none mb-1.5">
                Palavra-chave
              </span>
              <input
                type="text"
                placeholder="Buscar por título ou descrição"
                aria-label="Buscar negócios"
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                className="bg-transparent outline-none placeholder:text-muted-foreground/50 text-foreground text-sm leading-none min-w-0"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="w-px self-stretch bg-border my-3" />

          {/* Type */}
          <div className="flex items-center gap-1 px-5 w-[175px] shrink-0">
            <div className="flex flex-col justify-center flex-1 min-w-0 py-3">
              <span className="text-[10px] font-semibold text-foreground/60 leading-none mb-1.5">
                Tipo de negócio
              </span>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="bg-transparent outline-none text-foreground text-sm leading-none cursor-pointer appearance-none w-full"
                aria-label="Tipo de negócio"
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <svg className="h-3 w-3 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Button */}
          <div className="flex items-center p-2">
            <button
              type="submit"
              className="flex items-center justify-center rounded-xl bg-[#5a7a3a] text-white hover:bg-[#4a6830] transition-colors shrink-0 h-11 w-11"
              aria-label="Buscar"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden">
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => {
                // Use mousedown to prevent blur firing before click
                e.preventDefault();
                handleSuggestionClick(suggestion);
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors text-left"
            >
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{suggestion}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
