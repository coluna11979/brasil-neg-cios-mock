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

  useEffect(() => {
    async function fetchData() {
      const [statsData, leadsData] = await Promise.all([
        getLeadStats(),
        getAllLeads(),
      ]);
      setStats(statsData);
      setRecentLeads(leadsData.slice(0, 5));
      setLoading(false);
    }
    fetchData();
  }, []);

  const totalNegociosAtivos = mockListings.length;
  const totalGalerias = mockGalerias.length;
  const totalEspacos = mockGalerias.reduce((acc, g) => acc + g.espacos.filter((e) => e.disponivel).length, 0);

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
