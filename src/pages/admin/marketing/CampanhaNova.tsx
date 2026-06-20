import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Loader2, Users, RefreshCw, ChevronRight, ChevronLeft,
  FileText, AtSign, Mail, Send, Eye, Clock, CheckCircle2,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useEmailTemplates, useSaveCampaign, getAudienceCount } from "@/hooks/useEmailMarketing";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { EmailAudienceFilters } from "@/types/email.types";

/* ── Constantes ─────────────────────────────────────────── */

const STEPS = [
  { id: 1, label: "Identidade", sub: "Nome e descrição", icon: FileText },
  { id: 2, label: "Remetente", sub: "De quem chega o email", icon: AtSign },
  { id: 3, label: "Audiência", sub: "Quem vai receber", icon: Users },
  { id: 4, label: "Conteúdo", sub: "Template e assunto", icon: Mail },
  { id: 5, label: "Envio", sub: "Quando enviar", icon: Clock },
  { id: 6, label: "Revisão", sub: "Confira tudo antes", icon: Eye },
];

const STATUS_OPTS = [
  { value: "novo", label: "Novo", dot: "#38bdf8" },
  { value: "em-andamento", label: "Em andamento", dot: "#fbbf24" },
  { value: "convertido", label: "Convertido", dot: "#34d399" },
  { value: "perdido", label: "Perdido", dot: "#f87171" },
];
const ORIGEM_OPTS = [
  { value: "contato-negocio", label: "Negócio" },
  { value: "contato-galeria", label: "Galeria" },
  { value: "anunciar", label: "Anúncio" },
  { value: "newsletter", label: "Newsletter" },
  { value: "exit-intent", label: "Exit Intent" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "chatbot", label: "Chatbot" },
];

const WARM = "#BAA05E";

/* ── Componente principal ───────────────────────────────── */

