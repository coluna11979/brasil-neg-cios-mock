import { Link } from "react-router-dom";
import { Mail, Send, MousePointerClick, AlertTriangle, Plus, FileText, BarChart3 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useEmailCampaigns, useEmailTemplates } from "@/hooks/useEmailMarketing";

const fmtPct = (n: number, total: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "—";

export default function MarketingDashboard() {
  usePageTitle("Marketing | Admin");
  const { data: campaigns = [], isLoading: loadingC } = useEmailCampaigns();
  const { data: templates = [], isLoading: loadingT } = useEmailTemplates();

  const totals = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + (c.total_sent || 0),
      delivered: acc.delivered + (c.total_delivered || 0),
      opened: acc.opened + (c.total_opened || 0),
      clicked: acc.clicked + (c.total_clicked || 0),
      bounced: acc.bounced + (c.total_bounced || 0),
    }),
    { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 },
  );

  const recent = campaigns.slice(0, 5);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Email Marketing</h1>
              <p className="text-sm text-muted-foreground">Campanhas, templates e métricas de envio</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to="/admin/marketing/templates"
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <FileText className="h-4 w-4" /> Templates
            </Link>
            <Link
              to="/admin/marketing/campanhas/nova"
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Nova campanha
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi icon={Send} label="Enviados" value={totals.sent} accent="text-blue-600" />
          <Kpi icon={Mail} label="Entregues" value={totals.delivered} sub={fmtPct(totals.delivered, totals.sent)} accent="text-green-600" />
          <Kpi icon={Mail} label="Abertos" value={totals.opened} sub={fmtPct(totals.opened, totals.delivered)} accent="text-amber-600" />
          <Kpi icon={MousePointerClick} label="Clicados" value={totals.clicked} sub={fmtPct(totals.clicked, totals.opened)} accent="text-purple-600" />
          <Kpi icon={AlertTriangle} label="Bounce" value={totals.bounced} sub={fmtPct(totals.bounced, totals.sent)} accent="text-red-600" />
        </div>

        {/* Recentes */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Campanhas recentes</h2>
            <Link to="/admin/marketing/campanhas" className="text-xs text-primary hover:underline">Ver todas →</Link>
          </div>
          <div className="divide-y divide-border">
            {loadingC ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">Carregando…</div>
            ) : recent.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Mail className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">Nenhuma campanha criada ainda</p>
                <Link
                  to="/admin/marketing/campanhas/nova"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" /> Criar primeira campanha
                </Link>
              </div>
            ) : (
              recent.map((c) => (
                <Link
                  key={c.id}
                  to={`/admin/marketing/campanhas/${c.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-muted-foreground">{c.total_sent || 0} enviados</span>
                    <StatusBadge status={c.status} />
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Templates rápidos */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Templates</h2>
            <Link to="/admin/marketing/templates" className="text-xs text-primary hover:underline">Ver todos →</Link>
          </div>
          <div className="p-5">
            {loadingT ? (
              <div className="text-center text-sm text-muted-foreground">Carregando…</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">Nenhum template criado</p>
                <Link
                  to="/admin/marketing/templates"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" /> Criar template
                </Link>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{templates.length} template{templates.length !== 1 ? "s" : ""} ativos</div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function Kpi({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: number; sub?: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
        <Icon className={`h-3.5 w-3.5 ${accent}`} />
        {label}
      </div>
      <p className="text-xl font-bold text-foreground">{value.toLocaleString("pt-BR")}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    scheduled: "bg-blue-100 text-blue-700",
    sending: "bg-amber-100 text-amber-700",
    sent: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    draft: "Rascunho",
    scheduled: "Agendada",
    sending: "Enviando",
    sent: "Enviada",
    completed: "Concluída",
    failed: "Falhou",
    cancelled: "Cancelada",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {labels[status] || status}
    </span>
  );
}
