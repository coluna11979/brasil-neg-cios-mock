import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail, Send, MousePointerClick, AlertTriangle, Plus, FileText,
  BarChart3, Zap, CheckCircle2, Eye, Sparkles, Clock, MessageSquare,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useEmailCampaigns, useEmailTemplates } from "@/hooks/useEmailMarketing";
import {
  useEmailMetrics, useRecentSends, useEmailAutomations, useTransactionalGroups,
  type EmailFilter,
} from "@/hooks/useEmailMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const RANGE_OPTIONS: { key: number; label: string }[] = [
  { key: 7, label: "7d" },
  { key: 30, label: "30d" },
  { key: 90, label: "90d" },
];

const FILTERS: { key: EmailFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "campaign", label: "Campanhas" },
  { key: "transactional", label: "Transacionais" },
];

function fmtNum(n: number) {
  return n.toLocaleString("pt-BR");
}

function fmtPct(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

function fmtRelative(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days}d atrás`;
  return d.toLocaleDateString("pt-BR");
}

export default function MarketingDashboard() {
  usePageTitle("Marketing | Admin");
  const [filter, setFilter] = useState<EmailFilter>("all");
  const [range, setRange] = useState<number>(30);

  const { data: metrics, isLoading: loadingMetrics } = useEmailMetrics(filter, range);
  const { data: campaigns = [], isLoading: loadingC } = useEmailCampaigns();
  const { data: templates = [], isLoading: loadingT } = useEmailTemplates();
  const { data: automations = [], isLoading: loadingA } = useEmailAutomations();
  const { data: transactional = [], isLoading: loadingTx } = useTransactionalGroups();
  const { data: recentSends = [], isLoading: loadingR } = useRecentSends(15);

  const recentCampaigns = campaigns.slice(0, 4);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Email Marketing</h1>
              <p className="text-sm text-muted-foreground">Campanhas, automações e métricas de envio</p>
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

        {/* Filtros */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Segmented
            options={FILTERS}
            value={filter}
            onChange={(v) => setFilter(v as EmailFilter)}
          />
          <Segmented
            options={RANGE_OPTIONS.map((r) => ({ key: r.key, label: r.label }))}
            value={range}
            onChange={(v) => setRange(v as number)}
            small
          />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi
            icon={Send}
            label="Enviados"
            value={metrics?.sent ?? 0}
            sub={`Últimos ${range} dias`}
            loading={loadingMetrics}
            iconClass="text-blue-600"
          />
          <Kpi
            icon={CheckCircle2}
            label="Entrega"
            value={metrics?.delivered ?? 0}
            sub={fmtPct(metrics?.deliveryRate ?? 0)}
            loading={loadingMetrics}
            iconClass="text-green-600"
          />
          <Kpi
            icon={Eye}
            label="Aberturas"
            value={metrics?.opened ?? 0}
            sub={fmtPct(metrics?.openRate ?? 0)}
            loading={loadingMetrics}
            iconClass="text-amber-600"
          />
          <Kpi
            icon={MousePointerClick}
            label="Cliques"
            value={metrics?.clicked ?? 0}
            sub={fmtPct(metrics?.clickRate ?? 0)}
            loading={loadingMetrics}
            iconClass="text-purple-600"
          />
          <Kpi
            icon={AlertTriangle}
            label="Bounce"
            value={metrics?.bounced ?? 0}
            sub={fmtPct(metrics?.bounceRate ?? 0)}
            loading={loadingMetrics}
            iconClass="text-red-600"
          />
        </div>

        {/* Duas colunas: Campanhas + Automações */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campanhas */}
          <Section
            title="Campanhas recentes"
            icon={BarChart3}
            cta={<Link to="/admin/marketing/campanhas" className="text-xs font-medium text-primary hover:underline">Ver todas →</Link>}
          >
            {loadingC ? (
              <SkeletonRows />
            ) : recentCampaigns.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="Nenhuma campanha ainda"
                description="Crie sua primeira campanha para enviar emails em massa para sua audiência."
                action={
                  <Link
                    to="/admin/marketing/campanhas/nova"
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" /> Criar campanha
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentCampaigns.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/admin/marketing/campanhas/${c.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0 ml-3">
                        <span className="text-muted-foreground">{fmtNum(c.total_sent || 0)} env.</span>
                        <CampaignStatusBadge status={c.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Automações & Transacionais */}
          <Section
            title="Automações & Transacionais"
            icon={Zap}
            cta={<span className="text-xs text-muted-foreground">Disparado automaticamente</span>}
          >
            {(loadingA || loadingTx) ? (
              <SkeletonRows />
            ) : automations.length > 0 ? (
              <ul className="divide-y divide-border">
                {automations.map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground truncate">{a.name}</p>
                        <Badge variant={a.is_active ? "default" : "secondary"} className="text-[10px] py-0">
                          {a.is_active ? "Ativa" : "Pausada"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.trigger_event || a.description || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0 ml-3">
                      <span className="text-muted-foreground">{fmtNum(a.total_sent)} env.</span>
                      <span className="text-muted-foreground">{fmtPct(a.openRate)} abert.</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : transactional.length > 0 ? (
              <ul className="divide-y divide-border">
                {transactional.map((t) => (
                  <li key={t.subject} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p className="font-medium text-sm text-foreground truncate">{t.subject}</p>
                          <Badge variant="default" className="text-[10px] py-0">Ativa</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Disparada quando um lead se cadastra · último envio {fmtRelative(t.lastSentAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0">
                        <span className="text-muted-foreground">{fmtNum(t.total)} env.</span>
                        <span className="text-muted-foreground">{fmtPct(t.openRate)} abert.</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={Zap}
                title="Nenhuma automação configurada"
                description="Emails de boas-vindas são disparados automaticamente quando um lead se cadastra. Configure novas automações conforme precisar."
              />
            )}
          </Section>
        </div>

        {/* Atividade recente */}
        <Section
          title="Atividade recente"
          icon={Clock}
          cta={<span className="text-xs text-muted-foreground">{recentSends.length} envios</span>}
        >
          {loadingR ? (
            <div className="p-5"><SkeletonRows /></div>
          ) : recentSends.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Sem envios ainda"
              description="Quando você enviar emails, eles aparecerão aqui."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                    <th className="text-left font-medium px-5 py-2.5">Destinatário</th>
                    <th className="text-left font-medium px-5 py-2.5">Origem</th>
                    <th className="text-left font-medium px-5 py-2.5">Status</th>
                    <th className="text-right font-medium px-5 py-2.5">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSends.map((s) => (
                    <tr key={s.id} className="border-b border-border/60 hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-2.5 text-foreground truncate max-w-[240px]">{s.email}</td>
                      <td className="px-5 py-2.5 text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          {s.source_type === "campaign"
                            ? <BarChart3 className="h-3.5 w-3.5 text-blue-600" />
                            : <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                          }
                          {s.source_label}
                        </span>
                      </td>
                      <td className="px-5 py-2.5">
                        <SendStatusBadge status={s.status} />
                      </td>
                      <td className="px-5 py-2.5 text-right text-muted-foreground">
                        {fmtRelative(s.sent_at || s.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* WhatsApp */}
        <section className="rounded-2xl border border-green-200 bg-green-50/40 p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="font-semibold text-sm text-foreground">WhatsApp Marketing</h2>
                <p className="text-xs text-muted-foreground">Disparos em massa via UAZapi</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to="/admin/marketing/whatsapp"
                className="flex items-center gap-2 rounded-xl border border-green-300 bg-white px-3 py-2 text-xs font-medium text-green-700 hover:bg-green-50"
              >
                Ver campanhas
              </Link>
              <Link
                to="/admin/marketing/whatsapp/nova"
                className="flex items-center gap-2 rounded-xl bg-green-500 px-3 py-2 text-xs font-semibold text-white hover:bg-green-600"
              >
                <Plus className="h-3.5 w-3.5" /> Nova campanha
              </Link>
            </div>
          </div>
        </section>

        {/* Templates */}
        <Section
          title="Templates"
          icon={FileText}
          cta={<Link to="/admin/marketing/templates" className="text-xs font-medium text-primary hover:underline">Ver todos →</Link>}
        >
          <div className="p-5">
            {loadingT ? (
              <Skeleton className="h-5 w-40" />
            ) : templates.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">Nenhum template criado ainda</p>
                <Link
                  to="/admin/marketing/templates"
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <Plus className="h-4 w-4" /> Criar template
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {templates.length} template{templates.length !== 1 ? "s" : ""} disponíve{templates.length !== 1 ? "is" : "l"}
                </p>
                <Link to="/admin/marketing/templates" className="text-sm font-medium text-primary hover:underline">
                  Gerenciar →
                </Link>
              </div>
            )}
          </div>
        </Section>
      </div>
    </AdminLayout>
  );
}

/* ───────── components ───────── */

function Section({
  title, icon: Icon, cta, children,
}: { title: string; icon: any; cta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card overflow-hidden">
      <header className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-sm flex items-center gap-2 text-foreground">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h2>
        {cta}
      </header>
      {children}
    </section>
  );
}

function Kpi({
  icon: Icon, label, value, sub, loading, iconClass,
}: { icon: any; label: string; value: number; sub?: string; loading?: boolean; iconClass?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground mb-2 font-medium">
        <Icon className={`h-3.5 w-3.5 ${iconClass || "text-muted-foreground"}`} />
        {label}
      </div>
      {loading ? (
        <>
          <Skeleton className="h-7 w-20 mb-1.5" />
          <Skeleton className="h-3 w-16" />
        </>
      ) : (
        <>
          <p className="text-2xl font-semibold text-foreground tabular-nums">{fmtNum(value)}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </>
      )}
    </div>
  );
}

function Segmented<T extends string | number>({
  options, value, onChange, small,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  small?: boolean;
}) {
  return (
    <div className={`inline-flex items-center rounded-xl border border-border bg-card p-1 ${small ? "text-xs" : "text-sm"}`}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <button
            key={String(o.key)}
            onClick={() => onChange(o.key)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    draft: { cls: "bg-muted text-muted-foreground", label: "Rascunho" },
    scheduled: { cls: "bg-blue-100 text-blue-700", label: "Agendada" },
    sending: { cls: "bg-amber-100 text-amber-700", label: "Enviando" },
    sent: { cls: "bg-green-100 text-green-700", label: "Enviada" },
    completed: { cls: "bg-green-100 text-green-700", label: "Concluída" },
    failed: { cls: "bg-red-100 text-red-700", label: "Falhou" },
    cancelled: { cls: "bg-muted text-muted-foreground", label: "Cancelada" },
  };
  const m = map[status] || { cls: "bg-muted text-muted-foreground", label: status };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
}

function SendStatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const map: Record<string, { cls: string; label: string }> = {
    sent: { cls: "bg-muted text-muted-foreground", label: "Enviado" },
    delivered: { cls: "bg-green-100 text-green-700", label: "Entregue" },
    opened: { cls: "bg-blue-100 text-blue-700", label: "Aberto" },
    clicked: { cls: "bg-purple-100 text-purple-700", label: "Clicado" },
    bounced: { cls: "bg-red-100 text-red-700", label: "Bounce" },
    failed: { cls: "bg-red-100 text-red-700", label: "Falhou" },
    error: { cls: "bg-red-100 text-red-700", label: "Erro" },
  };
  const m = map[s] || { cls: "bg-muted text-muted-foreground", label: status };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${m.cls}`}>{m.label}</span>;
}

function SkeletonRows() {
  return (
    <div className="divide-y divide-border">
      {[0, 1, 2].map((i) => (
        <div key={i} className="px-5 py-3 flex items-center justify-between">
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  icon: Icon, title, description, action,
}: { icon: any; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="px-5 py-10 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground mb-4 max-w-sm mx-auto">{description}</p>
      {action}
    </div>
  );
}
