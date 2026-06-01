import { useEffect, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { supabase } from "@/lib/supabase";
import { NovoNegocioModal } from "@/pages/admin/Negocios";
import { Plus, Store, ExternalLink, MapPin, Building2, Clock, Loader2, LayoutGrid, Home, Award, Users, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import CompartilharBuscaModal from "@/components/CompartilharBuscaModal";

function suggestPriceRange(preco: number | null | undefined): string {
  if (!preco) return "";
  if (preco <= 50_000)  return "Até R$ 50.000";
  if (preco <= 150_000) return "R$ 50.000 - R$ 150.000";
  if (preco <= 300_000) return "R$ 150.000 - R$ 300.000";
  if (preco <= 500_000) return "R$ 300.000 - R$ 500.000";
  return "Acima de R$ 500.000";
}
import type { Negocio } from "@/stores/negocioStore";

type Row = Negocio & { _kind: "negocio" | "galeria"; _qtdEspacos?: number; _qtdLeads?: number };

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  ativo:    { label: "Ativo",     color: "bg-green-50 text-green-700 border-green-200" },
  pendente: { label: "Pendente",  color: "bg-amber-50 text-amber-700 border-amber-200" },
  rejeitado:{ label: "Rejeitado", color: "bg-red-50 text-red-700 border-red-200" },
  vendido:  { label: "Vendido",   color: "bg-blue-50 text-blue-700 border-blue-200" },
  rascunho: { label: "Rascunho",  color: "bg-gray-50 text-gray-700 border-gray-200" },
};

const TIPO_ICON: Record<string, typeof Store> = {
  negocio: Store, imovel: Home, franquia: Award, galeria: LayoutGrid,
};

const MeusNegocios = () => {
  usePageTitle("Meus Negócios | Corretor");
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [shareItem, setShareItem] = useState<Row | null>(null);

  const load = async (uid: string) => {
    setLoading(true);

    const [{ data: negs }, { data: gals }, { data: leadsRows }] = await Promise.all([
      supabase
        .from("negocios")
        .select("*")
        .eq("corretor_id", uid)
        .order("criado_em", { ascending: false }),
      supabase
        .from("galerias")
        .select("id, nome, cidade, estado, endereco, descricao, imagem, criado_em, espacos_galeria(count)")
        .eq("corretor_id", uid)
        .order("criado_em", { ascending: false }),
      // Leads atribuídos a esse corretor (pra contar quantos estão linkados a cada negócio/galeria)
      supabase
        .from("leads")
        .select("id, negocio_id, galeria_id")
        .eq("corretor_id", uid),
    ]);

    type LeadLink = { id: string; negocio_id: string | null; galeria_id: string | null };
    const leadsByNegocio: Record<string, number> = {};
    const leadsByGaleria: Record<string, number> = {};
    for (const l of (leadsRows || []) as LeadLink[]) {
      if (l.negocio_id) leadsByNegocio[l.negocio_id] = (leadsByNegocio[l.negocio_id] || 0) + 1;
      if (l.galeria_id) leadsByGaleria[l.galeria_id] = (leadsByGaleria[l.galeria_id] || 0) + 1;
    }

    const negocios: Row[] = (negs || []).map((n: Negocio) => ({
      ...n,
      _kind: "negocio",
      _qtdLeads: leadsByNegocio[n.id] || 0,
    }));

    const galerias: Row[] = (gals || []).map((g: {
      id: string; nome: string; cidade: string; estado: string;
      endereco: string; descricao: string | null; imagem: string | null;
      criado_em: string; espacos_galeria?: { count: number }[];
    }) => ({
      id: g.id,
      titulo: g.nome,
      tipo: "galeria",
      categoria: "Galeria",
      cidade: g.cidade,
      estado: g.estado,
      bairro: g.endereco || null,
      preco: null,
      faturamento_mensal: null,
      area_m2: null,
      descricao: g.descricao || "",
      status: "ativo",
      proprietario_nome: "",
      proprietario_telefone: null,
      proprietario_email: "",
      foto_url: g.imagem || null,
      criado_em: g.criado_em,
      _kind: "galeria",
      _qtdEspacos: g.espacos_galeria?.[0]?.count ?? 0,
      _qtdLeads: leadsByGaleria[g.id] || 0,
    } as unknown as Row));

    const merged = [...negocios, ...galerias].sort(
      (a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()
    );
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        load(data.user.id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const onSaved = () => {
    setShowModal(false);
    if (userId) load(userId);
  };

  return (
    <CorretorLayout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Meus Negócios</h1>
            <p className="text-sm text-muted-foreground">
              Negócios atribuídos a você ou cadastrados por você
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo Negócio
          </button>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="mt-3 font-semibold text-foreground">Nenhum negócio ainda</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Os negócios que você cadastrar ou que forem atribuídos a você aparecerão aqui.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Cadastrar primeiro negócio
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const Icon = TIPO_ICON[row.tipo as string] ?? Store;
              const statusMeta = STATUS_META[row.status] || STATUS_META.ativo;
              const isGaleria = row._kind === "galeria";
              const link = isGaleria ? `/galerias?id=${row.id}` : `/anuncio/${row.id}`;
              return (
                <div
                  key={`${row._kind}-${row.id}`}
                  className="rounded-2xl border border-border bg-card p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start gap-4 flex-wrap">
                    {row.foto_url ? (
                      <img src={row.foto_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{row.titulo}</h3>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusMeta.color}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isGaleria
                          ? `Galeria · ${row._qtdEspacos ?? 0} espaço(s)`
                          : row.categoria}
                      </p>
                      <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {row.cidade}, {row.estado}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {timeAgo(row.criado_em)} atrás
                        </span>
                        {(row._qtdLeads || 0) > 0 && (
                          <Link
                            to="/corretor/leads"
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                            title="Ver leads atribuídos"
                          >
                            <Users className="h-3 w-3" /> {row._qtdLeads} lead(s) interessado(s)
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Ver página
                      </a>
                      <button
                        onClick={() => setShareItem(row)}
                        className="flex items-center gap-1.5 rounded-lg bg-violet-50 border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors"
                        title="Compartilhar link filtrado por categoria"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        Compartilhar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showModal && userId && (
          <NovoNegocioModal
            onClose={() => setShowModal(false)}
            onSaved={onSaved}
            corretorId={userId}
            defaultStatus="pendente"
            hideStatusSelector
          />
        )}

        {shareItem && (
          <CompartilharBuscaModal
            open={!!shareItem}
            onClose={() => setShareItem(null)}
            defaults={{
              categoria: shareItem.categoria,
              tipo: (shareItem as { tipo?: string }).tipo,
              bairro: shareItem.bairro || undefined,
              cidade: shareItem.cidade,
              preco: suggestPriceRange(shareItem.preco),
            }}
          />
        )}
      </div>
    </CorretorLayout>
  );
};

export default MeusNegocios;