export default function CampanhaNova() {
  usePageTitle("Nova campanha | Admin");
  const navigate = useNavigate();
  const { data: templates = [] } = useEmailTemplates();
  const saveMut = useSaveCampaign();

  const [step, setStep] = useState(1);

  // 1 — Identidade
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // 2 — Remetente
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [loadingDefaults, setLoadingDefaults] = useState(true);

  // 3 — Audiência
  const [statuses, setStatuses] = useState<string[]>([]);
  const [origens, setOrigens] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [audCount, setAudCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [origemCounts, setOrigemCounts] = useState<Record<string, number>>({});

  // 4 — Conteúdo
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [templateId, setTemplateId] = useState<string>("");

  // 5 — Envio
  const [sendMode, setSendMode] = useState<"now" | "scheduled">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");

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
        sc[row.status || "novo"] = (sc[row.status || "novo"] || 0) + 1;
        if (row.origem) oc[row.origem] = (oc[row.origem] || 0) + 1;
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
    try { setAudCount(await getAudienceCount(buildFilters())); }
    catch { toast.error("Erro contando audiência"); }
    finally { setLoadingCount(false); }
  };

  useEffect(() => { refreshCount(); }, [statuses, origens, tagsInput]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const activeFilterCount = statuses.length + origens.length + (tagsInput.trim() ? 1 : 0);

  const stepOk = (s: number) => {
    if (s === 1) return !!name.trim();
    if (s === 2) return !!fromName.trim() && !!fromEmail.trim();
    if (s === 4) return !!subject.trim();
    if (s === 5) return sendMode === "now" || !!scheduledDate;
    return true;
  };

  const goNext = () => {
    if (!stepOk(step)) { toast.error("Complete esta etapa pra avançar"); return; }
    setStep((s) => Math.min(s + 1, 6));
  };

  const handleSave = async () => {
    if (!name.trim() || !subject.trim()) { toast.error("Nome e assunto são obrigatórios"); return; }
    try {
      const tpl = templates.find((t) => t.id === templateId);
      const created: any = await saveMut.mutateAsync({
        name: name.trim(), description: description.trim() || null,
        subject: subject.trim(), preheader: preheader.trim() || null,
        template_id: templateId || null, html_content: tpl?.html_content || null,
        audience_filters: buildFilters(),
        from_name: fromName.trim() || null, from_email: fromEmail.trim() || null,
        reply_to: replyTo.trim() || null,
        scheduled_at: sendMode === "scheduled" && scheduledDate ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString() : null,
        source_type: "campaign", status: "draft",
      });
      toast.success("Campanha criada como rascunho");
      navigate(`/admin/marketing/campanhas/${created.id}`);
    } catch (e: any) { toast.error(e.message || "Erro ao criar"); }
  };

  return (
    <AdminLayout>
      <div className="max-w-[1080px] mx-auto pb-10">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/admin/marketing/campanhas" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Campanha Email</span>
          <span className="rounded px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: `${WARM}22`, color: WARM }}>Nova</span>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-sm text-foreground truncate max-w-[250px]">{name || "Sem título"}</span>
          <div className="ml-auto">
            <button onClick={handleSave} disabled={saveMut.isPending || !name.trim() || !subject.trim()}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
              {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar rascunho
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* ── Sidebar ── */}
          <aside className="w-52 shrink-0 hidden lg:block">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: WARM }}>Etapas</p>
            <div className="space-y-0.5">
              {STEPS.map((s) => {
                const Icon = s.icon;
                const active = step === s.id;
                const done = step > s.id && stepOk(s.id);
                return (
                  <button key={s.id} type="button"
                    onClick={() => { if (s.id <= step || stepOk(step)) setStep(s.id); }}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                      active ? "bg-[#BAA05E]/10" : "hover:bg-muted/40"
                    }`}>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full shrink-0 ${
                      active ? "text-white" : done ? "bg-emerald-50 text-emerald-500" : "bg-muted text-muted-foreground/60"
                    }`} style={active ? { backgroundColor: WARM } : undefined}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                      <p className={`text-[13px] font-semibold leading-tight ${active ? "text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}>
                        {String(s.id).padStart(2, "0")} · {s.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{s.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── Main ── */}
          <main className="flex-1 min-w-0">
            <div className="bg-card rounded-2xl border border-border/60 shadow-sm overflow-hidden flex flex-col min-h-[520px]">
              {/* Step header */}
              <div className="px-8 pt-8 pb-6">
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: WARM }}>
                  Etapa {step} de 6
                </p>
                <h2 className="text-2xl font-bold text-foreground leading-tight">{STEPS[step - 1].label}</h2>
                <p className="text-sm text-muted-foreground mt-1">{STEPS[step - 1].sub}</p>
              </div>

              {/* Content */}
              <div className="flex-1 px-8 pb-8">
                {step === 1 && (
                  <div className="max-w-xl space-y-6">
                    <Field label="Nome da campanha" value={name} onChange={setName} placeholder="Ex: Newsletter Março, Reativação Q1, Black Friday..." />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></label>
                      <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                        placeholder="Objetivo, contexto, lembretes pra equipe..."
                        rows={4} className={inputCls + " resize-y"} />
                    </div>
                  </div>
                )}

                {step === 2 && (
                  loadingDefaults ? <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
                    <div className="max-w-xl space-y-6">
                      <p className="text-xs text-muted-foreground border-l-2 pl-3" style={{ borderColor: WARM }}>
                        Carregado das configurações. Personalize se quiser para esta campanha.
                      </p>
                      <Field label="Nome do remetente" value={fromName} onChange={setFromName} placeholder="NegociaAky" />
                      <Field label="Email do remetente" value={fromEmail} onChange={setFromEmail} placeholder="contato@negociaaky.com.br" />
                      <Field label="Responder para (opcional)" value={replyTo} onChange={setReplyTo} placeholder="contato@negociaaky.com.br" />
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        O destinatário verá: <strong className="text-foreground">{fromName || "..."}</strong> &lt;{fromEmail || "..."}&gt;
                      </p>
                    </div>
                  )
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    {/* Audience counter card */}
                    <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-[#BAA05E]/5 to-transparent p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm" style={{ background: `linear-gradient(135deg, ${WARM}, #9A8340)` }}>
                            <Users className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="text-3xl font-extrabold text-foreground tabular-nums leading-none">
                              {loadingCount ? <Loader2 className="h-6 w-6 animate-spin inline text-muted-foreground" /> : audCount ?? 0}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {(audCount ?? 0) === 1 ? "lead vai receber" : "leads vão receber"}
                            </p>
                          </div>
                        </div>
                        <button onClick={refreshCount}
                          className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-[#BAA05E]/40 hover:bg-[#BAA05E]/5 transition-all">
                          <RefreshCw className={`h-3.5 w-3.5 ${loadingCount ? "animate-spin" : ""}`} /> Atualizar
                        </button>
                      </div>
                      {activeFilterCount > 0 && (
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
                          <span className="text-[11px] text-muted-foreground">Filtros ativos:</span>
                          {statuses.map((s) => (
                            <span key={s} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: WARM }}>
                              {STATUS_OPTS.find((o) => o.value === s)?.label || s}
                              <button onClick={() => setStatuses(statuses.filter((x) => x !== s))} className="ml-0.5 opacity-70 hover:opacity-100">&times;</button>
                            </span>
                          ))}
                          {origens.map((o) => (
                            <span key={o} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: WARM }}>
                              {ORIGEM_OPTS.find((opt) => opt.value === o)?.label || o}
                              <button onClick={() => setOrigens(origens.filter((x) => x !== o))} className="ml-0.5 opacity-70 hover:opacity-100">&times;</button>
                            </span>
                          ))}
                          {tagsInput.trim() && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: WARM }}>
                              Tags: {tagsInput.split(",").length}
                              <button onClick={() => setTagsInput("")} className="ml-0.5 opacity-70 hover:opacity-100">&times;</button>
                            </span>
                          )}
                          <button onClick={() => { setStatuses([]); setOrigens([]); setTagsInput(""); }}
                            className="ml-auto text-[11px] text-muted-foreground hover:text-red-500 transition-colors">
                            Limpar tudo
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Filter sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Status card */}
                      <div className="rounded-2xl border border-border/60 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status do lead</p>
                          {statuses.length > 0 && (
                            <button onClick={() => setStatuses([])} className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors">Limpar</button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {STATUS_OPTS.map((o) => {
                            const on = statuses.includes(o.value);
                            const cnt = statusCounts[o.value] || 0;
                            return (
                              <button key={o.value} type="button" onClick={() => setStatuses(toggle(statuses, o.value))}
                                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium border transition-all ${
                                  on ? "border-[#BAA05E] bg-[#BAA05E]/10 text-foreground shadow-sm" : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                                }`}>
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: o.dot }} />
                                {o.label}
                                {cnt > 0 && (
                                  <span className={`rounded-md px-1.5 py-px text-[10px] font-bold ${
                                    on ? "text-white" : "bg-muted text-muted-foreground"
                                  }`} style={on ? { backgroundColor: WARM } : undefined}>{cnt}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Origem card */}
                      <div className="rounded-2xl border border-border/60 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Origem do lead</p>
                          {origens.length > 0 && (
                            <button onClick={() => setOrigens([])} className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors">Limpar</button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ORIGEM_OPTS.map((o) => {
                            const on = origens.includes(o.value);
                            const cnt = origemCounts[o.value] || 0;
                            return (
                              <button key={o.value} type="button" onClick={() => setOrigens(toggle(origens, o.value))}
                                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-medium border transition-all ${
                                  on ? "border-[#BAA05E] bg-[#BAA05E]/10 text-foreground shadow-sm" : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
                                }`}>
                                {o.label}
                                {cnt > 0 && (
                                  <span className={`rounded-md px-1.5 py-px text-[10px] font-bold ${
                                    on ? "text-white" : "bg-muted text-muted-foreground"
                                  }`} style={on ? { backgroundColor: WARM } : undefined}>{cnt}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Tags card */}
                    <div className="rounded-2xl border border-border/60 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tags</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Filtre por tags dos leads. Separe por vírgula.</p>
                        </div>
                        {tagsInput.trim() && (
                          <button onClick={() => setTagsInput("")} className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors">Limpar</button>
                        )}
                      </div>
                      <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                        placeholder="Ex: vip, newsletter, quente" className={inputCls} />
                      {tagsInput.trim() && (
                        <div className="flex flex-wrap gap-1.5">
                          {tagsInput.split(",").map((t) => t.trim()).filter(Boolean).map((tag, i) => (
                            <span key={i} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium border border-[#BAA05E]/30 bg-[#BAA05E]/5" style={{ color: WARM }}>
                              #{tag}
                              <button onClick={() => setTagsInput(tagsInput.split(",").map((t) => t.trim()).filter((t) => t !== tag).join(", "))}
                                className="opacity-50 hover:opacity-100">&times;</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* No filter hint */}
                    {activeFilterCount === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-2 border border-dashed border-border/60 rounded-xl">
                        Nenhum filtro selecionado — a campanha será enviada para <strong className="text-foreground">todos os leads com email</strong>
                      </p>
                    )}
                  </div>
                )}

                {step === 4 && (
                  <div className="max-w-xl space-y-6">
                    <SubjectFieldWithVars value={subject} onChange={setSubject} />
                    <Field label="Preheader (opcional)" value={preheader} onChange={setPreheader}
                      placeholder="Texto curto exibido no inbox antes de abrir" />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Template</label>
                      <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={inputCls}>
                        <option value="">— sem template (definir HTML depois) —</option>
                        {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <p className="text-[11px] text-muted-foreground">
                        Edite o HTML na página da campanha.{" "}
                        <Link to="/admin/marketing/templates/novo" className="hover:underline" style={{ color: WARM }} target="_blank">Criar template →</Link>
                      </p>
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="max-w-xl space-y-6">
                    <div className="flex gap-3">
                      {([
                        { key: "now" as const, label: "Enviar manualmente", sub: "Dispare quando quiser", Icon: Send },
                        { key: "scheduled" as const, label: "Agendar", sub: "Defina data e hora", Icon: Clock },
                      ]).map(({ key, label, sub, Icon }) => (
                        <button key={key} type="button" onClick={() => setSendMode(key)}
                          className={`flex-1 flex items-center gap-3 rounded-xl border p-4 transition-all ${
                            sendMode === key ? "border-[#BAA05E] bg-[#BAA05E]/5" : "border-border hover:border-foreground/20"
                          }`}>
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full shrink-0 ${
                            sendMode === key ? "text-white" : "bg-muted text-muted-foreground"
                          }`} style={sendMode === key ? { backgroundColor: WARM } : undefined}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-semibold ${sendMode === key ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
                            <p className="text-[11px] text-muted-foreground">{sub}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    {sendMode === "scheduled" && (
                      <div className="flex gap-3">
                        <div className="flex-1 space-y-2">
                          <label className="text-sm font-medium text-foreground">Data</label>
                          <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                            min={new Date().toISOString().split("T")[0]} className={inputCls} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <label className="text-sm font-medium text-foreground">Hora</label>
                          <input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} className={inputCls} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 6 && (
                  <div className="space-y-6">
                    <div className="divide-y divide-border/60 rounded-xl border border-border/60 overflow-hidden">
                      {[
                        ["Nome", name],
                        ["Descrição", description || "—"],
                        ["Remetente", `${fromName} <${fromEmail}>`],
                        ["Responder para", replyTo || fromEmail],
                        ["Assunto", subject],
                        ["Preheader", preheader || "—"],
                        ["Template", templates.find((t) => t.id === templateId)?.name || "HTML personalizado"],
                        ["Audiência", `${audCount ?? 0} leads${activeFilterCount ? ` · ${activeFilterCount} filtros` : ""}`],
                        ["Envio", sendMode === "scheduled" ? `${scheduledDate} às ${scheduledTime}` : "Manual"],
                      ].map(([k, v]) => (
                        <div key={k} className="flex px-5 py-3">
                          <span className="text-xs font-medium text-muted-foreground w-28 shrink-0 pt-0.5">{k}</span>
                          <span className="text-sm text-foreground">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: `${WARM}10`, border: `1px solid ${WARM}30` }}>
                      <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: WARM }} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Tudo pronto</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sendMode === "scheduled" ? `Agendada para ${scheduledDate} às ${scheduledTime}.` : "Será salva como rascunho. Dispare quando quiser."}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button onClick={handleSave} disabled={saveMut.isPending}
                        className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white disabled:opacity-50 transition-colors shadow-md hover:shadow-lg"
                        style={{ backgroundColor: WARM }}>
                        {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Criar campanha
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Footer nav ── */}
              <div className="px-8 py-4 border-t border-border/60 flex items-center justify-between">
                <button onClick={() => setStep((s) => Math.max(s - 1, 1))} disabled={step === 1}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
                  <ChevronLeft className="h-4 w-4" /> Voltar
                </button>
                <span className="text-xs text-muted-foreground">
                  Etapa {step} de 6
                  {!stepOk(step) && <span className="ml-2" style={{ color: WARM }}>· complete pra avançar</span>}
                </span>
                {step < 6 ? (
                  <button onClick={goNext}
                    className="flex items-center gap-1 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: WARM }}>
                    Próximo <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button onClick={handleSave} disabled={saveMut.isPending}
                    className="flex items-center gap-1 rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors hover:opacity-90"
                    style={{ backgroundColor: WARM }}>
                    {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Criar
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

/* ── Helpers ──────────────────────────────────────────── */

const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-[#BAA05E]/60 focus:ring-2 focus:ring-[#BAA05E]/10 transition-all";

const SUBJECT_VARS = [
  { key: "nome", label: "Nome" },
  { key: "primeiro_nome", label: "Primeiro nome" },
  { key: "email", label: "Email" },
  { key: "empresa", label: "Empresa" },
];

function SubjectFieldWithVars({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const insertVar = (key: string) => {
    const tag = `{{${key}}}`;
    const el = inputRef.current;
    if (el) {
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      const next = value.slice(0, start) + tag + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + tag.length, start + tag.length); });
    } else {
      onChange(value + tag);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Assunto do email</label>
      <input ref={inputRef} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: Olá {{primeiro_nome}}, temos uma oportunidade!" className={inputCls} />
      <div className="flex flex-wrap items-center gap-1.5 -mt-0.5">
        <span className="text-[11px] text-muted-foreground mr-1">Inserir variável:</span>
        {SUBJECT_VARS.map((v) => (
          <button key={v.key} type="button" onClick={() => insertVar(v.key)}
            className="px-2.5 py-1 rounded-lg border border-[#BAA05E]/30 bg-[#BAA05E]/5 text-[11px] font-medium text-[#BAA05E] hover:bg-[#BAA05E]/15 hover:border-[#BAA05E]/50 transition-all">
            {`{{${v.key}}}`}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  );
}
