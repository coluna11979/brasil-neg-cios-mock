import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, Users, Mail, Eye, MousePointerClick, AlertTriangle, RefreshCw, Save, Plus, Trash2, UserPlus, UserMinus, FileText, Zap, Image, Type, CheckCircle2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import {
  useEmailCampaign, useCampaignLeads, useSaveCampaign,
  populateCampaignLeads, sendCampaign, sendTestEmail,
  useEmailTemplates,
} from "@/hooks/useEmailMarketing";
import { supabase } from "@/lib/supabase";
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
  const [addEmail, setAddEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [contentMode, setContentMode] = useState<"choose" | "templates" | "quick" | "html">("choose");
  const [qTitle, setQTitle] = useState("");
  const [qText, setQText] = useState("");
  const [qImage, setQImage] = useState("");
  const [qBtnLabel, setQBtnLabel] = useState("Saiba mais →");
  const [qBtnLink, setQBtnLink] = useState("https://negociaaky.com.br");

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

  const handleAddRecipient = async () => {
    const email = addEmail.trim().toLowerCase();
    if (!email || !id) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error("Email inválido"); return; }
    if (leads.some((l) => l.email.toLowerCase() === email)) { toast.error("Já está na lista"); return; }
    setAdding(true);
    try {
      const { error } = await supabase.from("email_campaign_leads").insert({ campaign_id: id, email, status: "pending" });
      if (error) throw error;
      toast.success(`${email} adicionado`);
      setAddEmail("");
      await Promise.all([refetchLeads(), refetch()]);
    } catch (e: any) { toast.error(e.message || "Erro ao adicionar"); }
    finally { setAdding(false); }
  };

  const handleRemoveRecipient = async (leadId: string, email: string) => {
    if (!confirm(`Remover ${email} da campanha?`)) return;
    setRemoving(leadId);
    try {
      const { error } = await supabase.from("email_campaign_leads").delete().eq("id", leadId);
      if (error) throw error;
      toast.success(`${email} removido`);
      await Promise.all([refetchLeads(), refetch()]);
    } catch (e: any) { toast.error(e.message || "Erro ao remover"); }
    finally { setRemoving(null); }
  };

  const handlePickTemplate = async (tplId: string) => {
    const tpl = templates.find((t) => t.id === tplId);
    if (!tpl?.html_content || !id) return;
    try {
      await save.mutateAsync({ id, html_content: tpl.html_content, template_id: tplId });
      setHtml(tpl.html_content);
      setContentMode("choose");
      toast.success(`Template "${tpl.name}" aplicado`);
      await refetch();
    } catch (e: any) { toast.error(e.message || "Erro ao aplicar template"); }
  };

  const buildQuickHtml = () => {
    const W = "#BAA05E";
    const parts: string[] = [];
    if (qTitle.trim()) parts.push(`<tr><td style="padding:0 0 12px;"><h1 style="font-size:26px;font-weight:700;color:#18181b;margin:0;text-align:center;">${qTitle}</h1></td></tr>`);
    if (qText.trim()) parts.push(`<tr><td style="padding:0 0 16px;font-size:15px;color:#52525b;line-height:1.7;text-align:left;">${qText.replace(/\n/g, "<br/>")}</td></tr>`);
    if (qImage.trim()) parts.push(`<tr><td style="padding:0 0 16px;"><img src="${qImage}" alt="Imagem" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:0 auto;" /></td></tr>`);
    if (qBtnLabel.trim() && qBtnLink.trim()) parts.push(`<tr><td style="padding:16px 0;text-align:center;"><a href="${qBtnLink}" style="display:inline-block;background:${W};color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:10px;text-decoration:none;">${qBtnLabel}</a></td></tr>`);
    return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f5f3ee;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ee;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
<tr><td style="background:linear-gradient(135deg,${W} 0%,#9A8340 100%);padding:28px 32px;border-radius:16px 16px 0 0;text-align:center;">
<span style="font-size:26px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Negocia<span style="font-weight:400;">Aky</span></span><br/>
<span style="font-size:11px;color:rgba(255,255,255,0.75);letter-spacing:1.5px;text-transform:uppercase;">Conecte · Negocie · Realize</span>
</td></tr>
<tr><td style="background:#fff;padding:36px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${parts.join("\n")}</table>
</td></tr>
<tr><td style="background:#faf8f0;padding:24px 32px;border-radius:0 0 16px 16px;border-top:2px solid ${W}20;text-align:center;font-size:11px;color:#a1a1aa;line-height:1.6;">
<span style="font-size:14px;font-weight:700;color:${W};">NegociaAky</span> · Seu negócio dos sonhos está aqui<br/>
<a href="https://negociaaky.com.br" style="color:${W};text-decoration:none;font-weight:500;">negociaaky.com.br</a> · <a href="{{unsubscribe_url}}" style="color:#a1a1aa;text-decoration:underline;">Descadastrar</a>
</td></tr>
</table></td></tr></table></body></html>`;
  };

  const handleSaveQuick = async () => {
    if (!id) return;
    const quickHtml = buildQuickHtml();
    try {
      await save.mutateAsync({ id, html_content: quickHtml });
      setHtml(quickHtml);
      setContentMode("choose");
      toast.success("Email rápido salvo!");
      await refetch();
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
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

        {/* Conteúdo do email */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm">Conteúdo do email</h2>
              {usedTpl && <p className="text-[11px] text-muted-foreground mt-0.5">Baseado no template: {usedTpl.name}</p>}
            </div>
            <div className="flex items-center gap-2">
              {c.html_content && (
                <button onClick={() => setShowHtml((s) => !s)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all">
                  {showHtml ? "Fechar código" : "Ver/editar HTML"}
                </button>
              )}
              {showHtml && (
                <button onClick={handleSaveHtml} disabled={save.isPending}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-all disabled:opacity-50"
                  style={{ backgroundColor: "#BAA05E" }}>
                  {save.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Salvar
                </button>
              )}
            </div>
          </div>

          {!c.html_content && !showHtml ? (
            <div className="p-5">
              {contentMode === "choose" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button onClick={() => setContentMode("templates")}
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border/60 p-6 text-center hover:border-[#BAA05E]/40 hover:bg-[#BAA05E]/3 transition-all group">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#BAA05E]/10 group-hover:bg-[#BAA05E]/20 transition-colors">
                      <FileText className="h-5 w-5" style={{ color: "#BAA05E" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Usar template</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Escolha um template pronto</p>
                    </div>
                  </button>
                  <button onClick={() => setContentMode("quick")}
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border/60 p-6 text-center hover:border-[#BAA05E]/40 hover:bg-[#BAA05E]/3 transition-all group">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#BAA05E]/10 group-hover:bg-[#BAA05E]/20 transition-colors">
                      <Zap className="h-5 w-5" style={{ color: "#BAA05E" }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Email rápido</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Crie direto aqui em 1 minuto</p>
                    </div>
                  </button>
                  <button onClick={() => { setContentMode("html"); setShowHtml(true); }}
                    className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border/60 p-6 text-center hover:border-[#BAA05E]/40 hover:bg-[#BAA05E]/3 transition-all group">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted group-hover:bg-muted/80 transition-colors">
                      <Type className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Colar HTML</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Cole código HTML pronto</p>
                    </div>
                  </button>
                </div>
              )}

              {contentMode === "templates" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Escolha um template</p>
                    <button onClick={() => setContentMode("choose")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
                  </div>
                  {templates.length === 0 ? (
                    <div className="text-center py-8 space-y-3">
                      <p className="text-sm text-muted-foreground">Nenhum template criado ainda</p>
                      <Link to="/admin/marketing/templates/novo" target="_blank"
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium border border-[#BAA05E]/30 hover:bg-[#BAA05E]/5 transition-all" style={{ color: "#BAA05E" }}>
                        <Plus className="h-4 w-4" /> Criar template
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {templates.map((t) => (
                        <button key={t.id} onClick={() => handlePickTemplate(t.id)}
                          disabled={save.isPending}
                          className="flex items-start gap-3 rounded-xl border border-border p-4 text-left hover:border-[#BAA05E]/40 hover:bg-[#BAA05E]/3 transition-all disabled:opacity-50">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: "#BAA05E15" }}>
                            <Mail className="h-4 w-4" style={{ color: "#BAA05E" }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground truncate">{t.name}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{t.category || "geral"} · {t.html_content ? `${(t.html_content.length / 1024).toFixed(1)}KB` : "sem HTML"}</p>
                          </div>
                          {t.html_content && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {contentMode === "quick" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Email rápido</p>
                    <button onClick={() => setContentMode("choose")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Voltar</button>
                  </div>
                  <p className="text-[11px] text-muted-foreground -mt-2">Preencha os campos — o email será gerado com header e footer da NegociaAky automaticamente.</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">Título (opcional)</label>
                      <input value={qTitle} onChange={(e) => setQTitle(e.target.value)} placeholder="Ex: Oportunidade imperdível!"
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[#BAA05E]/60 focus:ring-2 focus:ring-[#BAA05E]/10 transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">Texto do email</label>
                      <textarea value={qText} onChange={(e) => setQText(e.target.value)} rows={4} placeholder="Olá {{primeiro_nome}}, temos uma novidade..."
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[#BAA05E]/60 focus:ring-2 focus:ring-[#BAA05E]/10 transition-all resize-y" />
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[10px] text-muted-foreground mr-1">Variáveis:</span>
                        {["nome","primeiro_nome","email","empresa"].map((v) => (
                          <button key={v} onClick={() => setQText((t) => t + `{{${v}}}`)}
                            className="px-2 py-0.5 rounded-md border border-[#BAA05E]/30 bg-[#BAA05E]/5 text-[10px] font-medium hover:bg-[#BAA05E]/15 transition-all" style={{ color: "#BAA05E" }}>
                            {`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-muted-foreground">URL da imagem (opcional)</label>
                      <input value={qImage} onChange={(e) => setQImage(e.target.value)} placeholder="https://... (cole a URL de uma imagem)"
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[#BAA05E]/60 focus:ring-2 focus:ring-[#BAA05E]/10 transition-all" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Texto do botão</label>
                        <input value={qBtnLabel} onChange={(e) => setQBtnLabel(e.target.value)} placeholder="Clique aqui →"
                          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[#BAA05E]/60 focus:ring-2 focus:ring-[#BAA05E]/10 transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Link do botão</label>
                        <input value={qBtnLink} onChange={(e) => setQBtnLink(e.target.value)} placeholder="https://negociaaky.com.br"
                          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[#BAA05E]/60 focus:ring-2 focus:ring-[#BAA05E]/10 transition-all" />
                      </div>
                    </div>
                  </div>
                  {/* Preview */}
                  {(qTitle.trim() || qText.trim()) && (
                    <div className="rounded-xl border border-border overflow-hidden bg-white">
                      <iframe srcDoc={buildQuickHtml()} title="Prévia" className="w-full border-0" style={{ height: 400, pointerEvents: "none" }} />
                    </div>
                  )}
                  <button onClick={handleSaveQuick} disabled={save.isPending || (!qTitle.trim() && !qText.trim())}
                    className="w-full flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all disabled:opacity-40"
                    style={{ backgroundColor: "#BAA05E" }}>
                    {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Usar este email
                  </button>
                </div>
              )}
            </div>
          ) : showHtml ? (
            <textarea value={html} onChange={(e) => setHtml(e.target.value)}
              className="w-full font-mono text-xs p-4 border-0 outline-none resize-y bg-card"
              style={{ minHeight: 320 }} spellCheck={false}
              placeholder="Cole aqui o HTML do email..." />
          ) : (
            <div className="p-4">
              <div className="rounded-xl border border-border overflow-hidden bg-white">
                <iframe srcDoc={c.html_content} title="Prévia do email"
                  className="w-full border-0" style={{ height: 480, pointerEvents: "none" }} />
              </div>
              <p className="text-center text-[10px] text-muted-foreground mt-2">
                Prévia do email · {c.html_content.length.toLocaleString("pt-BR")} caracteres
              </p>
            </div>
          )}
        </section>

        {/* Destinatários */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <h2 className="font-semibold text-sm">Destinatários ({leads.length})</h2>
          </div>

          {/* Adicionar destinatário */}
          {canSend && (
            <div className="px-5 py-3 border-b border-border bg-card">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddRecipient()}
                    placeholder="Adicionar email manualmente..."
                    className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2.5 text-sm outline-none focus:border-[#BAA05E]/60 focus:ring-2 focus:ring-[#BAA05E]/10 transition-all"
                  />
                </div>
                <button
                  onClick={handleAddRecipient}
                  disabled={adding || !addEmail.trim()}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-40"
                  style={{ backgroundColor: "#BAA05E" }}
                >
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Incluir
                </button>
              </div>
            </div>
          )}

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
                    {canSend && <th className="text-right px-4 py-2 font-medium w-16"></th>}
                  </tr>
                </thead>
                <tbody>
                  {leads.slice(0, 200).map((l) => (
                    <tr key={l.id} className="border-t border-border group hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2 truncate max-w-xs">{l.email}</td>
                      <td className="px-4 py-2"><SendStatus s={l.status} /></td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {l.sent_at ? new Date(l.sent_at).toLocaleString("pt-BR") : "—"}
                      </td>
                      {canSend && (
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleRemoveRecipient(l.id, l.email)}
                            disabled={removing === l.id}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                            title="Remover da campanha"
                          >
                            {removing === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      )}
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
