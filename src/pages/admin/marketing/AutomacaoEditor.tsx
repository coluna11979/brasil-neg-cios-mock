import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, Zap, Mail, MessageSquare,
  Clock, GitBranch, Tag, FileText, CheckCircle2, Power, ChevronDown, X,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useEmailAutomation, useSaveAutomation, useEmailTemplates } from "@/hooks/useEmailMarketing";
import { toast } from "sonner";
import type { FlowNode, FlowNodeType } from "@/types/email.types";

const WARM = "#BAA05E";
const uid = () => crypto.randomUUID();

const TRIGGER_OPTS = [
  { value: "lead_created", label: "Novo lead cadastrado", icon: "⚡" },
  { value: "lead_status_changed", label: "Status do lead mudou", icon: "🔄" },
  { value: "tag_added", label: "Tag adicionada ao lead", icon: "🏷️" },
  { value: "form_submitted", label: "Formulário preenchido", icon: "📋" },
  { value: "manual", label: "Disparo manual", icon: "👆" },
];

type StepDef = { type: FlowNodeType; label: string; icon: any; color: string; bg: string };

const STEP_PALETTE: StepDef[] = [
  { type: "send_email", label: "Enviar Email", icon: Mail, color: "#3b82f6", bg: "#eff6ff" },
  { type: "send_whatsapp", label: "Enviar WhatsApp", icon: MessageSquare, color: "#22c55e", bg: "#f0fdf4" },
  { type: "wait", label: "Esperar", icon: Clock, color: "#f59e0b", bg: "#fffbeb" },
  { type: "condition", label: "Condição", icon: GitBranch, color: "#8b5cf6", bg: "#f5f3ff" },
  { type: "update_field", label: "Atualizar Campo", icon: FileText, color: "#06b6d4", bg: "#ecfeff" },
  { type: "add_tag", label: "Adicionar Tag", icon: Tag, color: "#ec4899", bg: "#fdf2f8" },
  { type: "end", label: "Fim do Fluxo", icon: CheckCircle2, color: "#6b7280", bg: "#f9fafb" },
];

function getStepDef(type: FlowNodeType): StepDef {
  return STEP_PALETTE.find((s) => s.type === type) || STEP_PALETTE[STEP_PALETTE.length - 1];
}

function defaultNode(type: FlowNodeType): FlowNode {
  const base = { id: uid(), type, label: getStepDef(type).label };
  switch (type) {
    case "send_email": return { ...base, config: { template_id: "", subject: "" } };
    case "send_whatsapp": return { ...base, config: { message: "" } };
    case "wait": return { ...base, config: { amount: 1, unit: "days" } };
    case "condition": return { ...base, config: { field: "status", operator: "eq", value: "" } };
    case "update_field": return { ...base, config: { field: "", value: "" } };
    case "add_tag": return { ...base, config: { tag: "" } };
    case "end": return { ...base };
    default: return { ...base };
  }
}

function nodePreview(node: FlowNode): string {
  switch (node.type) {
    case "send_email": return node.config?.subject || "Selecionar template...";
    case "send_whatsapp": return node.config?.message?.slice(0, 40) || "Definir mensagem...";
    case "wait": return `${node.config?.amount || 1} ${node.config?.unit === "hours" ? "hora(s)" : "dia(s)"}`;
    case "condition": return `${node.config?.field || "?"} ${node.config?.operator || "="} ${node.config?.value || "?"}`;
    case "update_field": return `${node.config?.field || "campo"} → ${node.config?.value || "valor"}`;
    case "add_tag": return node.config?.tag || "Definir tag...";
    case "end": return "Encerra o fluxo";
    default: return "";
  }
}

