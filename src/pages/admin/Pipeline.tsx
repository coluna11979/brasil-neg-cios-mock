import { useEffect, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Loader2, GripVertical, Phone, Mail, Clock, Building2, Store,
  Megaphone, MessageCircle, TrendingUp, Target, Plus, X,
  ArrowRight, ChevronRight, Users, CheckCircle2,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import LeadDetailModal from "@/components/admin/LeadDetailModal";
import { getAllLeads, updateLeadStatus, type Lead } from "@/stores/leadStore";
import {
  getAllCaptacoes, addCaptacao, updateCaptacaoStatus, type Captacao,
} from "@/stores/captacaoStore";

// ─── Vendas (leads) ───────────────────────────────────────────────────────────

const VENDAS_COLUMNS: {
  id: Lead["status"];
  label: string;
  color: string;
  lightBg: string;
  lightText: string;
  desc: string;
}[] = [
  { id: "novo",         label: "Novos",        color: "bg-blue-500",  lightBg: "bg-blue-50",  lightText: "text-blue-700",  desc: "Leads recém-capturados" },
  { id: "em-andamento", label: "Em Andamento",  color: "bg-amber-500", lightBg: "bg-amber-50", lightText: "text-amber-700", desc: "Corretor em contato" },
  { id: "convertido",   label: "Convertidos",   color: "bg-green-500", lightBg: "bg-green-50", lightText: "text-green-700", desc: "Negócio fechado" },
  { id: "perdido",      label: "Perdidos",      color: "bg-red-400",   lightBg: "bg-red-50",   lightText: "text-red-700",   desc: "Não converteu" },
];

// ─── Captação ─────────────────────────────────────────────────────────────────

const CAPTACAO_COLUMNS: {
  id: Captacao["status"];
  label: string;
  color: string;
  lightBg: string;
  lightText: string;
  desc: string;
}[] = [
  { id: "prospeccao",     label: "Prospecção",      color: "bg-violet-500", lightBg: "bg-violet-50", lightText: "text-violet-700", desc: "Identificado para abordar" },
  { id: "contato-feito",  label: "Contato Feito",   color: "bg-blue-500",   lightBg: "bg-blue-50",   lightText: "text-blue-700",   desc: "Proprietário abordado" },
  { id: "visita-agendada",label: "Visita Agendada", color: "bg-amber-500",  lightBg: "bg-amber-50",  lightText: "text-amber-700",  desc: "Visita marcada" },
  { id: "captado",        label: "Captados",        color: "bg-green-500",  lightBg: "bg-green-50",  lightText: "text-green-700",  desc: "Listado na plataforma" },
  { id: "perdido",        label: "Perdidos",        color: "bg-red-400",    lightBg: "bg-red-50",    lightText: "text-red-700",    desc: "Não converteu" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const origemIcons: Record<string, typeof Building2> = {
  "contato-negocio": Building2,
  "contato-galeria": Store,
  anunciar: Megaphone,
  newsletter: Mail,
  "exit-intent": MessageCircle,
  whatsapp: MessageCircle,
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function getTemperature(dateStr: string): "hot" | "warm" | "cold" {
  const hours = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
  if (hours < 24) return "hot";
  if (hours < 72) return "warm";
  return "cold";
}

const tempColors = { hot: "bg-red-500", warm: "bg-amber-400", cold: "bg-slate-300" };

// ─── Metrics bar component ────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg ${color} flex items-center justify-center shrink-0`}>
        <TrendingUp className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display font-bold text-foreground text-lg leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Funil conversion bar ─────────────────────────────────────────────────────

function FunnelBar({ columns, counts }: {
  columns: { id: string; label: string; color: string }[];
  counts: Record<string, number>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const active = columns.filter((c) => c.id !== "perdido");
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Funil de conversão</p>
      <div className="flex items-center gap-1">
        {active.map((col, i) => {
          const n = counts[col.id] || 0;
          const pct = total > 0 ? Math.round((n / total) * 100) : 0;
          return (
            <div key={col.id} className="flex items-center gap-1 flex-1 min-w-0">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground truncate">{col.label}</span>
                  <span className="text-xs font-bold text-foreground ml-1">{n}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${col.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              {i < active.length - 1 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── New captacao modal ────────────────────────────────────────────────────────

const TIPOS_NEGOCIO = ["Bar", "Restaurante", "Salão", "Loja", "Escritório", "Galpão", "Outro"];

function NovaCaptacaoModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (data: Parameters<typeof addCaptacao>[0]) => void;
}) {
  const [form, setForm] = useState({
    nome_negocio: "", tipo: "", endereco: "",
    contato_nome: "", contato_telefone: "", observacoes: "",
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display font-bold text-foreground">Nova Captação</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome do negócio *</label>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Ex: Bar do João"
              value={form.nome_negocio}
              onChange={(e) => set("nome_negocio", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                value={form.tipo}
                onChange={(e) => set("tipo", e.target.value)}
              >
                <option value="">Selecione...</option>
                {TIPOS_NEGOCIO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Telefone do dono</label>
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="(11) 9 9999-9999"
                value={form.contato_telefone}
                onChange={(e) => set("contato_telefone", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome do proprietário</label>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Nome da pessoa de contato"
              value={form.contato_nome}
              onChange={(e) => set("contato_nome", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Endereço</label>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Rua, bairro..."
              value={form.endereco}
              onChange={(e) => set("endereco", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Notas sobre o negócio..."
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            disabled={!form.nome_negocio.trim()}
            onClick={() => onSave(form)}
            className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Criar Captação
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const Pipeline = () => {
  usePageTitle("Admin - Pipeline");
  const [tab, setTab] = useState<"vendas" | "captacao">("vendas");

  // Vendas
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverLeadCol, setDragOverLeadCol] = useState<string | null>(null);

  // Captação
  const [captacoes, setCaptacoes] = useState<Captacao[]>([]);
  const [loadingCap, setLoadingCap] = useState(true);
  const [draggedCap, setDraggedCap] = useState<string | null>(null);
  const [dragOverCapCol, setDragOverCapCol] = useState<string | null>(null);
  const [showNovaCap, setShowNovaCap] = useState(false);

  useEffect(() => {
    getAllLeads().then((d) => { setLeads(d); setLoadingLeads(false); });
    getAllCaptacoes().then((d) => { setCaptacoes(d); setLoadingCap(false); });
  }, []);

  // ── Vendas drag ──
  const handleLeadDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLead(id);
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).style.opacity = "0.5";
  };
  const handleLeadDragEnd = (e: React.DragEvent) => {
    setDraggedLead(null);
    setDragOverLeadCol(null);
    (e.currentTarget as HTMLElement).style.opacity = "1";
  };
  const handleLeadDrop = async (e: React.DragEvent, newStatus: Lead["status"]) => {
    e.preventDefault();
    setDragOverLeadCol(null);
    if (!draggedLead) return;
    const lead = leads.find((l) => l.id === draggedLead);
    if (!lead || lead.status === newStatus) return;
    setLeads((p) => p.map((l) => l.id === draggedLead ? { ...l, status: newStatus } : l));
    await updateLeadStatus(draggedLead, newStatus);
    setDraggedLead(null);
  };
  const handleLeadStatusChange = async (id: string, newStatus: Lead["status"]) => {
    setLeads((p) => p.map((l) => l.id === id ? { ...l, status: newStatus } : l));
    await updateLeadStatus(id, newStatus);
  };

  // ── Captação drag ──
  const handleCapDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCap(id);
    e.dataTransfer.effectAllowed = "move";
    (e.currentTarget as HTMLElement).style.opacity = "0.5";
  };
  const handleCapDragEnd = (e: React.DragEvent) => {
    setDraggedCap(null);
    setDragOverCapCol(null);
    (e.currentTarget as HTMLElement).style.opacity = "1";
  };
  const handleCapDrop = async (e: React.DragEvent, newStatus: Captacao["status"]) => {
    e.preventDefault();
    setDragOverCapCol(null);
    if (!draggedCap) return;
    const cap = captacoes.find((c) => c.id === draggedCap);
    if (!cap || cap.status === newStatus) return;
    setCaptacoes((p) => p.map((c) => c.id === draggedCap ? { ...c, status: newStatus } : c));
    await updateCaptacaoStatus(draggedCap, newStatus);
    setDraggedCap(null);
  };

  // ── Metrics ──
  const vendaCounts = VENDAS_COLUMNS.reduce((acc, col) => {
    acc[col.id] = leads.filter((l) => l.status === col.id).length;
    return acc;
  }, {} as Record<string, number>);

  const capCounts = CAPTACAO_COLUMNS.reduce((acc, col) => {
    acc[col.id] = captacoes.filter((c) => c.status === col.id).length;
    return acc;
  }, {} as Record<string, number>);

  const taxaVendas = leads.length > 0
    ? Math.round((vendaCounts.convertido / leads.length) * 100)
    : 0;

  const taxaCaptacao = captacoes.length > 0
    ? Math.round((capCounts.captado / captacoes.length) * 100)
    : 0;

  const isLoading = tab === "vendas" ? loadingLeads : loadingCap;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Pipeline</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Arraste os cards entre colunas para atualizar o status
            </p>
          </div>
          {tab === "captacao" && (
            <button
              onClick={() => setShowNovaCap(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nova Captação
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
          {(["vendas", "captacao"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === t
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "vendas" ? (
                <><Users className="h-4 w-4" />Funil de Vendas</>
              ) : (
                <><Target className="h-4 w-4" />Funil de Captação</>
              )}
            </button>
          ))}
        </div>

        {/* Metrics */}
        {tab === "vendas" ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Total de Leads" value={leads.length} color="bg-blue-500" />
            <MetricCard label="Em Andamento" value={vendaCounts["em-andamento"]} sub="aguardando retorno" color="bg-amber-500" />
            <MetricCard label="Convertidos" value={vendaCounts.convertido} sub="negócios fechados" color="bg-green-500" />
            <MetricCard label="Taxa de Conversão" value={`${taxaVendas}%`} sub="de leads → clientes" color="bg-violet-500" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Total Captações" value={captacoes.length} color="bg-violet-500" />
            <MetricCard label="Em Andamento" value={(capCounts["contato-feito"] || 0) + (capCounts["visita-agendada"] || 0)} sub="contato + visita" color="bg-blue-500" />
            <MetricCard label="Captados" value={capCounts.captado} sub="na plataforma" color="bg-green-500" />
            <MetricCard label="Taxa de Captação" value={`${taxaCaptacao}%`} sub="de prospecção → captado" color="bg-amber-500" />
          </div>
        )}

        {/* Funnel bar */}
        <FunnelBar
          columns={tab === "vendas" ? VENDAS_COLUMNS : CAPTACAO_COLUMNS}
          counts={tab === "vendas" ? vendaCounts : capCounts}
        />

        {/* Kanban */}
        {tab === "vendas" ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {VENDAS_COLUMNS.map((col) => {
              const colLeads = leads.filter((l) => l.status === col.id);
              const isOver = dragOverLeadCol === col.id;
              return (
                <div
                  key={col.id}
                  className={`flex-shrink-0 w-[280px] rounded-xl border transition-all ${
                    isOver ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-muted/30"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverLeadCol(col.id); }}
                  onDragLeave={() => setDragOverLeadCol(null)}
                  onDrop={(e) => handleLeadDrop(e, col.id)}
                >
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${col.color}`} />
                        <h3 className="font-semibold text-sm text-foreground">{col.label}</h3>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${col.lightBg} ${col.lightText}`}>
                        {colLeads.length}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{col.desc}</p>
                  </div>
                  <div className="p-2 space-y-2 min-h-[200px]">
                    {colLeads.length === 0 ? (
                      <div className="flex items-center justify-center h-24 text-xs text-muted-foreground italic">
                        Nenhum lead
                      </div>
                    ) : colLeads.map((lead) => {
                      const temp = getTemperature(lead.criado_em);
                      const OrigemIcon = origemIcons[lead.origem] || MessageCircle;
                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleLeadDragStart(e, lead.id)}
                          onDragEnd={handleLeadDragEnd}
                          onClick={() => setSelectedLead(lead)}
                          className={`group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30 ${
                            draggedLead === lead.id ? "opacity-50" : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <div className={`h-2 w-2 rounded-full shrink-0 ${tempColors[temp]}`} />
                                <p className="font-semibold text-sm text-foreground truncate">{lead.nome}</p>
                              </div>
                              <div className="mt-1.5 space-y-1">
                                {lead.email && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Mail className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{lead.email}</span>
                                  </div>
                                )}
                                {lead.telefone && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3 shrink-0" />
                                    <span>{lead.telefone}</span>
                                  </div>
                                )}
                              </div>
                              {(lead.negocio_titulo || lead.galeria_nome) && (
                                <p className="mt-1.5 text-xs text-primary font-medium truncate">
                                  {lead.negocio_titulo || lead.galeria_nome}
                                  {lead.espaco_numero && ` — ${lead.espaco_numero}`}
                                </p>
                              )}
                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <OrigemIcon className="h-3 w-3" />
                                  <span>{lead.origem.replace(/-/g, " ")}</span>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{timeAgo(lead.criado_em)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Captação Kanban */
          <div className="flex gap-4 overflow-x-auto pb-4">
            {CAPTACAO_COLUMNS.map((col) => {
              const colCaps = captacoes.filter((c) => c.status === col.id);
              const isOver = dragOverCapCol === col.id;
              return (
                <div
                  key={col.id}
                  className={`flex-shrink-0 w-[260px] rounded-xl border transition-all ${
                    isOver ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-muted/30"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverCapCol(col.id); }}
                  onDragLeave={() => setDragOverCapCol(null)}
                  onDrop={(e) => handleCapDrop(e, col.id)}
                >
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${col.color}`} />
                        <h3 className="font-semibold text-sm text-foreground">{col.label}</h3>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${col.lightBg} ${col.lightText}`}>
                        {colCaps.length}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{col.desc}</p>
                  </div>
                  <div className="p-2 space-y-2 min-h-[200px]">
                    {colCaps.length === 0 ? (
                      <div className="flex items-center justify-center h-24 text-xs text-muted-foreground italic">
                        Nenhum negócio
                      </div>
                    ) : colCaps.map((cap) => (
                      <div
                        key={cap.id}
                        draggable
                        onDragStart={(e) => handleCapDragStart(e, cap.id)}
                        onDragEnd={handleCapDragEnd}
                        className={`group cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30 ${
                          draggedCap === cap.id ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{cap.nome_negocio}</p>
                            {cap.tipo && (
                              <span className="inline-block mt-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{cap.tipo}</span>
                            )}
                            {cap.contato_nome && (
                              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Users className="h-3 w-3 shrink-0" />
                                <span className="truncate">{cap.contato_nome}</span>
                              </div>
                            )}
                            {cap.contato_telefone && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span>{cap.contato_telefone}</span>
                              </div>
                            )}
                            {cap.endereco && (
                              <p className="mt-1 text-xs text-muted-foreground truncate">{cap.endereco}</p>
                            )}
                            <div className="mt-2 flex items-center justify-between">
                              {cap.corretor_nome && (
                                <span className="text-xs text-primary font-medium truncate">{cap.corretor_nome}</span>
                              )}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                                <Clock className="h-3 w-3" />
                                <span>{timeAgo(cap.criado_em)}</span>
                              </div>
                            </div>
                            {cap.status === "captado" && (
                              <div className="mt-2 flex items-center gap-1 text-xs text-green-600 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Na plataforma
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lead detail modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={async (newStatus) => {
            await handleLeadStatusChange(selectedLead.id, newStatus);
            setSelectedLead((p) => p ? { ...p, status: newStatus } : null);
          }}
        />
      )}

      {/* Nova captação modal */}
      {showNovaCap && (
        <NovaCaptacaoModal
          onClose={() => setShowNovaCap(false)}
          onSave={async (data) => {
            const ok = await addCaptacao(data);
            if (ok) {
              const fresh = await getAllCaptacoes();
              setCaptacoes(fresh);
            }
            setShowNovaCap(false);
          }}
        />
      )}
    </AdminLayout>
  );
};

export default Pipeline;
