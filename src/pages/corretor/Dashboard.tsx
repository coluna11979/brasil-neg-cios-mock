import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { supabase } from "@/lib/supabase";
import { getAllLeads, type Lead } from "@/stores/leadStore";
import {
  Users, TrendingUp, Target, MessageCircle, ArrowRight,
  Loader2, Clock, CheckCircle2, AlertCircle, BarChart3,
  FileText, Calculator, Megaphone, Sparkles,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
}

function isThisWeek(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000;
}

function saudacao() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color, to }: {
  label: string; value: number | string; sub?: string;
  icon: React.ReactNode; color: string; to?: string;
}) {
  const content = (
    <div className={`rounded-2xl p-4 border ${color} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div className="opacity-80">{icon}</div>
        {to && <ArrowRight className="h-4 w-4 opacity-40" />}
      </div>
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-75">{label}</p>
      {sub && <p className="text-xs opacity-50 mt-0.5">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : <div>{content}</div>;
}

// ─── Quick action ────────────────────────────────────────────────────────────
function QuickAction({ to, icon, label, sub, color }: {
  to: string; icon: React.ReactNode; label: string; sub: string; color: string;
}) {
  return (
    <Link to={to}
      className={`flex items-center gap-3 rounded-xl border p-3.5 transition-all hover:shadow-md hover:-translate-y-0.5 ${color}`}>
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-semibold truncate">{label}</p>
        <p className="text-xs opacity-60 truncate">{sub}</p>
      </div>
      <ArrowRight className="h-4 w-4 opacity-40 ml-auto shrink-0" />
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const CorretorDashboard = () => {
  usePageTitle("Início | NegociaAky");

  const [nomeCorretor, setNomeCorretor] = useState("");
  const [leads,        setLeads]        = useState<Lead[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [metaMes,      setMetaMes]      = useState(5);

  useEffect(() => {
    const meta = parseInt(localStorage.getItem("desempenho_meta_mes") || "5", 10);
    setMetaMes(meta);

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome")
        .eq("id", data.session.user.id)
        .single();
      setNomeCorretor(profile?.nome || data.session.user.user_metadata?.nome || "Corretor");
    });

    getAllLeads().then((l) => {
      setLeads(l);
      setLoading(false);
    });
  }, []);

  // ── Métricas ──
  const leadsHoje     = leads.filter(l => isToday(l.criado_em));
  const leadsSemana   = leads.filter(l => isThisWeek(l.criado_em));
  const leadsNovos    = leads.filter(l => l.status === "novo");
  const leadsAtivos   = leads.filter(l => l.status === "em-andamento");
  const convertidos   = leads.filter(l => l.status === "convertido");
  const taxaConversao = leads.length > 0 ? Math.round((convertidos.length / leads.length) * 100) : 0;
  const progressoMeta = Math.min(Math.round((convertidos.length / metaMes) * 100), 100);

  // Últimos 5 leads
  const ultimosLeads = leads.slice(0, 5);

  const statusConfig: Record<Lead["status"], { label: string; color: string; icon: React.ReactNode }> = {
    "novo":         { label: "Novo",        color: "text-blue-600 bg-blue-50",   icon: <AlertCircle className="h-3 w-3" /> },
    "em-andamento": { label: "Em contato",  color: "text-amber-600 bg-amber-50", icon: <Clock className="h-3 w-3" /> },
    "convertido":   { label: "Convertido",  color: "text-green-600 bg-green-50", icon: <CheckCircle2 className="h-3 w-3" /> },
    "perdido":      { label: "Perdido",     color: "text-red-500 bg-red-50",     icon: <AlertCircle className="h-3 w-3" /> },
  };

  if (loading) return (
    <CorretorLayout>
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    </CorretorLayout>
  );

  return (
    <CorretorLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Saudação */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {saudacao()}, {nomeCorretor.split(" ")[0]}!
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          {leadsNovos.length > 0 && (
            <Link to="/corretor/leads"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-blue-600 text-xs font-bold">
                {leadsNovos.length}
              </span>
              novos leads
            </Link>
          )}
        </div>

        {/* Stats principais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Hoje" value={leadsHoje.length} sub="novos leads"
            icon={<Users className="h-5 w-5" />}
            color="bg-blue-50 border-blue-100 text-blue-900" to="/corretor/leads" />
          <StatCard label="Esta semana" value={leadsSemana.length} sub="leads recebidos"
            icon={<TrendingUp className="h-5 w-5" />}
            color="bg-violet-50 border-violet-100 text-violet-900" to="/corretor/leads" />
          <StatCard label="Em contato" value={leadsAtivos.length} sub="em andamento"
            icon={<MessageCircle className="h-5 w-5" />}
            color="bg-amber-50 border-amber-100 text-amber-900" to="/corretor/pipeline" />
          <StatCard label="Convertidos" value={convertidos.length} sub={`taxa ${taxaConversao}%`}
            icon={<CheckCircle2 className="h-5 w-5" />}
            color="bg-green-50 border-green-100 text-green-900" to="/corretor/pipeline" />
        </div>

        {/* Meta do mês */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm text-foreground">Meta do Mês</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{convertidos.length} de {metaMes} conversões</span>
              <Link to="/corretor/desempenho"
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                ver tudo <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${progressoMeta >= 100 ? "bg-green-500" : progressoMeta >= 60 ? "bg-primary" : "bg-amber-500"}`}
              style={{ width: `${progressoMeta}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progressoMeta}% da meta</span>
            <span className={progressoMeta >= 100 ? "text-green-600 font-semibold" : ""}>
              {progressoMeta >= 100 ? "Meta batida! 🎉" : `Faltam ${metaMes - convertidos.length} conversões`}
            </span>
          </div>
        </div>

        {/* Últimos leads */}
        {ultimosLeads.length > 0 && (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Últimos Leads
              </h2>
              <Link to="/corretor/leads"
                className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="divide-y divide-border">
              {ultimosLeads.map(lead => {
                const s = statusConfig[lead.status];
                return (
                  <Link key={lead.id} to="/corretor/leads"
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {lead.nome.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{lead.nome}</p>
                      {lead.negocio_titulo && (
                        <p className="text-xs text-muted-foreground truncate">{lead.negocio_titulo}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>
                        {s.icon}{s.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{timeAgo(lead.criado_em)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Ações rápidas */}
        <div>
          <h2 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" /> Ferramentas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickAction to="/corretor/calculadora-roi"
              icon={<Calculator className="h-5 w-5 text-green-600" />}
              label="Calculadora ROI"
              sub="Calcule retorno e convença investidores"
              color="border-green-100 bg-green-50/50 text-green-900 hover:border-green-300" />
            <QuickAction to="/corretor/proposta"
              icon={<FileText className="h-5 w-5 text-blue-600" />}
              label="Proposta de Aquisição"
              sub="Gere proposta formal com termos"
              color="border-blue-100 bg-blue-50/50 text-blue-900 hover:border-blue-300" />
            <QuickAction to="/corretor/redes-sociais"
              icon={<Megaphone className="h-5 w-5 text-violet-600" />}
              label="Redes Sociais"
              sub="Crie posts e stories para Instagram"
              color="border-violet-100 bg-violet-50/50 text-violet-900 hover:border-violet-300" />
            <QuickAction to="/corretor/desempenho"
              icon={<BarChart3 className="h-5 w-5 text-amber-600" />}
              label="Meu Desempenho"
              sub="Comissões, metas e projeções"
              color="border-amber-100 bg-amber-50/50 text-amber-900 hover:border-amber-300" />
          </div>
        </div>

        {/* Sem leads ainda */}
        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border-2 border-dashed border-border">
            <Users className="h-12 w-12 opacity-15 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum lead ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Seus leads aparecerão aqui assim que chegarem</p>
          </div>
        )}

      </div>
    </CorretorLayout>
  );
};

export default CorretorDashboard;
