import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Loader2, Users, RefreshCw, ChevronRight, ChevronLeft,
  FileText, AtSign, Mail, Send, Eye, Clock, CheckCircle2, Hash, Globe, Tag,
  AlertCircle,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useEmailTemplates, useSaveCampaign, getAudienceCount } from "@/hooks/useEmailMarketing";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { EmailAudienceFilters } from "@/types/email.types";

const STEPS = [
  { id: 1, label: "Identidade", sub: "Nome e descrição", icon: FileText },
  { id: 2, label: "Remetente", sub: "De quem chega o email", icon: AtSign },
  { id: 3, label: "Audiência", sub: "Quem vai receber", icon: Users },
  { id: 4, label: "Conteúdo", sub: "Template e assunto", icon: Mail },
  { id: 5, label: "Envio", sub: "Quando enviar", icon: Clock },
  { id: 6, label: "Revisão", sub: "Confira tudo antes", icon: Eye },
];

const STATUS_OPTS = [
  { value: "novo", label: "Novo", color: "bg-sky-500" },
  { value: "em-andamento", label: "Em andamento", color: "bg-amber-500" },
  { value: "convertido", label: "Convertido", color: "bg-emerald-500" },
  { value: "perdido", label: "Perdido", color: "bg-red-500" },
];
const ORIGEM_OPTS = [
  { value: "contato-negocio", label: "Negócio", icon: "💼" },
  { value: "contato-galeria", label: "Galeria", icon: "🏪" },
  { value: "anunciar", label: "Anúncio", icon: "📢" },
  { value: "newsletter", label: "Newsletter", icon: "📧" },
  { value: "exit-intent", label: "Exit Intent", icon: "🚪" },
  { value: "whatsapp", label: "WhatsApp", icon: "💬" },
  { value: "chatbot", label: "Chatbot", icon: "🤖" },
];