export default function AutomacaoEditor() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "nova";
  const navigate = useNavigate();
  usePageTitle(isNew ? "Nova automação | Admin" : "Editar automação | Admin");

  const { data: auto, isLoading } = useEmailAutomation(isNew ? undefined : id);
  const { data: templates = [] } = useEmailTemplates();
  const saveMut = useSaveAutomation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("lead_created");
  const [triggerFilter, setTriggerFilter] = useState<Record<string, any>>({});
  const [nodes, setNodes] = useState<FlowNode[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [addAt, setAddAt] = useState<number | null>(null);

  useEffect(() => {
    if (auto) {
      setName(auto.name);
      setDescription(auto.description || "");
      setTriggerEvent(auto.trigger_event);
      setTriggerFilter(auto.trigger_filter || {});
      setNodes(auto.flow_json || []);
      setIsActive(auto.is_active);
    }
  }, [auto]);

  const addNodeAt = useCallback((index: number, type: FlowNodeType) => {
    const newNode = defaultNode(type);
    setNodes((prev) => { const next = [...prev]; next.splice(index, 0, newNode); return next; });
    setAddAt(null);
    setEditingNode(newNode.id);
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<FlowNode>) => {
    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, ...updates } : n));
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    if (editingNode === nodeId) setEditingNode(null);
  }, [editingNode]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Nome obrigatório"); return; }
    try {
      const saved: any = await saveMut.mutateAsync({
        id: isNew ? undefined : id,
        name: name.trim(),
        description: description.trim() || null,
        trigger_event: triggerEvent,
        trigger_filter: Object.keys(triggerFilter).length > 0 ? triggerFilter : null,
        flow_json: nodes as any,
        is_active: isActive,
      });
      toast.success(isNew ? "Automação criada" : "Automação salva");
      if (isNew && saved?.id) navigate(`/admin/marketing/automacoes/${saved.id}`, { replace: true });
    } catch (e: any) { toast.error(e.message || "Erro ao salvar"); }
  };

  if (!isNew && isLoading) {
    return <AdminLayout><div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" style={{ color: WARM }} /></div></AdminLayout>;
  }

  const triggerInfo = TRIGGER_OPTS.find((t) => t.value === triggerEvent);

  return (
    <AdminLayout>
      <div className="max-w-[1100px] mx-auto pb-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-8">
          <div className="flex items-center gap-3">
            <Link to="/admin/marketing/automacoes" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold">{isNew ? "Nova automação" : name || "Automação"}</h1>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                  {isActive ? "ATIVA" : "INATIVA"}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">Defina o trigger e monte os passos do fluxo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsActive(!isActive)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                isActive ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-border text-muted-foreground hover:bg-muted"
              }`}>
              <Power className="h-3.5 w-3.5" /> {isActive ? "Ativa" : "Inativa"}
            </button>
            <button onClick={handleSave} disabled={saveMut.isPending}
              className="flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors hover:opacity-90"
              style={{ backgroundColor: WARM }}>
              {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="space-y-4">
            <SideCard title="Configuração">
              <Field label="Nome da automação" value={name} onChange={setName} placeholder="Boas-vindas novo lead" />
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Objetivo desta automação..." rows={2} className={inputCls + " resize-y"} />
              </div>
            </SideCard>

            <SideCard title="Trigger">
              <div className="space-y-2">
                {TRIGGER_OPTS.map((t) => (
                  <button key={t.value} type="button" onClick={() => setTriggerEvent(t.value)}
                    className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs transition-all ${
                      triggerEvent === t.value ? "bg-[#BAA05E]/8 border border-[#BAA05E]/40 text-foreground font-medium" : "border border-transparent text-muted-foreground hover:bg-muted"
                    }`}>
                    <span className="text-sm">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
              {triggerEvent === "lead_status_changed" && (
                <Field label="Novo status" value={triggerFilter.new_status || ""} onChange={(v) => setTriggerFilter({ ...triggerFilter, new_status: v })} placeholder="convertido" />
              )}
              {triggerEvent === "tag_added" && (
                <Field label="Tag" value={triggerFilter.tag || ""} onChange={(v) => setTriggerFilter({ ...triggerFilter, tag: v })} placeholder="vip" />
              )}
            </SideCard>

            <SideCard title="Passos disponíveis">
              <div className="space-y-1.5">
                {STEP_PALETTE.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.type} className="flex items-center gap-2.5 rounded-xl p-2.5 text-xs text-muted-foreground" style={{ backgroundColor: s.bg }}>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg text-white shrink-0" style={{ backgroundColor: s.color }}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium" style={{ color: s.color }}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </SideCard>
          </aside>

          {/* Flow area */}
          <main className="min-w-0">
            <div className="rounded-2xl border border-border/60 bg-card min-h-[600px]" style={{ background: "linear-gradient(180deg, var(--card) 0%, #fafaf8 100%)" }}>
              <div className="px-6 py-4 border-b border-border/60">
                <h2 className="text-sm font-semibold text-foreground">Fluxo</h2>
                <p className="text-[10px] text-muted-foreground">{nodes.length} passo{nodes.length !== 1 ? "s" : ""} configurado{nodes.length !== 1 ? "s" : ""}</p>
              </div>

              <div className="p-8 flex flex-col items-center">
                {/* ── Trigger ── */}
                <div className="relative">
                  <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-4 min-w-[280px]" style={{ borderColor: WARM, background: `${WARM}06` }}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm" style={{ backgroundColor: WARM }}>
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: WARM }}>Trigger</p>
                      <p className="text-sm font-semibold text-foreground">{triggerInfo?.label}</p>
                    </div>
                  </div>
                </div>

                <Connector />
                <AddBtn index={0} active={addAt === 0} onToggle={() => setAddAt(addAt === 0 ? null : 0)} onAdd={(t) => addNodeAt(0, t)} />
                <Connector />

                {/* ── Nodes ── */}
                {nodes.map((node, i) => {
                  const def = getStepDef(node.type);
                  const Icon = def.icon;
                  const editing = editingNode === node.id;
                  return (
                    <div key={node.id} className="flex flex-col items-center w-full">
                      <div className={`w-full max-w-[420px] rounded-2xl border-2 transition-all overflow-hidden ${
                        editing ? "border-[#BAA05E] shadow-lg" : "border-transparent shadow-sm hover:shadow-md"
                      }`} style={{ backgroundColor: editing ? "white" : def.bg }}>
                        {/* Header */}
                        <div className="flex items-center gap-3 px-5 py-4 cursor-pointer" onClick={() => setEditingNode(editing ? null : node.id)}>
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm shrink-0" style={{ backgroundColor: def.color }}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold" style={{ color: def.color }}>{node.label || def.label}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{nodePreview(node)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                              className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-50 transition-all">
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground/40 transition-transform ${editing ? "rotate-180" : ""}`} />
                          </div>
                        </div>

                        {/* Config panel */}
                        {editing && (
                          <div className="px-5 pb-5 pt-1 border-t border-border/40 space-y-3 bg-white">
                            <Field label="Rótulo do passo" value={node.label || ""} onChange={(v) => updateNode(node.id, { label: v })} placeholder={def.label} />

                            {node.type === "send_email" && (
                              <>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-muted-foreground">Template do email</label>
                                  <select value={node.config?.template_id || ""} onChange={(e) => updateNode(node.id, { config: { ...node.config, template_id: e.target.value } })} className={inputCls}>
                                    <option value="">— selecionar template —</option>
                                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                                </div>
                                <Field label="Assunto do email" value={node.config?.subject || ""} onChange={(v) => updateNode(node.id, { config: { ...node.config, subject: v } })} placeholder="Bem-vindo, {{primeiro_nome}}!" />
                              </>
                            )}

                            {node.type === "send_whatsapp" && (
                              <div className="space-y-1">
                                <label className="text-[11px] font-medium text-muted-foreground">Mensagem</label>
                                <textarea value={node.config?.message || ""} onChange={(e) => updateNode(node.id, { config: { ...node.config, message: e.target.value } })}
                                  placeholder="Olá {{primeiro_nome}}! Temos novidades..." rows={3} className={inputCls + " resize-y"} />
                              </div>
                            )}

                            {node.type === "wait" && (
                              <div className="flex gap-3">
                                <div className="flex-1 space-y-1">
                                  <label className="text-[11px] font-medium text-muted-foreground">Quantidade</label>
                                  <input type="number" value={node.config?.amount || 1} min={1}
                                    onChange={(e) => updateNode(node.id, { config: { ...node.config, amount: parseInt(e.target.value) || 1 } })} className={inputCls} />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <label className="text-[11px] font-medium text-muted-foreground">Unidade</label>
                                  <select value={node.config?.unit || "days"} onChange={(e) => updateNode(node.id, { config: { ...node.config, unit: e.target.value } })} className={inputCls}>
                                    <option value="hours">Horas</option>
                                    <option value="days">Dias</option>
                                  </select>
                                </div>
                              </div>
                            )}

                            {node.type === "condition" && (
                              <>
                                <Field label="Campo do lead" value={node.config?.field || ""} onChange={(v) => updateNode(node.id, { config: { ...node.config, field: v } })} placeholder="status, origem, tags..." />
                                <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-muted-foreground">Operador</label>
                                  <select value={node.config?.operator || "eq"} onChange={(e) => updateNode(node.id, { config: { ...node.config, operator: e.target.value } })} className={inputCls}>
                                    <option value="eq">Igual a</option>
                                    <option value="neq">Diferente de</option>
                                    <option value="contains">Contém</option>
                                    <option value="exists">Existe</option>
                                  </select>
                                </div>
                                <Field label="Valor esperado" value={node.config?.value || ""} onChange={(v) => updateNode(node.id, { config: { ...node.config, value: v } })} placeholder="convertido" />
                              </>
                            )}

                            {node.type === "update_field" && (
                              <>
                                <Field label="Campo a atualizar" value={node.config?.field || ""} onChange={(v) => updateNode(node.id, { config: { ...node.config, field: v } })} placeholder="status" />
                                <Field label="Novo valor" value={node.config?.value || ""} onChange={(v) => updateNode(node.id, { config: { ...node.config, value: v } })} placeholder="em-andamento" />
                              </>
                            )}

                            {node.type === "add_tag" && (
                              <Field label="Nome da tag" value={node.config?.tag || ""} onChange={(v) => updateNode(node.id, { config: { ...node.config, tag: v } })} placeholder="engajado" />
                            )}

                            {node.type === "end" && (
                              <p className="text-[11px] text-muted-foreground py-1">O fluxo encerra aqui. Sem mais ações.</p>
                            )}
                          </div>
                        )}
                      </div>

                      <Connector />
                      <AddBtn index={i + 1} active={addAt === i + 1} onToggle={() => setAddAt(addAt === i + 1 ? null : i + 1)} onAdd={(t) => addNodeAt(i + 1, t)} />
                      <Connector />
                    </div>
                  );
                })}

                {/* End */}
                <div className="flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-medium text-muted-foreground" style={{ backgroundColor: "#f4f4f5" }}>
                  <CheckCircle2 className="h-4 w-4" /> Fim do fluxo
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ── Connector line ─────────────────────────────────────── */

function Connector() {
  return <div className="w-0.5 h-5 rounded-full" style={{ backgroundColor: `${WARM}40` }} />;
}

/* ── Add button between nodes ───────────────────────────── */

function AddBtn({ index, active, onToggle, onAdd }: {
  index: number; active: boolean;
  onToggle: () => void; onAdd: (type: FlowNodeType) => void;
}) {
  return (
    <div className="relative flex flex-col items-center">
      <button onClick={onToggle}
        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all z-10 ${
          active ? "border-[#BAA05E] bg-[#BAA05E] text-white shadow-md scale-110" : "border-[#BAA05E]/30 bg-white text-[#BAA05E]/60 hover:border-[#BAA05E] hover:text-[#BAA05E] hover:scale-105"
        }`}>
        {active ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      </button>

      {active && (
        <>
          <div className="fixed inset-0 z-20" onClick={onToggle} />
          <div className="absolute top-full mt-2 z-30 bg-white border border-border/60 rounded-2xl shadow-xl py-2 w-[240px] overflow-hidden">
            <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Adicionar passo</p>
            {STEP_PALETTE.map((s) => {
              const Icon = s.icon;
              return (
                <button key={s.type} onClick={() => onAdd(s.type)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0" style={{ backgroundColor: s.color }}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Sidebar card ────────────────────────────────────────── */

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: WARM }}>{title}</p>
      {children}
    </div>
  );
}

/* ── Helpers ──────────────────────────────────────────── */

const inputCls = "w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-[#BAA05E]/60 focus:ring-2 focus:ring-[#BAA05E]/10 transition-all";

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={inputCls} />
    </div>
  );
}
