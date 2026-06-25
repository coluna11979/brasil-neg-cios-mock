import { useEffect, useState, useMemo } from "react";
import { X, Search, Loader2, Building2, MapPin, Tag, Hash } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface NegocioOpt {
  id: string;
  titulo: string;
  categoria: string | null;
  tipo: string | null;
  cidade: string | null;
  bairro: string | null;
  preco: number | null;
  area_m2: number | null;
  imagem: string | null;
  imagens: string[] | null;
  codigo: number | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (negocio: { id: string; titulo: string }) => void;
  currentNegocioId?: string | null;
}

const CATEGORIAS = ["Todos", "Imóveis Comerciais", "Alimentação", "Varejo", "Serviços", "Saúde e Estética", "Tecnologia", "Educação", "Automotivo", "Indústria"];
const TIPOS = [
  { value: "", label: "Todos os tipos" },
  { value: "venda", label: "Negócios à venda" },
  { value: "aluguel-imovel", label: "Imóvel pra alugar" },
  { value: "venda-imovel", label: "Imóvel à venda" },
  { value: "imovel", label: "Imóvel comercial" },
  { value: "franquia", label: "Franquias" },
];

function formatPrice(v: number | null) {
  if (!v) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export default function ImovelPickerModal({ open, onClose, onSelect, currentNegocioId }: Props) {
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState("Todos");
  const [tipo, setTipo] = useState("");
  const [results, setResults] = useState<NegocioOpt[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<NegocioOpt[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCategoria("Todos");
    setTipo("");
    // Carrega mais recentes ativos por padrão
    setLoading(true);
    supabase
      .from("negocios")
      .select("id, titulo, categoria, tipo, cidade, bairro, preco, area_m2, imagem, imagens, codigo")
      .eq("status", "ativo")
      .order("criado_em", { ascending: false })
      .limit(30)
      .then(({ data }) => { setRecent((data || []) as NegocioOpt[]); setLoading(false); });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!query.trim() && categoria === "Todos" && !tipo) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      let q = supabase
        .from("negocios")
        .select("id, titulo, categoria, tipo, cidade, bairro, preco, area_m2, imagem, imagens, codigo")
        .eq("status", "ativo")
        .limit(40);
      if (query.trim()) {
        const safe = query.replace(/[%(),"']/g, "");
        q = q.or(`titulo.ilike.%${safe}%,bairro.ilike.%${safe}%,cidade.ilike.%${safe}%,descricao.ilike.%${safe}%`);
      }
      if (categoria !== "Todos") q = q.eq("categoria", categoria);
      if (tipo) q = q.eq("tipo", tipo);
      const { data } = await q;
      setResults((data || []) as NegocioOpt[]);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, categoria, tipo, open]);

  const showRecent = !query.trim() && categoria === "Todos" && !tipo;
  const items = showRecent ? recent : results;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-card shadow-2xl border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-display text-lg font-semibold">Vincular Imóvel ou Negócio</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Escolha o que esse lead tem interesse</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-6 py-3 border-b border-border space-y-2.5 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              placeholder="Buscar por título, bairro, cidade ou descrição..."
              className="w-full rounded-xl border border-border bg-card pl-10 pr-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {(categoria !== "Todos" || tipo) && (
              <button onClick={() => { setCategoria("Todos"); setTipo(""); }} className="text-xs text-muted-foreground hover:text-foreground underline">
                limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto p-4">
          {showRecent && (
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3 px-1">
              {loading ? "Carregando..." : `Mais recentes (${items.length})`}
            </p>
          )}
          {!showRecent && (
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3 px-1">
              {loading ? "Buscando..." : `${items.length} ${items.length === 1 ? "resultado" : "resultados"}`}
            </p>
          )}

          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum imóvel encontrado</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Tente outro termo ou ajuste os filtros</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {items.map((n) => {
                const isCurrent = n.id === currentNegocioId;
                const img = n.imagem || (n.imagens && n.imagens[0]) || null;
                const preco = formatPrice(n.preco);
                return (
                  <button
                    key={n.id}
                    onClick={() => onSelect({ id: n.id, titulo: n.titulo })}
                    className={`group flex items-stretch gap-3 rounded-xl border bg-card text-left p-2.5 transition-all hover:border-primary hover:shadow-md hover:-translate-y-0.5 ${
                      isCurrent ? "border-primary ring-2 ring-primary/20" : "border-border"
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="h-20 w-20 shrink-0 rounded-lg bg-muted overflow-hidden relative">
                      {img ? (
                        <img src={img} alt={n.titulo} loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Building2 className="h-7 w-7 text-muted-foreground/40" />
                        </div>
                      )}
                      {n.codigo && (
                        <span className="absolute top-1 left-1 text-[9px] font-bold bg-black/60 text-white rounded px-1 py-px backdrop-blur">
                          NEG-{String(n.codigo).padStart(4, "0")}
                        </span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <p className="font-semibold text-xs text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {n.titulo}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          {(n.bairro || n.cidade) && (
                            <span className="flex items-center gap-0.5 truncate">
                              <MapPin className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{n.bairro || n.cidade}</span>
                            </span>
                          )}
                          {n.area_m2 && (
                            <span className="flex items-center gap-0.5 shrink-0">
                              <Hash className="h-2.5 w-2.5" />
                              {n.area_m2}m²
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        {n.categoria && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-muted px-1.5 py-px text-[9px] font-medium text-muted-foreground">
                            <Tag className="h-2 w-2" />
                            {n.categoria}
                          </span>
                        )}
                        {preco && (
                          <span className="text-[11px] font-bold text-primary truncate">{preco}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