export default function CampanhaNova() {
  usePageTitle("Nova campanha | Admin");
  const navigate = useNavigate();
  const { data: templates = [] } = useEmailTemplates();
  const saveMut = useSaveCampaign();

  const [step, setStep] = useState(1);

  // Step 1 — Identidade
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 — Remetente
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [loadingDefaults, setLoadingDefaults] = useState(true);

  // Step 3 — Audiência
  const [statuses, setStatuses] = useState<string[]>([]);
  const [origens, setOrigens] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [audCount, setAudCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [origemCounts, setOrigemCounts] = useState<Record<string, number>>({});

  // Step 4 — Conteúdo
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [templateId, setTemplateId] = useState<string>("");

  // Step 5 — Envio
  const [sendMode, setSendMode] = useState<"now" | "scheduled">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");

  // Load default sender from integration_settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("integration_settings")
        .select("from_name, from_email, reply_to")
        .eq("id", 1)
        .maybeSingle();
      if (data) {
        setFromName(data.from_name || "");
        setFromEmail(data.from_email || "");
        setReplyTo(data.reply_to || "");
      }
      setLoadingDefaults(false);
    })();
  }, []);

  // Load lead counts for audience
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("leads")
        .select("status, origem")
        .not("email", "is", null)
        .neq("email", "");
      if (!data) return;
      const sc: Record<string, number> = {};
      const oc: Record<string, number> = {};
      for (const row of data) {
        const s = row.status || "novo";
        sc[s] = (sc[s] || 0) + 1;
        const o = row.origem || "";
        if (o) oc[o] = (oc[o] || 0) + 1;
      }
      setStatusCounts(sc);
      setOrigemCounts(oc);
    })();
  }, []);

  const buildFilters = (): EmailAudienceFilters => ({
    statuses: statuses.length ? statuses : undefined,
    origens: origens.length ? origens : undefined,
    tags_any: tagsInput.trim() ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
  });

  const refreshCount = async () => {
    setLoadingCount(true);
    try {
      setAudCount(await getAudienceCount(buildFilters()));
    } catch {
      toast.error("Erro contando audiência");
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => { refreshCount(); }, [statuses, origens, tagsInput]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const activeFilterCount = statuses.length + origens.length + (tagsInput.trim() ? 1 : 0);

  // Validation per step
  const stepValid = (s: number): boolean => {
    switch (s) {
      case 1: return !!name.trim();
      case 2: return !!fromName.trim() && !!fromEmail.trim();
      case 3: return true;
      case 4: return !!subject.trim();
      case 5: return sendMode === "now" || !!scheduledDate;
      case 6: return true;
      default: return true;
    }
  };

  const stepError = (s: number): string => {
    switch (s) {
      case 1: return !name.trim() ? "Preencha o nome da campanha" : "";
      case 2: return !fromName.trim() ? "Preencha o nome do remetente" : !fromEmail.trim() ? "Preencha o email" : "";
      case 4: return !subject.trim() ? "Preencha o assunto do email" : "";
      case 5: return sendMode === "scheduled" && !scheduledDate ? "Escolha a data" : "";
      default: return "";
    }
  };

  const goNext = () => {
    if (!stepValid(step)) {
      toast.error(stepError(step) || "Complete esta etapa");
      return;
    }
    setStep((s) => Math.min(s + 1, 6));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) {
      toast.error("Nome e assunto são obrigatórios");
      return;
    }
    try {
      const tpl = templates.find((t) => t.id === templateId);
      const scheduledAt = sendMode === "scheduled" && scheduledDate
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      const created: any = await saveMut.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        subject: subject.trim(),
        preheader: preheader.trim() || null,
        template_id: templateId || null,
        html_content: tpl?.html_content || null,
        audience_filters: buildFilters(),
        from_name: fromName.trim() || null,
        from_email: fromEmail.trim() || null,
        reply_to: replyTo.trim() || null,
        scheduled_at: scheduledAt,
        source_type: "campaign",
        status: "draft",
      });
      toast.success("Campanha criada como rascunho");
      navigate(`/admin/marketing/campanhas/${created.id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar");
    }
  };

  const selectedTemplate = templates.find((t) => t.id === templateId);

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto pb-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <Link to="/admin/marketing/campanhas" className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Campanha Email</span>
              <span className="rounded-md bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold uppercase">Nova</span>
            </div>
            <span className="text-sm text-muted-foreground">|</span>
            <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{name || "Sem título"}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saveMut.isPending || !name.trim() || !subject.trim()}
            className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-all"
          >
            {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar rascunho
          </button>
        </div>

        <div className="flex gap-6">
          {/* Sidebar — Steps */}
          <aside className="w-56 shrink-0 hidden lg:block">
            <div className="sticky top-24 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-3">Etapas</p>
              {STEPS.map((s) => {
                const Icon = s.icon;
                const active = step === s.id;
                const done = step > s.id;
                const valid = stepValid(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (s.id < step || stepValid(step)) setStep(s.id);
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
                      active
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : done && valid
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-muted text-muted-foreground"
                    }`}>
                      {done && valid ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>
                        {String(s.id).padStart(2, "0")} · {s.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="rounded-2xl border border-border bg-card overflow-hidden min-h-[480px] flex flex-col">
              {/* Step header */}
              <div className="px-6 py-5 border-b border-border">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-1">
                  Etapa {step} de 6
                </p>
                <h2 className="text-xl font-bold text-foreground">{STEPS[step - 1].label}</h2>
                <p className="text-sm text-muted-foreground">{STEPS[step - 1].sub}</p>
              </div>

              {/* Step content */}
              <div className="flex-1 px-6 py-6">
                {step === 1 && <Step1 name={name} setName={setName} description={description} setDescription={setDescription} />}
                {step === 2 && <Step2 fromName={fromName} setFromName={setFromName} fromEmail={fromEmail} setFromEmail={setFromEmail} replyTo={replyTo} setReplyTo={setReplyTo} loading={loadingDefaults} />}
                {step === 3 && (
                  <Step3
                    statuses={statuses} setStatuses={setStatuses}
                    origens={origens} setOrigens={setOrigens}
                    tagsInput={tagsInput} setTagsInput={setTagsInput}
                    audCount={audCount} loadingCount={loadingCount}
                    refreshCount={refreshCount} toggle={toggle}
                    activeFilterCount={activeFilterCount}
                    statusCounts={statusCounts} origemCounts={origemCounts}
                  />
                )}
                {step === 4 && (
                  <Step4
                    subject={subject} setSubject={setSubject}
                    preheader={preheader} setPreheader={setPreheader}
                    templateId={templateId} setTemplateId={setTemplateId}
                    templates={templates}
                  />
                )}
                {step === 5 && (
                  <Step5
                    sendMode={sendMode} setSendMode={setSendMode}
                    scheduledDate={scheduledDate} setScheduledDate={setScheduledDate}
                    scheduledTime={scheduledTime} setScheduledTime={setScheduledTime}
                  />
                )}
                {step === 6 && (
                  <Step6
                    name={name} description={description}
                    fromName={fromName} fromEmail={fromEmail} replyTo={replyTo}
                    subject={subject} preheader={preheader}
                    templateName={selectedTemplate?.name}
                    audCount={audCount} activeFilterCount={activeFilterCount}
                    sendMode={sendMode} scheduledDate={scheduledDate} scheduledTime={scheduledTime}
                    onSave={handleSave} saving={saveMut.isPending}
                  />
                )}
              </div>

              {/* Footer nav */}
              <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between">
                <button
                  onClick={goBack}
                  disabled={step === 1}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Voltar
                </button>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Etapa {step} de 6</span>
                  {!stepValid(step) && (
                    <span className="text-amber-500 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> complete pra avançar
                    </span>
                  )}
                </div>
                {step < 6 ? (
                  <button
                    onClick={goNext}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    Próximo <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    disabled={saveMut.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Criar campanha
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ────────────────────────────────────────────────────────────────
   STEP COMPONENTS
   ──────────────────────────────────────────────────────────────── */

function Step1({ name, setName, description, setDescription }: {
  name: string; setName: (v: string) => void;
  description: string; setDescription: (v: string) => void;
}) {
  return (
    <div className="max-w-lg space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Nome da campanha</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Newsletter Março, Reativação Q1, Black Friday..."
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Objetivo, contexto, lembretes pra equipe..."
          rows={4}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-y transition-all"
        />
      </div>
    </div>
  );
}

function Step2({ fromName, setFromName, fromEmail, setFromEmail, replyTo, setReplyTo, loading }: {
  fromName: string; setFromName: (v: string) => void;
  fromEmail: string; setFromEmail: (v: string) => void;
  replyTo: string; setReplyTo: (v: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className="max-w-lg space-y-5">
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-xs text-blue-700 flex items-start gap-2">
        <AtSign className="h-4 w-4 shrink-0 mt-0.5" />
        <p>Dados carregados das configurações de integração. Você pode personalizá-los para esta campanha.</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Nome do remetente</label>
        <input
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder="NegociaAky"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Email do remetente</label>
        <input
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder="contato@negociaaky.com.br"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Responder para <span className="text-muted-foreground font-normal">(opcional)</span></label>
        <input
          value={replyTo}
          onChange={(e) => setReplyTo(e.target.value)}
          placeholder="contato@negociaaky.com.br"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>
      <div className="rounded-xl bg-muted/50 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          O destinatário verá: <strong className="text-foreground">{fromName || "..."}</strong> &lt;{fromEmail || "..."}&gt;
        </p>
      </div>
    </div>
  );
}

function Step3({ statuses, setStatuses, origens, setOrigens, tagsInput, setTagsInput, audCount, loadingCount, refreshCount, toggle, activeFilterCount, statusCounts, origemCounts }: {
  statuses: string[]; setStatuses: (v: string[]) => void;
  origens: string[]; setOrigens: (v: string[]) => void;
  tagsInput: string; setTagsInput: (v: string) => void;
  audCount: number | null; loadingCount: boolean;
  refreshCount: () => void; toggle: (arr: string[], v: string) => string[];
  activeFilterCount: number;
  statusCounts: Record<string, number>; origemCounts: Record<string, number>;
}) {
  return (
    <div className="space-y-5">
      {/* Count header */}
      <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {loadingCount ? <Loader2 className="h-4 w-4 animate-spin inline" /> : <>{audCount ?? 0} leads</>}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {activeFilterCount > 0
                ? `${activeFilterCount} filtro${activeFilterCount > 1 ? "s" : ""} ativo${activeFilterCount > 1 ? "s" : ""}`
                : "Sem filtros — todos os leads com email"}
            </p>
          </div>
        </div>
        <button onClick={refreshCount} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className={`h-3 w-3 ${loadingCount ? "animate-spin" : ""}`} /> Recalcular
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Exclui automaticamente: leads sem email, opt-out e descadastrados.
      </p>

      {/* Status */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Hash className="h-3.5 w-3.5 text-muted-foreground" />
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status do lead</label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATUS_OPTS.map((o) => {
            const active = statuses.includes(o.value);
            const cnt = statusCounts[o.value] || 0;
            return (
              <button key={o.value} type="button" onClick={() => setStatuses(toggle(statuses, o.value))}
                className={`flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-2.5 text-xs font-medium transition-all ${
                  active ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                }`}>
                <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-primary" : o.color} shrink-0`} />
                <span className="flex-1 text-left">{o.label}</span>
                <span className={`min-w-[20px] text-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>{cnt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Origem */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origem do lead</label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ORIGEM_OPTS.map((o) => {
            const active = origens.includes(o.value);
            const cnt = origemCounts[o.value] || 0;
            return (
              <button key={o.value} type="button" onClick={() => setOrigens(toggle(origens, o.value))}
                className={`flex items-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-xs font-medium transition-all ${
                  active ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                }`}>
                <span className="text-sm">{o.icon}</span>
                <span className="flex-1 text-left">{o.label}</span>
                <span className={`min-w-[20px] text-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>{cnt}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</label>
        </div>
        <input
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="vip, newsletter, quente"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
        <p className="text-[11px] text-muted-foreground">Separadas por vírgula. Vazio = ignora tags.</p>
      </div>
    </div>
  );
}

function Step4({ subject, setSubject, preheader, setPreheader, templateId, setTemplateId, templates }: {
  subject: string; setSubject: (v: string) => void;
  preheader: string; setPreheader: (v: string) => void;
  templateId: string; setTemplateId: (v: string) => void;
  templates: any[];
}) {
  return (
    <div className="max-w-lg space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Assunto do email</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Oferta exclusiva pra você, {{primeiro_nome}}"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
        <p className="text-[11px] text-muted-foreground">Variáveis: {`{{nome}}`}, {`{{primeiro_nome}}`}, {`{{empresa}}`}</p>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Preheader <span className="text-muted-foreground font-normal">(opcional)</span></label>
        <input
          value={preheader}
          onChange={(e) => setPreheader(e.target.value)}
          placeholder="Texto curto exibido no inbox antes de abrir"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Template</label>
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        >
          <option value="">— sem template (definir HTML depois) —</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground">
          Você pode editar o HTML na página da campanha após criá-la.{" "}
          <Link to="/admin/marketing/templates/novo" className="text-primary hover:underline" target="_blank">
            Criar novo template →
          </Link>
        </p>
      </div>
    </div>
  );
}

function Step5({ sendMode, setSendMode, scheduledDate, setScheduledDate, scheduledTime, setScheduledTime }: {
  sendMode: "now" | "scheduled"; setSendMode: (v: "now" | "scheduled") => void;
  scheduledDate: string; setScheduledDate: (v: string) => void;
  scheduledTime: string; setScheduledTime: (v: string) => void;
}) {
  return (
    <div className="max-w-lg space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setSendMode("now")}
          className={`relative flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
            sendMode === "now" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-muted-foreground/30"
          }`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            sendMode === "now" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            <Send className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className={`text-sm font-semibold ${sendMode === "now" ? "text-primary" : "text-foreground"}`}>Enviar agora</p>
            <p className="text-[11px] text-muted-foreground">Manualmente na revisão</p>
          </div>
          {sendMode === "now" && <CheckCircle2 className="absolute top-2.5 right-2.5 h-4 w-4 text-primary" />}
        </button>

        <button type="button" onClick={() => setSendMode("scheduled")}
          className={`relative flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
            sendMode === "scheduled" ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-muted-foreground/30"
          }`}>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            sendMode === "scheduled" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>
            <Clock className="h-5 w-5" />
          </div>
          <div className="text-left">
            <p className={`text-sm font-semibold ${sendMode === "scheduled" ? "text-primary" : "text-foreground"}`}>Agendar</p>
            <p className="text-[11px] text-muted-foreground">Escolher data e hora</p>
          </div>
          {sendMode === "scheduled" && <CheckCircle2 className="absolute top-2.5 right-2.5 h-4 w-4 text-primary" />}
        </button>
      </div>

      {sendMode === "scheduled" && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Data</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Hora</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">Horário de Brasília (BRT). O envio será disparado automaticamente.</p>
        </div>
      )}

      {sendMode === "now" && (
        <div className="rounded-xl bg-muted/50 border border-dashed border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            A campanha será criada como <strong className="text-foreground">rascunho</strong>. Você dispara o envio manualmente na página da campanha.
          </p>
        </div>
      )}
    </div>
  );
}

function Step6({ name, description, fromName, fromEmail, replyTo, subject, preheader, templateName, audCount, activeFilterCount, sendMode, scheduledDate, scheduledTime, onSave, saving }: {
  name: string; description: string;
  fromName: string; fromEmail: string; replyTo: string;
  subject: string; preheader: string;
  templateName?: string;
  audCount: number | null; activeFilterCount: number;
  sendMode: "now" | "scheduled"; scheduledDate: string; scheduledTime: string;
  onSave: () => void; saving: boolean;
}) {
  const rows = [
    { label: "Nome", value: name },
    { label: "Descrição", value: description || "—" },
    { label: "Remetente", value: `${fromName} <${fromEmail}>` },
    { label: "Responder para", value: replyTo || fromEmail },
    { label: "Assunto", value: subject },
    { label: "Preheader", value: preheader || "—" },
    { label: "Template", value: templateName || "HTML personalizado" },
    { label: "Audiência", value: `${audCount ?? 0} leads${activeFilterCount > 0 ? ` (${activeFilterCount} filtros)` : ""}` },
    { label: "Envio", value: sendMode === "scheduled" ? `Agendado: ${scheduledDate} às ${scheduledTime}` : "Manual (rascunho)" },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border overflow-hidden">
        {rows.map((r, i) => (
          <div key={r.label} className={`flex items-start gap-4 px-5 py-3 ${i > 0 ? "border-t border-border" : ""}`}>
            <span className="text-xs font-semibold text-muted-foreground w-28 shrink-0 pt-0.5">{r.label}</span>
            <span className="text-sm text-foreground">{r.value}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Tudo pronto!</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            {sendMode === "scheduled"
              ? `A campanha será agendada para ${scheduledDate} às ${scheduledTime}. Você pode editar o HTML antes do envio.`
              : "A campanha será salva como rascunho. Você pode editar o conteúdo e disparar quando quiser."}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={onSave} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-md">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Criar campanha
        </button>
      </div>
    </div>
  );
}
