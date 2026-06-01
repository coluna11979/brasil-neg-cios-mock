import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Users,
  TrendingUp,
  MessageCircle,
  Building2,
  ArrowUpRight,
  Clock,
  Store,
  Megaphone,
  Loader2,
  Kanban,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminLayout from "@/components/admin/AdminLayout";
import { getAllLeads, getLeadStats, type Lead } from "@/stores/leadStore";
import { mockListings, mockGalerias } from "@/data/mockListings";
import { supabase } from "@/lib/supabase";
import { Trophy, DollarSign, Award, KeyRound } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const statusColors: Record<string, string> = {
  novo: "bg-blue-100 text-blue-700",
  "em-andamento": "bg-amber-100 text-amber-700",
  convertido: "bg-green-100 text-green-700",
  perdido: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  novo: "Novo",
  "em-andamento": "Em andamento",
  convertido: "Convertido",
  perdido: "Perdido",
};

const origemLabels: Record<string, string> = {
  "contato-negocio": "Negócio",
  "contato-galeria": "Galeria",
  anunciar: "Anunciante",
  newsletter: "Newsletter",
  "exit-intent": "Exit Intent",
  whatsapp: "Chatbot",
};

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#ef4444"];
const BAR_COLORS = ["#0d9488", "#6366f1", "#f97316", "#06b6d4", "#ec4899", "#8b5cf6"];

