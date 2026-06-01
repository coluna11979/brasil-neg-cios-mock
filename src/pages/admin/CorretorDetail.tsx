import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft, Loader2, Phone, Mail, MapPin, Clock, Trophy, DollarSign,
  KeyRound, Award, Users, MessageCircle, Store, LayoutGrid, Home, ExternalLink,
} from "lucide-react";

function formatMoneyShort(v: number): string {
  if (!v || v <= 0) return "R$ 0";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface CorretorProfile {
  id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  foto_url?: string | null;
  bairro?: string | null;
  regiao?: string | null;
  creci?: string | null;
  experiencia?: string | null;
  atuacao?: string | null;
  ativo: boolean;
  criado_em: string;
}

interface NegRow {
  id: string;
  titulo: string;
  tipo: string | null;
  categoria: string | null;
  cidade: string;
  estado: string;
  preco: number | null;
  status: string;
  descricao: string | null;
  criado_em: string;
}

interface GalRow {
  id: string;
  nome: string;
  cidade: string;
  estado: string;
  criado_em: string;
  espacos_galeria?: { valor_aluguel: number | null; disponivel: boolean | null }[];
}

interface LeadRow {
  id: string;
  nome: string;
  status: string;
  origem: string;
  criado_em: string;
}

const CorretorDetail = () => {
  const { id } = useParams<{ id: string }>();
  usePageTitle("Corretor — KPIs");

  const [profile, setProfile] = useState<CorretorProfile | null>(null);
  const [negocios, setNegocios] = useState<NegRow[]>([]);
  const [galerias, setGalerias] = useState<GalRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [pRes, nRes, gRes, lRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("negocios")
          .select("id, titulo, tipo, categoria, cidade, estado, preco, status, descricao, criado_em")
          .eq("corretor_id", id)
          .order("criado_em", { ascending: false }),
        supabase.from("galerias")
          .select("id, nome, cidade, estado, criado_em, espacos_galeria(valor_aluguel, disponivel)")
          .eq("corretor_id", id)
          .order("criado_em", { ascending: false }),
        supabase.from("leads")
          .select("id, nome, status, origem, criado_em")
          .eq("corretor_id", id)
          .order("criado_em", { ascending: false }),
      ]);
      setProfile(pRes.data as CorretorProfile | null);
      setNegocios((nRes.data || []) as NegRow[]);
      setGalerias((gRes.data || []) as GalRow[]);
      setLeads((lRes.data || []) as LeadRow[]);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!profile) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Corretor não encontrado.</p>
          <Link to="/admin/corretores" className="mt-3 inline-block text-primary text-sm">
            ← Voltar
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const isLocacao = (n: NegRow) => /Opera[cç][aã]o: Loca[cç][aã]o(?! e Venda)/i.test(n.descricao || "");
  const isAmbos   = (n: NegRow) => /Venda e Loca[cç][aã]o/i.test(n.descricao || "");

  const ativos = negocios.filter((n) => n.status === "ativo");
  const vendidos = negocios.filter((n) => n.status === "vendido");
  const pendentes = negocios.filter((n) => n.status === "pendente");

  const vgvAtribuido = negocios.filter((n) => n.status !== "rejeitado").reduce((s, n) => s + (n.preco || 0), 0);
  const vgvVenda = ativos.filter((n) => !isLocacao(n)).reduce((s, n) => s + (n.preco || 0), 0);
  const aluguelMensal =
    ativos.filter((n) => isLocacao(n) || isAmbos(n)).reduce((s, n) => s + (n.preco || 0), 0) +
    galerias.reduce((s, g) => s + (g.espacos_galeria || []).reduce((s2, e) => s2 + (e.valor_aluguel || 0), 0), 0);
  const vgvRealizado = vendidos.reduce((s, n) => s + (n.preco || 0), 0);

  const totalPortfolio = negocios.length + galerias.length;
  const negociosPorTipo = {
    negocio: negocios.filter((n) => (n.tipo || "negocio") === "negocio").length,
    imovel: negocios.filter((n) => n.tipo === "imovel").length,
    franquia: negocios.filter((n) => n.tipo === "franquia").length,
    galeria: galerias.length,
  };
  const totalEspacos = galerias.reduce((s, g) => s + (g.espacos_galeria?.length || 0), 0);

  const leadsNovos = leads.filter((l) => l.status === "novo").length;
  const leadsEmAndamento = leads.filter((l) => l.status === "em-andamento").length;
  const leadsConvertidos = leads.filter((l) => l.status === "convertido").length;
  const leadsPerdidos = leads.filter((l) => l.status === "perdido").length;
  const taxaConversao = leads.length > 0 ? (leadsConvertidos / leads.length) * 100 : 0;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-6xl">
        {/* Voltar */}
        <Link to="/admin/corretores"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para Corretores
        </Link>

        {/* Header com identidade do corretor */}
        <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4 flex-wrap">
          {profile.foto_url ? (
            <img src={profile.foto_url} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary">
              {profile.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-foreground">{profile.nome}</h1>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                profile.ativo ? "bg-green-50 text-green-700 border-green-200" : "bg-amber-50 text-amber-700 border-amber-200"
              }`}>
                {profile.ativo ? "Ativo" : "Pendente aprovação"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {profile.email}</span>
              {profile.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {profile.telefone}</span>}
              {(profile.bairro || profile.regiao) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {profile.bairro || profile.regiao}</span>}
              {profile.creci && <span>CRECI: {profile.creci}</span>}
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> cadastrado {timeAgo(profile.criado_em)} atrás</span>
            </div>
          </div>
        </div>

        {/* KPIs principais */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="VGV atribuído" value={formatMoneyShort(vgvAtribuido)} hint="tudo sob responsabilidade" icon={<Trophy className="h-5 w-5" />} color="amber" />
          <KpiCard label="VGV em venda" value={formatMoneyShort(vgvVenda)} hint="itens ativos à venda" icon={<DollarSign className="h-5 w-5" />} color="green" />
          <KpiCard label="Aluguel mensal" value={formatMoneyShort(aluguelMensal)} hint="locação + espaços" icon={<KeyRound className="h-5 w-5" />} color="blue" />
          <KpiCard label="Realizado" value={formatMoneyShort(vgvRealizado)} hint={`${vendidos.length} negócio(s) fechado(s)`} icon={<Award className="h-5 w-5" />} color="violet" />
        </div>

        {/* Linha de portfólio + leads */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold text-foreground mb-4">Portfólio comercial</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <PortItem icon={<Store className="h-4 w-4 text-primary" />} value={negociosPorTipo.negocio} label="negócios" />
              <PortItem icon={<Home className="h-4 w-4 text-blue-600" />} value={negociosPorTipo.imovel} label="imóveis" />
              <PortItem icon={<Award className="h-4 w-4 text-amber-600" />} value={negociosPorTipo.franquia} label="franquias" />
              <PortItem icon={<LayoutGrid className="h-4 w-4 text-violet-600" />} value={negociosPorTipo.galeria} label={`galeria(s) · ${totalEspacos} esp.`} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-green-50 border border-green-200 p-2 text-center">
                <div className="text-lg font-bold text-green-700">{ativos.length}</div>
                <div className="text-green-700/80">Ativos</div>
              </div>
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-center">
                <div className="text-lg font-bold text-amber-700">{pendentes.length}</div>
                <div className="text-amber-700/80">Pendentes</div>
              </div>
              <div className="rounded-lg bg-violet-50 border border-violet-200 p-2 text-center">
                <div className="text-lg font-bold text-violet-700">{vendidos.length}</div>
                <div className="text-violet-700/80">Vendidos</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display font-semibold text-foreground mb-4">Atividade com leads</h2>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg border border-border p-3">
                <div className="text-2xl font-bold text-foreground">{leads.length}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Leads atribuídos</div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-2xl font-bold text-amber-700">{taxaConversao.toFixed(1)}%</div>
                <div className="text-xs text-muted-foreground mt-0.5">Conversão</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
              <StatusCount value={leadsNovos} label="Novos" color="blue" />
              <StatusCount value={leadsEmAndamento} label="Em andamento" color="amber" />
              <StatusCount value={leadsConvertidos} label="Fechados" color="green" />
              <StatusCount value={leadsPerdidos} label="Perdidos" color="red" />
            </div>
          </div>
        </div>

        {/* Listas resumidas */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Negócios */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-foreground">Portfólio ({totalPortfolio})</h2>
              <Link to="/admin/negocios" className="text-xs font-medium text-primary hover:underline">
                Ver todos
              </Link>
            </div>
            {totalPortfolio === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">Nenhum item cadastrado/atribuído</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {[
                  ...negocios.map((n) => ({ id: n.id, titulo: n.titulo, sub: `${n.tipo || "negocio"} · ${n.cidade}`, preco: n.preco, status: n.status, link: `/anuncio/${n.id}` })),
                  ...galerias.map((g) => ({ id: g.id, titulo: g.nome, sub: `galeria · ${g.cidade} · ${(g.espacos_galeria?.length || 0)} esp.`, preco: (g.espacos_galeria || []).reduce((s, e) => s + (e.valor_aluguel || 0), 0), status: "ativo", link: `/galerias?id=${g.id}` })),
                ].map((row) => (
                  <a
                    key={row.id} href={row.link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-2.5 hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{row.titulo}</p>
                      <p className="text-[11px] text-muted-foreground">{row.sub}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-foreground">{formatMoneyShort(row.preco || 0)}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">{row.status}</p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Leads */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-semibold text-foreground">Leads atribuídos ({leads.length})</h2>
              <Link to="/admin/leads" className="text-xs font-medium text-primary hover:underline">
                Ver todos
              </Link>
            </div>
            {leads.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">Nenhum lead atribuído</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {leads.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{l.nome}</p>
                      <p className="text-[11px] text-muted-foreground">{l.origem} · {timeAgo(l.criado_em)} atrás</p>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor(l.status)}`}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

// ── Helpers visuais ───────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  amber:  { bg: "from-amber-50 to-orange-50", border: "border-amber-200", text: "text-amber-800", iconBg: "bg-amber-100 text-amber-700" },
  green:  { bg: "from-green-50 to-emerald-50", border: "border-green-200", text: "text-green-800", iconBg: "bg-green-100 text-green-700" },
  blue:   { bg: "from-blue-50 to-sky-50", border: "border-blue-200", text: "text-blue-800", iconBg: "bg-blue-100 text-blue-700" },
  violet: { bg: "from-violet-50 to-purple-50", border: "border-violet-200", text: "text-violet-800", iconBg: "bg-violet-100 text-violet-700" },
};

