import { Link, useLocation } from "react-router-dom";
import {
  MessageSquare, Plus, Send, Users, CheckCircle2, XCircle,
  BarChart3, Loader2, Phone, Zap, ArrowRight,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useWhatsappCampaigns } from "@/hooks/useWhatsappMarketing";

function fmtNum(n: number) { return (n || 0).toLocaleString("pt-BR"); }
function fmtPct(a: number, b: number) {
  if (!b) return "—";
  return `${((a / b) * 100).toFixed(1)}%`;
}
function fmtRelative(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function WhatsappDashboard() {
  usePageTitle("WhatsApp Marketing | Admin");
  const { data: campaigns = [], isLoading } = useWhatsappCampaigns();

  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((s, c) => s + (c.total_sent || 0), 0);
  const totalFailed = campaigns.reduce((s, c) => s + (c.total_failed || 0), 0);
  const totalRecipients = campaigns.reduce((s, c) => s + (c.total_recipients || 0), 0);
  const completed = campaigns.filter((c) => c.status === "completed");
  const sending = campaigns.filter((c) => c.status === "sending");
  const drafts = campaigns.filter((c) => c.status === "draft");
  const recent = campaigns.slice(0, 5);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/20">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">WhatsApp Marketing</h1>
              <p className="text-sm text-muted-foreground">Campanhas e disparos em massa via UAZapi</p>
            </div>
          </div>
          <Link
            to="/admin/marketing/whatsapp/nova"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-500/20 hover:from-green-600 hover:to-green-700 transition-all"
          >
            <Plus className="h-4 w-4" /> Nova campanha
          </Link>
        </div>

        {/* Sub-nav */}
        <WaSubNav />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            icon={BarChart3}
            label="Campanhas"
            value={fmtNum(totalCampaigns)}
            sub={`${completed.length} concluídas`}
            color="bg-blue-50 text-blue-600 border-blue-100"
            iconBg="bg-blue-100"
            loading={isLoading}
          />
          <KpiCard
            icon={Send}
            label="Mensagens enviadas"
            value={fmtNum(totalSent)}
            sub={`de ${fmtNum(totalRecipients)} destinatários`}
            color="bg-green-50 text-green-600 border-green-100"
            iconBg="bg-green-100"
            loading={isLoading}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Taxa de sucesso"
            value={fmtPct(totalSent, totalSent + totalFailed)}
            sub={`${fmtNum(totalSent)} de ${fmtNum(totalSent + totalFailed)}`}
            color="bg-emerald-50 text-emerald-600 border-emerald-100"
            iconBg="bg-emerald-100"
            loading={isLoading}
          />
          <KpiCard
            icon={XCircle}
            label="Falhas"
            value={fmtNum(totalFailed)}
            sub={totalFailed > 0 ? `${fmtPct(totalFailed, totalSent + totalFailed)} do total` : "Nenhuma falha"}
            color="bg-red-50 text-red-600 border-red-100"
            iconBg="bg-red-100"
            loading={isLoading}
          />
        </div>

        {/* Duas colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campanhas recentes — 2/3 */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <BarChart3 className="h-4 w-4 text-green-500" /> Campanhas recentes
                </h2>
                <Link to="/admin/marketing/whatsapp/campanhas" className="text-xs font-medium text-green-600 hover:underline flex items-center gap-1">
                  Ver todas <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 mb-3">
                    <MessageSquare className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="font-medium text-foreground mb-1">Nenhuma campanha ainda</p>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Crie sua primeira campanha WhatsApp para enviar mensagens em massa para seus leads.
                  </p>
                  <Link
                    to="/admin/marketing/whatsapp/nova"
                    className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
                  >
                    <Plus className="h-4 w-4" /> Criar campanha
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recent.map((c) => (
                    <Link
                      key={c.id}
                      to={`/admin/marketing/whatsapp/${c.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground truncate group-hover:text-green-600 transition-colors">
                          {c.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {c.message.slice(0, 80)}{c.message.length > 80 ? "…" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">{fmtNum(c.total_sent)} / {fmtNum(c.total_recipients)}</p>
                          <p className="text-[10px] text-muted-foreground">{fmtRelative(c.completed_at || c.started_at)}</p>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Painel lateral — 1/3 */}
          <div className="space-y-4">
            {/* Status */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" /> Resumo
              </h3>
              <div className="space-y-3">
                <StatusRow label="Rascunhos" count={drafts.length} color="text-gray-600" dot="bg-gray-400" />
                <StatusRow label="Enviando" count={sending.length} color="text-amber-600" dot="bg-amber-400" />
                <StatusRow label="Concluídas" count={completed.length} color="text-green-600" dot="bg-green-400" />
              </div>
            </div>

            {/* Conexão */}
            <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-green-50/50 p-5 space-y-3">
              <h3 className="font-semibold text-sm text-green-800 flex items-center gap-2">
                <Phone className="h-4 w-4" /> Conexão UAZapi
              </h3>
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-green-700 font-medium">Conectado</span>
              </div>
              <p className="text-xs text-green-600/80">
                As mensagens são enviadas via UAZapi com intervalo de 1.2s entre cada envio para evitar bloqueio.
              </p>
              <Link
                to="/admin/integracoes"
                className="text-xs font-medium text-green-700 hover:underline"
              >
                Configurar em Integrações →
              </Link>
            </div>

            {/* Dicas */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <h3 className="font-semibold text-sm text-foreground">Dicas de formatação</h3>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p><code className="bg-muted px-1 rounded text-[11px]">*negrito*</code> → <strong>negrito</strong></p>
                <p><code className="bg-muted px-1 rounded text-[11px]">_itálico_</code> → <em>itálico</em></p>
                <p><code className="bg-muted px-1 rounded text-[11px]">~tachado~</code> → <s>tachado</s></p>
                <p><code className="bg-muted px-1 rounded text-[11px]">{"{{primeiro_nome}}"}</code> → Nome do lead</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ──── Shared sub-nav ──── */
export function WaSubNav() {
  const { pathname } = useLocation();
  const tabs = [
    { to: "/admin/marketing/whatsapp", label: "Dashboard", exact: true },
    { to: "/admin/marketing/whatsapp/campanhas", label: "Campanhas" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 w-fit">
      {tabs.map((t) => {
        const active = t.exact ? pathname === t.to : pathname.startsWith(t.to);
        return (
          <Link
            key={t.to}
            to={t.to}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-green-500 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

/* ──── Components ──── */

function KpiCard({ icon: Icon, label, value, sub, color, iconBg, loading }: {
  icon: any; label: string; value: string; sub: string; color: string; iconBg: string; loading?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin opacity-50" />
      ) : (
        <>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs mt-1 opacity-70">{sub}</p>
        </>
      )}
    </div>
  );
}

function StatusRow({ label, count, color, dot }: { label: string; count: number; color: string; dot: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </span>
      <span className={`text-sm font-semibold ${color}`}>{count}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sending: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    draft: "Rascunho", sending: "Enviando", completed: "Concluída",
    failed: "Falhou", cancelled: "Cancelada",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {labels[status] || status}
    </span>
  );
}
