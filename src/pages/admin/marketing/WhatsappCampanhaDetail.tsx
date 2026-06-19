import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Send, Loader2, Users, CheckCircle2, XCircle, RefreshCw, MessageSquare,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import {
  useWhatsappCampaign, useWhatsappCampaignLeads,
  populateWhatsappLeads, sendWhatsappCampaign, sendWhatsappTest,
} from "@/hooks/useWhatsappMarketing";
import { toast } from "sonner";

export default function WhatsappCampanhaDetail() {
  const { id } = useParams<{ id: string }>();
  usePageTitle("Campanha WhatsApp | Admin");

  const { data: c, isLoading, refetch } = useWhatsappCampaign(id);
  const { data: leads = [], refetch: refetchLeads } = useWhatsappCampaignLeads(id);

  const [testPhone, setTestPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [populating, setPopulating] = useState(false);

  const handlePopulate = async () => {
    if (!id) return;
    setPopulating(true);
    try {
      const n = await populateWhatsappLeads(id);
      toast.success(`${n} destinatários carregados`);
      await Promise.all([refetch(), refetchLeads()]);
    } catch (e: any) {
      toast.error(e.message || "Erro populando audiência");
    } finally {
      setPopulating(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone.trim()) { toast.error("Informe o número"); return; }
    setTesting(true);
    try {
      await sendWhatsappTest(testPhone.trim(), id);
      toast.success(`Teste enviado pra ${testPhone}`);
    } catch (e: any) {
      toast.error(e.message || "Falha no teste — confira UAZapi em /admin/integracoes");
    } finally {
      setTesting(false);
    }
  };

  const handleSend = async () => {
    if (!id) return;
    if (!confirm(`Disparar campanha pra ${c?.total_recipients || 0} destinatários? Não dá pra cancelar depois.`)) return;
    setSending(true);
    try {
      const r = await sendWhatsappCampaign(id);
      toast.success(`Envio iniciado: ${r.recipients} destinatários`);
      await Promise.all([refetch(), refetchLeads()]);
    } catch (e: any) {
      toast.error(e.message || "Erro no envio");
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }
  if (!c) {
    return <AdminLayout><div className="text-center py-20 text-muted-foreground">Campanha não encontrada</div></AdminLayout>;
  }

  const canSend = c.status === "draft";

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/admin/marketing/whatsapp" className="text-muted-foreground hover:text-foreground shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0">
              <h1 className="font-display text-xl font-bold truncate">{c.name}</h1>
              <p className="text-xs text-muted-foreground">Campanha WhatsApp via UAZapi</p>
            </div>
          </div>
          <StatusBadge status={c.status} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <Kpi icon={Users} label="Destinatários" value={c.total_recipients} color="text-blue-600" />
          <Kpi icon={CheckCircle2} label="Enviados" value={c.total_sent} color="text-green-600" />
          <Kpi icon={XCircle} label="Falhou" value={c.total_failed} color="text-red-500" />
        </div>

        {/* Mensagem */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-green-500" /> Mensagem
          </h2>
          <div className="bg-muted rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed font-mono">
            {c.message}
          </div>
        </section>

        {/* Ações */}
        {canSend && (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
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
                className="flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Disparar campanha
              </button>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <label className="text-xs font-medium">Enviar teste (número com DDD, ex: 11987654321)</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="11987654321"
                  className="flex-1 rounded-xl border border-border bg-muted px-3 py-2 text-sm"
                />
                <button
                  onClick={handleTest}
                  disabled={testing}
                  className="flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Teste
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Destinatários */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-sm">Destinatários ({leads.length})</h2>
          </div>
          {leads.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhum destinatário ainda. Clique em "Recalcular audiência".
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/30 sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Nome</th>
                    <th className="text-left px-4 py-2 font-medium">Telefone</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Enviado</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 300).map((l) => (
                    <tr key={l.id} className="border-t border-border">
                      <td className="px-4 py-2 text-muted-foreground">{l.nome || "—"}</td>
                      <td className="px-4 py-2">{l.phone}</td>
                      <td className="px-4 py-2"><LeadStatus s={l.status} /></td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {l.sent_at ? new Date(l.sent_at).toLocaleString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leads.length > 300 && (
                <div className="px-4 py-2 text-center text-[10px] text-muted-foreground border-t border-border">
                  + {leads.length - 300} ocultos
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function Kpi({ icon: Icon, label, value, color }: any) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
        <Icon className={`h-3 w-3 ${color}`} /> {label}
      </div>
      <p className="text-lg font-bold text-foreground">{(value || 0).toLocaleString("pt-BR")}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
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
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {labels[status] || status}
    </span>
  );
}

function LeadStatus({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-gray-100 text-gray-600",
    sent: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = { pending: "pendente", sent: "enviado", failed: "falhou" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${map[s] || "bg-gray-100 text-gray-600"}`}>
      {labels[s] || s}
    </span>
  );
}
