import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, Users, Mail, Eye, MousePointerClick, AlertTriangle, RefreshCw, Save } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import {
  useEmailCampaign, useCampaignLeads, useSaveCampaign,
  populateCampaignLeads, sendCampaign, sendTestEmail,
  useEmailTemplates,
} from "@/hooks/useEmailMarketing";
import { toast } from "sonner";

export default function CampanhaDetail() {
  const { id } = useParams<{ id: string }>();
  usePageTitle("Campanha | Admin");
  const { data: c, isLoading, refetch } = useEmailCampaign(id);
  const { data: leads = [], refetch: refetchLeads } = useCampaignLeads(id);
  const { data: templates = [] } = useEmailTemplates();
  const save = useSaveCampaign();

  const [html, setHtml] = useState("");
  const [showHtml, setShowHtml] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [populating, setPopulating] = useState(false);

  // Pre-fill HTML when campaign loads
  if (c && html === "" && c.html_content) setHtml(c.html_content);

  const handlePopulate = async () => {
    if (!id) return;
    setPopulating(true);
    try {
      const n = await populateCampaignLeads(id);
      toast.success(`${n} destinatários carregados`);
      await Promise.all([refetch(), refetchLeads()]);
    } catch (e: any) {
      toast.error(e.message || "Erro populando audiência");
    } finally {
      setPopulating(false);
    }
  };

  const handleSaveHtml = async () => {
    if (!id) return;
    try {
      await save.mutateAsync({ id, html_content: html });
      toast.success("Conteúdo salvo");
      await refetch();
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar");
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Email obrigatório");
      return;
    }
    setTesting(true);
    try {
      await sendTestEmail({
        campaign_id: id,
        test_email: testEmail.trim(),
        html: html || c?.html_content || "",
        subject: c?.subject,
      });
      toast.success(`Teste enviado pra ${testEmail}`);
    } catch (e: any) {
      toast.error(e.message || "Falha no teste — confira Resend em /admin/integracoes");
    } finally {
      setTesting(false);
    }
  };

  const handleSend = async () => {
    if (!id) return;
    if (!confirm(`Disparar campanha pra ${c?.total_recipients || 0} destinatários? Não dá pra cancelar depois.`)) return;
    setSending(true);
    try {
      const r = await sendCampaign(id);
      toast.success(`Envio iniciado: ${r.recipients} destinatários`);
      await Promise.all([refetch(), refetchLeads()]);
    } catch (e: any) {
      toast.error(e.message || "Erro no envio");
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AdminLayout>;
  }
  if (!c) {
    return <AdminLayout><div className="text-center py-20 text-muted-foreground">Campanha não encontrada</div></AdminLayout>;
  }

  const canSend = c.status === "draft" || c.status === "scheduled";
  const usedTpl = templates.find((t) => t.id === c.template_id);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5 pb-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/admin/marketing/campanhas" className="text-muted-foreground hover:text-foreground shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold truncate">{c.name}</h1>
              <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
            </div>
          </div>
          <StatusBadge status={c.status} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Kpi icon={Users} label="Destinatários" value={c.total_recipients} accent="text-blue-600" />
          <Kpi icon={Send} label="Enviados" value={c.total_sent} accent="text-blue-600" />
          <Kpi icon={Mail} label="Entregues" value={c.total_delivered} accent="text-green-600" />
          <Kpi icon={Eye} label="Abertos" value={c.total_opened} accent="text-amber-600" />
          <Kpi icon={MousePointerClick} label="Clicados" value={c.total_clicked} accent="text-purple-600" />
        </div>
        {c.total_bounced > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 flex items-center gap-2 text-xs text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" /> {c.total_bounced} bounces
          </div>
        )}

        {/* Ações */}
        {canSend && (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold text-sm">Ações</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={handlePopulate}
                disabled={populating}
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {populating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Recalcular audiência
              </button>
              <button
                onClick={handleSend}
                disabled={sending || c.total_recipients === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Disparar campanha
              </button>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <label className="text-xs font-medium">Enviar teste antes</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="flex-1 rounded-xl border border-border bg-muted px-3 py-2 text-sm"
                />
                <button
                  onClick={handleSendTest}
                  disabled={testing}
                  className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Teste
                </button>
              </div>
            </div>
          </section>
        )}

        {/* HTML (editor inline simples) */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold text-sm">HTML do email {usedTpl && <span className="text-xs text-muted-foreground">(baseado em: {usedTpl.name})</span>}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHtml((s) => !s)}
                className="text-xs text-primary hover:underline"
              >
                {showHtml ? "Esconder" : "Editar"}
              </button>
              {showHtml && (
                <button
                  onClick={handleSaveHtml}
                  disabled={save.isPending}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                >
                  {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Salvar
                </button>
              )}
            </div>
          </div>
          {showHtml ? (
            <textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="w-full font-mono text-xs p-4 border-0 outline-none resize-y bg-card"
              style={{ minHeight: 320 }}
              spellCheck={false}
            />
          ) : (
            <div className="p-5 text-xs text-muted-foreground">
              {c.html_content ? `${c.html_content.length} caracteres salvos` : "Nenhum HTML — defina antes de disparar"}
            </div>
          )}
        </section>

        {/* Destinatários */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-sm">Destinatários ({leads.length})</h2>
          </div>
          {leads.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhum destinatário ainda. Clique em "Recalcular audiência" pra popular.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Email</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Enviado</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 200).map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-4 py-2 truncate max-w-xs">{l.email}</td>
                      <td className="px-4 py-2"><SendStatus s={l.status} /></td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {l.sent_at ? new Date(l.sent_at).toLocaleString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leads.length > 200 && (
                <div className="px-4 py-2 text-center text-[10px] text-muted-foreground border-t border-border">
                  + {leads.length - 200} ocultos
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function Kpi({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
        <Icon className={`h-3 w-3 ${accent}`} />
        {label}
      </div>
      <p className="text-lg font-bold text-foreground">{(value || 0).toLocaleString("pt-BR")}</p>
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
    draft: "Rascunho", scheduled: "Agendada", sending: "Enviando", sent: "Enviada",
    completed: "Concluída", failed: "Falhou", cancelled: "Cancelada",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {labels[status] || status}
    </span>
  );
}

function SendStatus({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    delivered: "bg-green-100 text-green-700",
    opened: "bg-amber-100 text-amber-700",
    clicked: "bg-purple-100 text-purple-700",
    bounced: "bg-red-100 text-red-700",
    complained: "bg-red-100 text-red-700",
    failed: "bg-red-100 text-red-700",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${map[s] || "bg-gray-100 text-gray-700"}`}>{s}</span>;
}