function formatMoneyShort(v: number): string {
  if (!v || v <= 0) return "R$ 0";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

interface RankRow {
  id: string;
  nome: string;
  foto_url: string | null;
  vgv_venda: number;
  aluguel_mensal: number;
  realizado: number;
  vendidos: number;
  leads_atribuidos: number;
}

interface PlataformaStats {
  vgv_venda_total: number;
  aluguel_mensal_total: number;
  vgv_realizado_total: number;
  total_vendidos: number;
  total_negocios_ativos: number;
  total_galerias: number;
  total_espacos: number;
  ranking: RankRow[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

const Dashboard = () => {
  usePageTitle("Admin - Dashboard");
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getLeadStats>> | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [platStats, setPlatStats] = useState<PlataformaStats | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [
        statsData,
        leadsData,
        negociosRes,
        galeriasRes,
        corretoresRes,
        leadsAtribuidosRes,
      ] = await Promise.all([
        getLeadStats(),
        getAllLeads(),
        supabase.from("negocios").select("id, tipo, preco, descricao, status, corretor_id"),
        supabase.from("galerias").select("id, corretor_id, espacos_galeria(valor_aluguel)"),
        supabase.from("profiles").select("id, nome, foto_url").eq("role", "corretor").eq("ativo", true),
        supabase.from("leads").select("corretor_id"),
      ]);
      setStats(statsData);
      setRecentLeads(leadsData.slice(0, 5));

      // ── Stats da plataforma ──
      type NegRow = { id: string; tipo: string | null; preco: number | null; descricao: string | null; status: string; corretor_id: string | null };
      type GalRow = { id: string; corretor_id: string | null; espacos_galeria?: { valor_aluguel: number | null }[] };
      type CorRow = { id: string; nome: string; foto_url: string | null };

      const negocios = (negociosRes.data || []) as NegRow[];
      const galerias = (galeriasRes.data || []) as GalRow[];
      const corretores = (corretoresRes.data || []) as CorRow[];
      const leadsAtribuidosRows = (leadsAtribuidosRes.data || []) as { corretor_id: string | null }[];

      const isLocacao = (n: NegRow) => /Opera[cç][aã]o: Loca[cç][aã]o(?! e Venda)/i.test(n.descricao || "");
      const ativos = negocios.filter((n) => n.status === "ativo");
      const vendidos = negocios.filter((n) => n.status === "vendido");

      const vgvVendaTotal = ativos.filter((n) => !isLocacao(n)).reduce((s, n) => s + (n.preco || 0), 0);
      const aluguelMensalTotal =
        ativos.filter((n) => isLocacao(n) || /Venda e Loca[cç][aã]o/i.test(n.descricao || "")).reduce((s, n) => s + (n.preco || 0), 0) +
        galerias.reduce((s, g) => s + (g.espacos_galeria || []).reduce((s2, e) => s2 + (e.valor_aluguel || 0), 0), 0);
      const vgvRealizadoTotal = vendidos.reduce((s, n) => s + (n.preco || 0), 0);

      const totalEspacosReal = galerias.reduce((s, g) => s + (g.espacos_galeria?.length || 0), 0);

      // Ranking
      const ranking: RankRow[] = corretores
        .map((c) => {
          const negDoC = negocios.filter((n) => n.corretor_id === c.id);
          const galDoC = galerias.filter((g) => g.corretor_id === c.id);
          const ativosC = negDoC.filter((n) => n.status === "ativo");
          const vendidosC = negDoC.filter((n) => n.status === "vendido");
          const vgvV = ativosC.filter((n) => !isLocacao(n)).reduce((s, n) => s + (n.preco || 0), 0);
          const aluguel = ativosC.filter((n) => isLocacao(n) || /Venda e Loca[cç][aã]o/i.test(n.descricao || "")).reduce((s, n) => s + (n.preco || 0), 0) +
            galDoC.reduce((s, g) => s + (g.espacos_galeria || []).reduce((s2, e) => s2 + (e.valor_aluguel || 0), 0), 0);
          const realizado = vendidosC.reduce((s, n) => s + (n.preco || 0), 0);
          const leadsCount = leadsAtribuidosRows.filter((l) => l.corretor_id === c.id).length;
          return {
            id: c.id,
            nome: c.nome,
            foto_url: c.foto_url,
            vgv_venda: vgvV,
            aluguel_mensal: aluguel,
            realizado,
            vendidos: vendidosC.length,
            leads_atribuidos: leadsCount,
          };
        })
        .sort((a, b) => (b.realizado + b.vgv_venda) - (a.realizado + a.vgv_venda))
        .slice(0, 5);

      setPlatStats({
        vgv_venda_total: vgvVendaTotal,
        aluguel_mensal_total: aluguelMensalTotal,
        vgv_realizado_total: vgvRealizadoTotal,
        total_vendidos: vendidos.length,
        total_negocios_ativos: ativos.length,
        total_galerias: galerias.length,
        total_espacos: totalEspacosReal,
        ranking,
      });

      setLoading(false);
    }
    fetchData();
  }, []);

  const totalNegociosAtivos = platStats?.total_negocios_ativos ?? mockListings.length;
  const totalGalerias = platStats?.total_galerias ?? mockGalerias.length;
  const totalEspacos = platStats?.total_espacos ?? mockGalerias.reduce((acc, g) => acc + g.espacos.filter((e) => e.disponivel).length, 0);

  if (loading || !stats) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  // Chart data
  const pieData = [
    { name: "Novos", value: stats.novos },
    { name: "Em andamento", value: stats.emAndamento },
    { name: "Convertidos", value: stats.convertidos },
    { name: "Perdidos", value: stats.perdidos },
  ].filter((d) => d.value > 0);

  const barData = Object.entries(stats.porOrigem)
    .map(([key, value]) => ({
      name: origemLabels[key] || key,
      total: value,
    }))
    .filter((d) => d.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">Visão geral da plataforma NegociaAky</p>
          </div>
          <Button asChild size="sm" className="gap-2">
            <Link to="/admin/pipeline">
              <Kanban className="h-4 w-4" />
              Ver Pipeline
            </Link>
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total de Leads</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-foreground">{stats.total}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <span className="font-medium text-green-600">+{stats.leadsHoje}</span> hoje
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Leads Novos</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <MessageCircle className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-foreground">{stats.novos}</p>
            <p className="mt-1 text-xs text-muted-foreground">Aguardando contato</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-foreground">{stats.taxaConversao}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.convertidos} convertido{stats.convertidos !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Negócios Ativos</p>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <Building2 className="h-5 w-5 text-accent" />
              </div>
            </div>
            <p className="mt-2 font-display text-3xl font-bold text-foreground">{totalNegociosAtivos}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              + {totalGalerias} galerias ({totalEspacos} espaços)
            </p>
          </div>
        </div>

        {/* Desempenho Comercial — VGV da plataforma */}
        {platStats && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">Desempenho Comercial</h2>
              <span className="text-xs text-muted-foreground">Valores agregados de todos os corretores</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-green-700 font-medium">VGV em venda</p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <DollarSign className="h-5 w-5 text-green-700" />
                  </div>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-green-800">
                  {formatMoneyShort(platStats.vgv_venda_total)}
                </p>
                <p className="mt-1 text-xs text-green-700/80">Soma de itens ativos</p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-blue-700 font-medium">Aluguel mensal</p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <KeyRound className="h-5 w-5 text-blue-700" />
                  </div>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-blue-800">
                  {formatMoneyShort(platStats.aluguel_mensal_total)}
                </p>
                <p className="mt-1 text-xs text-blue-700/80">Locação + espaços</p>
              </div>

              <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-violet-700 font-medium">Realizado</p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100">
                    <Award className="h-5 w-5 text-violet-700" />
                  </div>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-violet-800">
                  {formatMoneyShort(platStats.vgv_realizado_total)}
                </p>
                <p className="mt-1 text-xs text-violet-700/80">{platStats.total_vendidos} negócio(s) fechado(s)</p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-amber-700 font-medium">Conversão</p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
                    <TrendingUp className="h-5 w-5 text-amber-700" />
                  </div>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-amber-800">
                  {platStats.total_negocios_ativos > 0
                    ? ((platStats.total_vendidos / (platStats.total_negocios_ativos + platStats.total_vendidos)) * 100).toFixed(1)
                    : "0"}%
                </p>
                <p className="mt-1 text-xs text-amber-700/80">vendidos / total cadastrados</p>
              </div>
            </div>

            {/* Ranking Top 5 corretores */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-amber-500" />
                <h3 className="font-display font-semibold text-foreground">Top 5 corretores por VGV</h3>
              </div>
              {platStats.ranking.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  Nenhum corretor com negócios atribuídos ainda.
                </p>
              ) : (
                <div className="space-y-2">
                  {platStats.ranking.map((r, idx) => {
                    const medals = ["🥇", "🥈", "🥉"];
                    return (
                      <Link
                        key={r.id}
                        to="/admin/corretores"
                        className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 hover:bg-muted transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center text-lg">
                          {medals[idx] ?? <span className="text-sm font-bold text-muted-foreground">#{idx + 1}</span>}
                        </div>
                        {r.foto_url ? (
                          <img src={r.foto_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {r.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{r.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.leads_atribuidos} lead(s) · {r.vendidos} vendido(s)
                          </p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] uppercase text-muted-foreground">VGV venda</p>
                          <p className="text-sm font-bold text-green-700">{formatMoneyShort(r.vgv_venda)}</p>
                        </div>
                        <div className="text-right hidden md:block">
                          <p className="text-[10px] uppercase text-muted-foreground">Aluguel/mês</p>
                          <p className="text-sm font-bold text-blue-700">{formatMoneyShort(r.aluguel_mensal)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase text-muted-foreground">Realizado</p>
                          <p className="text-sm font-bold text-violet-700">{formatMoneyShort(r.realizado)}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pie Chart - Status Distribution */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-display font-semibold text-foreground mb-4">Leads por Status</h3>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 shrink-0">
                  {pieData.map((entry, i) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-semibold text-foreground ml-auto">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
                Nenhum dado para exibir
              </div>
            )}
          </div>

          {/* Bar Chart - Leads by Origin */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-display font-semibold text-foreground mb-4">Leads por Origem</h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={20}>
                    {barData.map((_entry, index) => (
                      <Cell key={`bar-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
                Nenhum dado para exibir
              </div>
            )}
          </div>
        </div>

        {/* Recent Leads + Pipeline */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Leads */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display font-semibold text-foreground">Leads Recentes</h2>
              <Button asChild variant="ghost" size="sm" className="text-primary gap-1">
                <Link to="/admin/leads">
                  Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            <div className="divide-y divide-border">
              {recentLeads.length === 0 ? (
                <div className="px-5 py-12 text-center text-muted-foreground">
                  Nenhum lead capturado ainda.
                </div>
              ) : (
                recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-start gap-4 px-5 py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                      {lead.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground truncate">{lead.nome}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[lead.status] || "bg-gray-100 text-gray-700"}`}>
                          {statusLabels[lead.status] || lead.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground truncate">{lead.mensagem}</p>
                      <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(lead.criado_em)}
                        </span>
                        <span>{origemLabels[lead.origem] || lead.origem}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pipeline Summary */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-semibold text-foreground">Pipeline</h3>
                <Button asChild variant="ghost" size="sm" className="text-primary gap-1 h-7">
                  <Link to="/admin/pipeline">
                    <Kanban className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Novos", value: stats.novos, color: "bg-blue-500", total: stats.total },
                  { label: "Em andamento", value: stats.emAndamento, color: "bg-amber-500", total: stats.total },
                  { label: "Convertidos", value: stats.convertidos, color: "bg-green-500", total: stats.total },
                  { label: "Perdidos", value: stats.perdidos, color: "bg-red-400", total: stats.total },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-sm">
                        <div className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                        {item.label}
                      </div>
                      <span className="font-semibold text-sm">{item.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all`}
                        style={{ width: `${item.total ? (item.value / item.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="font-display font-semibold text-foreground mb-3">Resumo Semanal</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Leads esta semana</span>
                  <span className="font-bold text-foreground">{stats.leadsSemana}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de conversão</span>
                  <span className="font-bold text-green-600">{stats.taxaConversao}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Negócios ativos</span>
                  <span className="font-bold text-foreground">{totalNegociosAtivos}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