const KpiCard = ({ label, value, hint, icon, color }: { label: string; value: string; hint: string; icon: React.ReactNode; color: keyof typeof COLOR_MAP }) => {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-xl border ${c.border} bg-gradient-to-br ${c.bg} p-5`}>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium ${c.text}`}>{label}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${c.iconBg}`}>{icon}</div>
      </div>
      <p className={`mt-2 font-display text-2xl font-bold ${c.text}`}>{value}</p>
      <p className={`mt-1 text-xs ${c.text}/80`}>{hint}</p>
    </div>
  );
};

const PortItem = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
  <div className="rounded-lg border border-border bg-muted/40 p-2 text-center">
    <div className="flex items-center justify-center">{icon}</div>
    <div className="text-lg font-bold text-foreground">{value}</div>
    <div className="text-[10px] text-muted-foreground leading-tight">{label}</div>
  </div>
);

const StatusCount = ({ value, label, color }: { value: number; label: string; color: string }) => {
  const map: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`rounded-lg border p-2 text-center ${map[color]}`}>
      <div className="font-bold text-base">{value}</div>
      <div className="text-[10px] uppercase">{label}</div>
    </div>
  );
};

function statusColor(s: string): string {
  switch (s) {
    case "novo": return "bg-blue-50 text-blue-700 border-blue-200";
    case "em-andamento": return "bg-amber-50 text-amber-700 border-amber-200";
    case "convertido": return "bg-green-50 text-green-700 border-green-200";
    case "perdido": return "bg-red-50 text-red-700 border-red-200";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

export default CorretorDetail;
