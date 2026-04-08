import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { ArrowLeft, CheckCircle, XCircle, TrendingUp, MapPin, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { formatCurrency, getCategoryName } from "@/data/mockListings";
import type { NegocioSupabase } from "@/hooks/useNegocios";
import { useCompare } from "@/contexts/CompareContext";

const ROW_LABELS = [
  { key: "categoria", label: "Categoria" },
  { key: "cidade", label: "Localização" },
  { key: "preco", label: "Valor" },
  { key: "faturamento_mensal", label: "Faturamento Mensal" },
  { key: "roi", label: "Retorno Estimado" },
  { key: "area_m2", label: "Área" },
  { key: "tipo", label: "Tipo" },
];

const formatValue = (key: string, negocio: NegocioSupabase): string => {
  switch (key) {
    case "categoria": return getCategoryName(negocio.categoria);
    case "cidade": return `${negocio.cidade}, ${negocio.estado}`;
    case "preco": return formatCurrency(negocio.preco);
    case "faturamento_mensal":
      return negocio.faturamento_mensal > 0 ? formatCurrency(negocio.faturamento_mensal) : "—";
    case "roi":
      return negocio.faturamento_mensal > 0 && negocio.preco > 0
        ? `~${Math.round(negocio.preco / negocio.faturamento_mensal)} meses`
        : "—";
    case "area_m2": return negocio.area_m2 ? `${negocio.area_m2} m²` : "—";
    case "tipo": {
      const tipos: Record<string, string> = {
        "venda": "Venda de negócio",
        "venda-imovel": "Venda de imóvel",
        "aluguel-imovel": "Aluguel",
        "galeria": "Espaço em galeria",
      };
      return tipos[negocio.tipo || ""] || "Negócio";
    }
    default: return "—";
  }
};

// Find the best value for highlight (lowest price, highest revenue, lowest ROI)
const isBest = (key: string, negocio: NegocioSupabase, all: NegocioSupabase[]): boolean => {
  if (key === "preco") {
    const valid = all.map((n) => n.preco).filter((v) => v > 0);
    return negocio.preco === Math.min(...valid);
  }
  if (key === "faturamento_mensal") {
    const valid = all.map((n) => n.faturamento_mensal).filter((v) => v > 0);
    return valid.length > 0 && negocio.faturamento_mensal === Math.max(...valid);
  }
  if (key === "roi") {
    const rois = all
      .filter((n) => n.faturamento_mensal > 0 && n.preco > 0)
      .map((n) => ({ id: n.id, roi: Math.round(n.preco / n.faturamento_mensal) }));
    const min = Math.min(...rois.map((r) => r.roi));
    return rois.some((r) => r.id === negocio.id && r.roi === min);
  }
  return false;
};

const Comparar = () => {
  usePageTitle("Comparar Negócios");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCompare } = useCompare();
  const [negocios, setNegocios] = useState<NegocioSupabase[]>([]);
  const [loading, setLoading] = useState(true);

  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 3);

  useEffect(() => {
    if (ids.length < 2) { setLoading(false); return; }
    supabase
      .from("negocios")
      .select("*")
      .in("id", ids)
      .then(({ data }) => {
        if (data) setNegocios(data as NegocioSupabase[]);
        setLoading(false);
      });
  }, [ids.join(",")]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <Footer />
      </div>
    );
  }

  if (ids.length < 2) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold">Selecione ao menos 2 negócios</h1>
            <p className="mt-2 text-muted-foreground">Use o botão "Comparar" nos cards para selecionar.</p>
            <Button asChild className="mt-6"><Link to="/busca">Explorar negócios</Link></Button>
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
          <div className="flex items-center justify-between mb-6">
            <Link to="/busca" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { clearCompare(); navigate("/busca"); }}
            >
              Nova comparação
            </Button>
          </div>

          <h1 className="font-display text-2xl font-bold text-foreground mb-8">
            Comparando {negocios.length} negócios
          </h1>

          {/* Cards topo */}
          <div className={`grid gap-4 mb-0 ${negocios.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {negocios.map((n) => (
              <div key={n.id} className="rounded-xl overflow-hidden border border-border bg-card shadow-sm">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={n.imagem || n.imagens?.[0] || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"}
                    alt={n.titulo}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {getCategoryName(n.categoria)}
                  </div>
                  <h2 className="font-display text-base font-bold text-foreground line-clamp-2">{n.titulo}</h2>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {n.cidade}, {n.estado}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabela de comparação */}
          <div className="mt-4 rounded-xl border border-border overflow-hidden">
            {ROW_LABELS.map((row, idx) => (
              <div
                key={row.key}
                className={`grid ${negocios.length === 3 ? "grid-cols-[160px_1fr_1fr_1fr]" : "grid-cols-[160px_1fr_1fr]"} ${idx % 2 === 0 ? "bg-muted/40" : "bg-card"}`}
              >
                <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center border-r border-border">
                  {row.label}
                </div>
                {negocios.map((n) => {
                  const best = isBest(row.key, n, negocios);
                  const value = formatValue(row.key, n);
                  return (
                    <div key={n.id} className="px-4 py-3 flex items-center gap-2 border-r border-border last:border-r-0">
                      {best && <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />}
                      {!best && (row.key === "preco" || row.key === "faturamento_mensal" || row.key === "roi") && value !== "—" && (
                        <XCircle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className={`text-sm ${best ? "font-bold text-green-700" : "text-foreground"} ${row.key === "faturamento_mensal" && n.faturamento_mensal > 0 ? "text-success" : ""}`}>
                        {row.key === "faturamento_mensal" && n.faturamento_mensal > 0 && (
                          <TrendingUp className="inline h-3.5 w-3.5 mr-1" />
                        )}
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Botões de ação */}
          <div className={`mt-4 grid gap-3 ${negocios.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {negocios.map((n) => (
              <Button key={n.id} asChild variant="outline" className="w-full">
                <Link to={`/anuncio/${n.id}`}>Ver detalhes</Link>
              </Button>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Comparar;
