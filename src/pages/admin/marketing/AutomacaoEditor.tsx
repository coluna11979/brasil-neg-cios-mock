import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, Zap, Mail, MessageSquare,
  Clock, GitBranch, Tag, FileText, CheckCircle2, Power, ChevronDown,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useEmailAutomation, useSaveAutomation, useEmailTemplates } from "@/hooks/useEmailMarketing";
import { toast } from "sonner";
import type { FlowNode, FlowNodeType } from "@/types/email.types";

/* ── Constantes ─────────────────────────────────────────── */

const WARM = "#BAA05E";
const uid = () => crypto.randomUUID();

const TRIGGER_OPTS = [
  { value: "lead_created", label: "Novo lead cadastrado" },
  { value: "lead_status_changed", label: "Status do lead mudou" },
  { value: "tag_added", label: "Tag adicionada ao lead" },
  { value: "form_submitted", label: "Formulário preenchido" },
  { value: "manual", label: "Disparo manual" },
];

type StepDef = { type: FlowNodeType; label: string; icon: any; color: string; desc: string };

const STEP_PALETTE: StepDef[] = [
  { type: "send_email", label: "Enviar Email", icon: Mail, color: "#3b82f6", desc: "Dispara um email pro lead" },
  { type: "send_whatsapp", label: "Enviar WhatsApp", icon: MessageSquare, color: "#22c55e", desc: "Envia mensagem WhatsApp" },
  { type: "wait", label: "Esperar", icon: Clock, color: "#f59e0b", desc: "Aguarda X dias/horas" },
  { type: "condition", label: "Condição", icon: GitBranch, color: "#8b5cf6", desc: "Se/senão baseado em critério" },
  { type: "update_field", label: "Atualizar Campo", icon: FileText, color: "#06b6d4", desc: "Muda campo do lead" },
  { type: "add_tag", label: "Adicionar Tag", icon: Tag, color: "#ec4899", desc: "Adiciona tag ao lead" },
  { type: "end", label: "Fim", icon: CheckCircle2, color: "#6b7280", desc: "Encerra o fluxo" },
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

/* ── Componente principal ───────────────────────────────── */

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
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showPalette, setShowPalette] = useState<number | null>(null);

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
    setNodes((prev) => {
      const next = [...prev];
      next.splice(index, 0, defaultNode(type));
      return next;
    });
    setShowPalette(null);
  }, []);

  const updateNode = useCallback((nodeId: string, updates: Partial<FlowNode>) => {
    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, ...updates } : n));
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    if (selectedNode === nodeId) setSelectedNode(null);
  }, [selectedNode]);

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

  return (
    <AdminLayout>
      <div className="max-w-[1080px] mx-auto pb-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <Link to="/admin/marketing/automacoes" className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold">{isNew ? "Nova automação" : name || "Automação"}</h1>
              <p className="text-[11px] text-muted-foreground">Monte o fluxo arrastando passos abaixo do trigger</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsActive(!isActive)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                isActive ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-border text-muted-foreground"
              }`}>
              <Power className="h-4 w-4" /> {isActive ? "Ativa" : "Inativa"}
            </button>
            <button onClick={handleSave} disabled={saveMut.isPending}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: WARM }}>
              {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar */}
          <aside className="space-y-5">
            {/* Metadados */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: WARM }}>Configuração</p>
              <Field label="Nome" value={name} onChange={setName} placeholder="Boas-vindas novo lead" />
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="O que essa automação faz..." rows={2} className={inputCls + " resize-y"} />
              </div>
            </div>

            {/* Trigger */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: WARM }}>Trigger (quando dispara)</p>
              <select value={triggerEvent} onChange={(e) => setTriggerEvent(e.target.value)} className={inputCls}>
                {TRIGGER_OPTS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {triggerEvent === "lead_status_changed" && (
                <Field label="Novo status" value={triggerFilter.new_status || ""} onChange={(v) => setTriggerFilter({ ...triggerFilter, new_status: v })} placeholder="convertido" />
              )}
              {triggerEvent === "tag_added" && (
                <Field label="Tag" value={triggerFilter.tag || ""} onChange={(v) => setTriggerFilter({ ...triggerFilter, tag: v })} placeholder="vip" />
              )}
            </div>

            {/* Paleta de passos */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: WARM }}>Passos disponíveis</p>
              <p className="text-[11px] text-muted-foreground">Clique nos + no fluxo pra adicionar</p>
              <div className="grid grid-cols-2 gap-2">
                {STEP_PALETTE.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.type} className="flex items-center gap-2 rounded-xl border border-border/60 p-2.5 text-xs text-muted-foreground">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md text-white shrink-0" style={{ backgroundColor: s.color }}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <span className="truncate">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Flow builder */}
          <main className="min-w-0">
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border/60 bg-muted/20">
                <h2 className="text-sm font-semibold">Fluxo da automação</h2>
                <p className="text-[10px] text-muted-foreground">{nodes.length} passos</p>
              </div>

              <div className="p-6">
                {/* Trigger node */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-3 rounded-xl border-2 border-dashed px-5 py-3" style={{ borderColor: WARM, background: `${WARM}08` }}>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-white" style={{ backgroundColor: WARM }}>
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Trigger</p>
                      <p className="text-[11px] text-muted-foreground">{TRIGGER_OPTS.find((t) => t.value === triggerEvent)?.label || triggerEvent}</p>
                    </div>
                  </div>

                  {/* Connector + add button */}
                  <AddButton index={0} showPalette={showPalette} setShowPalette={setShowPalette} onAdd={addNodeAt} />
                </div>

                {/* Flow nodes */}
                {nodes.map((node, i) => {
                  const def = getStepDef(node.type);
                  const Icon = def.icon;
                  const sel = selectedNode === node.id;
                  return (
                    <div key={node.id} className="flex flex-col items-center">
                      <div className={`w-full max-w-md rounded-xl border transition-all ${sel ? "border-[#BAA05E] shadow-md" : "border-border/60 hover:border-border"}`}>
                        {/* Node header */}
                        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setSelectedNode(sel ? null : node.id)}>
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-white shrink-0" style={{ backgroundColor: def.color }}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{node.label || def.label}</p>
                            <p className="text-[10px] text-muted-foreground">{def.desc}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                            className="p-1.5 rounded text-muted-foreground/50 hover:text-red-500 transition-colors">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Expanded config */}
                        {sel && (
                          <div className="px-4 pb-4 pt-1 border-t border-border/40 space-y-3">
                            <Field label="Rótulo" value={node.label || ""} onChange={(v) => updateNode(node.id, { label: v })} placeholder={def.label} />

                            {node.type === "send_email" && (
                              <>
                                <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-muted-foreground">Template</label>
                                  <select value={node.config?.template_id || ""} onChange={(e) => updateNode(node.id, { config: { ...node.config, template_id: e.target.value } })} className={inputCls}>
                                    <option value="">— selecionar —</option>
                                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                  </select>
                                </div>
                                <Field label="Assunto" value={node.config?.subject || ""} onChange={(v) => updateNode(node.id, { config: { ...node.config, subject: v } })} placeholder="Bem-vindo, {{primeiro_nome}}!" />
                              </>
                            )}

                            {node.type === "send_whatsapp" && (
                              <div className="space-y-1">
                                <label className="text-[11px] font-medium text-muted-foreground">Mensagem</label>
                                <textarea value={node.config?.message || ""} onChange={(e) => updateNode(node.id, { config: { ...node.config, message: e.target.value } })}
                                  placeholder="Olá {{primeiro_nome}}! Temos novidades pra você..." rows={3} className={inputCls + " resize-y"} />
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
                                <Field label="Campo" value={node.config?.field || ""} onChange={(v) => updateNode(node.id, { config: { ...node.config, field: v } })} placeholder="status, origem, tags..." />
                                <div className="space-y-1">
                                  <label className="text-[11px] font-medium text-muted-foreground">Operador</label>
                                  <select value={node.config?.operator || "eq"} onChange={(e) => updateNode(node.id, { config: { ...node.config, operator: e.target.value } })} className={inputCls}>
                                    <option value="eq">Igual a</option>
                                    <option value="neq">Diferente de</option>
                                    <option value="contains">Contém</option>
                                    <option value="exists">Existe</option>
                                  </select>
                                </div>
                                <Field label="Valor" value={node.config?.value || ""} onChange={(v) => updateNode(node.id, { config: { ...node.config, value: v } })} placeholder="convertido" />
                              </>
                            )}

                            {node.type === "update_field" && (
                              <>
                                <Field label="Campo" value={node.config?.field || ""} onChange={(v) => updateNode(node.id, { config: { ...node.config, field: v } })} placeholder="status" />
                                <Field label="Novo valor" value={node.config?.value || ""} onChange={(v) => updateNode(node.id, { config: { ...node.config, value: v } })} placeholder="em-andamento" />
                              </>
                            )}

                            {node.type === "add_tag" && (
                              <Field label="Tag" value={node.config?.tag || ""} onChange={(v) => updateNode(node.id, { config: { ...node.config, tag: v } })} placeholder="engajado" />
                            )}
                          </div>
                        )}
                      </div>

                      {/* Connector + add */}
                      <AddButton index={i + 1} showPalette={showPalette} setShowPalette={setShowPalette} onAdd={addNodeAt} />
                    </div>
                  );
                })}

                {/* End indicator */}
                {nodes.length > 0 && (
                  <div className="flex justify-center">
                    <div className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Fim do fluxo
                    </div>
                  </div>
                )}

                {nodes.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Clique no <strong>+</strong> acima pra adicionar o primeiro passo
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ── AddButton (connector entre nodes) ───────────────── */

function AddButton({ index, showPalette, setShowPalette, onAdd }: {
  index: number; showPalette: number | null;
  setShowPalette: (v: number | null) => void;
  onAdd: (index: number, type: FlowNodeType) => void;
}) {
  const open = showPalette === index;
  return (
    <div className="flex flex-col items-center py-2 relative">
      <div className="w-px h-6 bg-border" />
      <button onClick={() => setShowPalette(open ? null : index)}
        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
          open ? "border-[#BAA05E] bg-[#BAA05E] text-white" : "border-border bg-card text-muted-foreground hover:border-[#BAA05E] hover:text-[#BAA05E]"
        }`}>
        <Plus className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute top-full mt-1 z-30 bg-card border border-border rounded-xl shadow-lg py-2 w-52">
          {STEP_PALETTE.map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.type} onClick={() => onAdd(index, s.type)}
                className="w-full flex items-center gap-3 px-4 py-2 text-xs hover:bg-muted transition-colors">
                <div className="flex h-6 w-6 items-center justify-center rounded-md text-white shrink-0" style={{ backgroundColor: s.color }}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{s.label}</p>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className="w-px h-6 bg-border" />
      <ChevronDown className="h-3 w-3 text-border -mt-1" />
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
