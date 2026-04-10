import { useEffect, useRef, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Loader2, GripVertical, Phone, Mail, Clock, Building2,
  Target, Plus, X, Users, CheckCircle2, ChevronRight, TrendingUp,
  MessageSquare, Calendar, History, ArrowRight,
} from "lucide-react";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { getAllLeads, updateLeadStatus, type Lead } from "@/stores/leadStore";
import {
  getAllCaptacoes, addCaptacao, updateCaptacaoStatus, type Captacao,
} from "@/stores/captacaoStore";

// ─── Columns ──────────────────────────────────────────────────────────────────

const VENDAS_COLS: { id: Lead["status"]; label: string; color: string; lightBg: string; lightText: string }[] = [
  { id: "novo",         label: "Novos",       color: "bg-blue-500",  lightBg: "bg-blue-50",  lightText: "text-blue-700" },
  { id: "em-andamento", label: "Em Contato",  color: "bg-amber-500", lightBg: "bg-amber-50", lightText: "text-amber-700" },
  { id: "convertido",   label: "Fechados",    color: "bg-green-500", lightBg: "bg-green-50", lightText: "text-green-700" },
  { id: "perdido",      label: "Perdidos",    color: "bg-red-400",   lightBg: "bg-red-50",   lightText: "text-red-700" },
];

const CAPTACAO_COLS: { id: Captacao["status"]; label: string; color: string; lightBg: string; lightText: string }[] = [
  { id: "prospeccao",      label: "Prospecção",    color: "bg-violet-500", lightBg: "bg-violet-50", lightText: "text-violet-700" },
  { id: "contato-feito",   label: "Contato Feito", color: "bg-blue-500",   lightBg: "bg-blue-50",   lightText: "text-blue-700" },
  { id: "visita-agendada", label: "Visita",        color: "bg-amber-500",  lightBg: "bg-amber-50",  lightText: "text-amber-700" },
  { id: "captado",         label: "Captados",      color: "bg-green-500",  lightBg: "bg-green-50",  lightText: "text-green-700" },
  { id: "perdido",         label: "Perdidos",      color: "bg-red-400",    lightBg: "bg-red-50",    lightText: "text-red-700" },
];

// ─── CRM localStorage helpers ─────────────────────────────────────────────────

interface CrmHistoricoEntry {
  data: string;
  de: string;
  para: string;
}

interface CrmData {
  notas?: string;
  proximaAcao?: string;
  proximaAcaoData?: string;
  historico?: CrmHistoricoEntry[];
}

function crmGet(id: string): CrmData {
  try { return JSON.parse(localStorage.getItem(`crm_${id}`) || "{}"); } catch { return {}; }
}

function crmSet(id: string, data: CrmData) {
  localStorage.setItem(`crm_${id}`, JSON.stringify(data));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function urgencyBorder(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 1) return "border-l-green-400";
  if (days <= 3) return "border-l-yellow-400";
  return "border-l-red-400";
}

function whatsappLink(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  return `https://wa.me/55${digits}`;
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`rounded-xl ${color} px-4 py-3 flex flex-col`}>
      <span className="text-xs font-medium opacity-80">{label}</span>
      <span className="font-display font-bold text-lg leading-tight">{value}</span>
    </div>
  );
}

// ─── Funnel mini bar ──────────────────────────────────────────────────────────

function MiniFunnel({ cols, counts }: {
  cols: { id: string; label: string; color: string }[];
  counts: Record<string, number>;
}) {
  const active = cols.filter((c) => c.id !== "perdido");
  const max = Math.max(...active.map((c) => counts[c.id] || 0), 1);
  return (
    <div className="flex items-end gap-1 h-10">
      {active.map((col, i) => {
        const n = counts[col.id] || 0;
        const h = Math.max(Math.round((n / max) * 36), 4);
        return (
          <div key={col.id} className="flex items-end gap-1">
            <div
              className={`w-6 rounded-t-md ${col.color} opacity-80 transition-all`}
              style={{ height: `${h}px` }}
              title={`${col.label}: ${n}`}
            />
            {i < active.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground self-center" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Nova captação modal ──────────────────────────────────────────────────────

const TIPOS = ["Bar", "Restaurante", "Salão", "Loja", "Escritório", "Galpão", "Outro"];

function NovaCaptacaoModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (d: Parameters<typeof addCaptacao>[0]) => void;
}) {
  const [form, setForm] = useState({
    nome_negocio: "", tipo: "", endereco: "",
    contato_nome: "", contato_telefone: "", observacoes: "",
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display font-bold text-foreground">Nova Captação</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome do negócio *</label>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Ex: Bar do João"
              value={form.nome_negocio}
              onChange={(e) => set("nome_negocio", e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <select
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                value={form.tipo}
                onChange={(e) => set("tipo", e.target.value)}
              >
                <option value="">Selecione...</option>
                {TIPOS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Tel. do dono</label>
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="(11) 9 9999-9999"
                value={form.contato_telefone}
                onChange={(e) => set("contato_telefone", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nome do proprietário</label>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Ex: João Silva"
              value={form.contato_nome}
              onChange={(e) => set("contato_nome", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Endereço</label>
            <input
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Rua, bairro..."
              value={form.endereco}
              onChange={(e) => set("endereco", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Observações</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              placeholder="Notas sobre o negócio..."
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2 border-t border-border px-5 py-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            disabled={!form.nome_negocio.trim()}
            onClick={() => onSave(form)}
            className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LeadDetailModal ──────────────────────────────────────────────────────────

function LeadDetailModal({
  lead,
  onClose,
  onStageChange,
}: {
  lead: Lead;
  onClose: () => void;
  onStageChange: (id: string, newStatus: Lead["status"]) => void;
}) {
  const [crm, setCrm] = useState<CrmData>(() => crmGet(lead.id));
  const [notas, setNotas] = useState(crm.notas ?? "");
  const [proximaAcao, setProximaAcao] = useState(crm.proximaAcao ?? "");
  const [proximaAcaoData, setProximaAcaoData] = useState(crm.proximaAcaoData ?? "");

  const currentCol = VENDAS_COLS.find((c) => c.id === lead.status);

  function saveNotas() {
    const updated = { ...crmGet(lead.id), notas };
    crmSet(lead.id, updated);
    setCrm(updated);
  }

  function saveProximaAcao() {
    const updated = { ...crmGet(lead.id), proximaAcao, proximaAcaoData };
    crmSet(lead.id, updated);
    setCrm(updated);
  }

  function moveStage(newStatus: Lead["status"]) {
    if (newStatus === lead.status) return;
    const existing = crmGet(lead.id);
    const entry: CrmHistoricoEntry = {
      data: new Date().toISOString(),
      de: lead.status,
      para: newStatus,
    };
    const updated: CrmData = {
      ...existing,
      historico: [...(existing.historico ?? []), entry],
    };
    crmSet(lead.id, updated);
    setCrm(updated);
    onStageChange(lead.id, newStatus);
  }

  const historico = crm.historico ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-card px-5 py-4 gap-3">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-foreground truncate">{lead.nome}</h2>
            {currentCol && (
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold mt-1 ${currentCol.lightBg} ${currentCol.lightText}`}>
                {currentCol.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Contact section */}
          <div className="space-y-2">
            {lead.telefone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={whatsappLink(lead.telefone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline font-medium"
                >
                  {lead.telefone}
                </a>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{lead.email}</span>
              </div>
            )}
            {lead.negocio_titulo && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
                  {lead.negocio_titulo}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>Origem: {lead.origem.replace(/-/g, " ")} · {timeAgo(lead.criado_em)} atrás</span>
            </div>
          </div>

          {/* Mover estágio */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" /> Mover Estágio
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VENDAS_COLS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => moveStage(col.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                    lead.status === col.id
                      ? `${col.lightBg} ${col.lightText} border-current`
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Notas
            </p>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="Adicione suas notas sobre este lead..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              onBlur={saveNotas}
            />
          </div>

          {/* Próxima ação */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Próxima Ação
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Ex: Ligar para follow-up"
                value={proximaAcao}
                onChange={(e) => setProximaAcao(e.target.value)}
                onBlur={saveProximaAcao}
              />
              <input
                type="date"
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={proximaAcaoData}
                onChange={(e) => setProximaAcaoData(e.target.value)}
                onBlur={saveProximaAcao}
              />
            </div>
          </div>

          {/* Histórico */}
          {historico.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Histórico de Movimentações
              </p>
              <div className="space-y-1.5">
                {[...historico].reverse().map((h, i) => {
                  const deCol = VENDAS_COLS.find((c) => c.id === h.de);
                  const paraCol = VENDAS_COLS.find((c) => c.id === h.para);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                      <span className={`rounded-full px-1.5 py-0.5 font-medium ${deCol?.lightBg} ${deCol?.lightText}`}>{deCol?.label ?? h.de}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className={`rounded-full px-1.5 py-0.5 font-medium ${paraCol?.lightBg} ${paraCol?.lightText}`}>{paraCol?.label ?? h.para}</span>
                      <span className="ml-auto shrink-0">{new Date(h.data).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {lead.telefone && (
          <div className="sticky bottom-0 border-t border-border bg-card px-5 py-3">
            <a
              href={whatsappLink(lead.telefone)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
            >
              <Phone className="h-4 w-4" />
              Abrir WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CaptacaoDetailModal ──────────────────────────────────────────────────────

function CaptacaoDetailModal({
  cap,
  onClose,
  onStageChange,
}: {
  cap: Captacao;
  onClose: () => void;
  onStageChange: (id: string, newStatus: Captacao["status"]) => void;
}) {
  const [crm, setCrm] = useState<CrmData>(() => crmGet(cap.id));
  const [notas, setNotas] = useState(crm.notas ?? "");
  const [proximaAcao, setProximaAcao] = useState(crm.proximaAcao ?? "");
  const [proximaAcaoData, setProximaAcaoData] = useState(crm.proximaAcaoData ?? "");

  const currentCol = CAPTACAO_COLS.find((c) => c.id === cap.status);

  function saveNotas() {
    const updated = { ...crmGet(cap.id), notas };
    crmSet(cap.id, updated);
    setCrm(updated);
  }

  function saveProximaAcao() {
    const updated = { ...crmGet(cap.id), proximaAcao, proximaAcaoData };
    crmSet(cap.id, updated);
    setCrm(updated);
  }

  function moveStage(newStatus: Captacao["status"]) {
    if (newStatus === cap.status) return;
    const existing = crmGet(cap.id);
    const entry: CrmHistoricoEntry = {
      data: new Date().toISOString(),
      de: cap.status,
      para: newStatus,
    };
    const updated: CrmData = {
      ...existing,
      historico: [...(existing.historico ?? []), entry],
    };
    crmSet(cap.id, updated);
    setCrm(updated);
    onStageChange(cap.id, newStatus);
  }

  const historico = crm.historico ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-card px-5 py-4 gap-3">
          <div className="min-w-0">
            <h2 className="font-display font-bold text-foreground truncate">{cap.nome_negocio}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {currentCol && (
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${currentCol.lightBg} ${currentCol.lightText}`}>
                  {currentCol.label}
                </span>
              )}
              {cap.tipo && (
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {cap.tipo}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Contact section */}
          <div className="space-y-2">
            {cap.endereco && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{cap.endereco}</span>
              </div>
            )}
            {cap.contato_nome && (
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{cap.contato_nome}</span>
              </div>
            )}
            {cap.contato_telefone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={whatsappLink(cap.contato_telefone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:underline font-medium"
                >
                  {cap.contato_telefone}
                </a>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span>{timeAgo(cap.criado_em)} atrás</span>
            </div>
          </div>

          {/* Mover estágio */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" /> Mover Estágio
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CAPTACAO_COLS.map((col) => (
                <button
                  key={col.id}
                  onClick={() => moveStage(col.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                    cap.status === col.id
                      ? `${col.lightBg} ${col.lightText} border-current`
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {col.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Notas
            </p>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="Adicione suas notas sobre esta captação..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              onBlur={saveNotas}
            />
          </div>

          {/* Próxima ação */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Próxima Ação
            </p>
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Ex: Visitar o estabelecimento"
                value={proximaAcao}
                onChange={(e) => setProximaAcao(e.target.value)}
                onBlur={saveProximaAcao}
              />
              <input
                type="date"
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                value={proximaAcaoData}
                onChange={(e) => setProximaAcaoData(e.target.value)}
                onBlur={saveProximaAcao}
              />
            </div>
          </div>

          {/* Observações originais (read-only) */}
          {cap.observacoes && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Observações Originais
              </p>
              <div className="rounded-lg bg-muted/40 border border-border px-3 py-2.5 text-sm text-muted-foreground">
                {cap.observacoes}
              </div>
            </div>
          )}

          {/* Histórico */}
          {historico.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Histórico de Movimentações
              </p>
              <div className="space-y-1.5">
                {[...historico].reverse().map((h, i) => {
                  const deCol = CAPTACAO_COLS.find((c) => c.id === h.de);
                  const paraCol = CAPTACAO_COLS.find((c) => c.id === h.para);
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                      <span className={`rounded-full px-1.5 py-0.5 font-medium ${deCol?.lightBg} ${deCol?.lightText}`}>{deCol?.label ?? h.de}</span>
                      <ArrowRight className="h-3 w-3 shrink-0" />
                      <span className={`rounded-full px-1.5 py-0.5 font-medium ${paraCol?.lightBg} ${paraCol?.lightText}`}>{paraCol?.label ?? h.para}</span>
                      <span className="ml-auto shrink-0">{new Date(h.data).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {cap.contato_telefone && (
          <div className="sticky bottom-0 border-t border-border bg-card px-5 py-3">
            <a
              href={whatsappLink(cap.contato_telefone)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
            >
              <Phone className="h-4 w-4" />
              Abrir WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const CorretorPipeline = () => {
  usePageTitle("Pipeline — Meu Funil");
  const [tab, setTab] = useState<"vendas" | "captacao">("vendas");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [captacoes, setCaptacoes] = useState<Captacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverLead, setDragOverLead] = useState<string | null>(null);
  const [draggedCap, setDraggedCap] = useState<string | null>(null);
  const [dragOverCap, setDragOverCap] = useState<string | null>(null);
  const [showNovaCap, setShowNovaCap] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedCap, setSelectedCap] = useState<Captacao | null>(null);

  // Track whether a drag was initiated to avoid opening modal on drag-click
  const isDraggingRef = useRef(false);

  useEffect(() => {
    Promise.all([getAllLeads(), getAllCaptacoes()]).then(([l, c]) => {
      setLeads(l);
      setCaptacoes(c);
      setLoading(false);
    });
  }, []);

  // ── Leads drag ──
  const dropLead = async (e: React.DragEvent, status: Lead["status"]) => {
    e.preventDefault();
    setDragOverLead(null);
    if (!draggedLead) return;
    const lead = leads.find((l) => l.id === draggedLead);
    if (!lead || lead.status === status) return;
    setLeads((p) => p.map((l) => l.id === draggedLead ? { ...l, status } : l));
    await updateLeadStatus(draggedLead, status);
    setDraggedLead(null);
  };

  // ── Captação drag ──
  const dropCap = async (e: React.DragEvent, status: Captacao["status"]) => {
    e.preventDefault();
    setDragOverCap(null);
    if (!draggedCap) return;
    const cap = captacoes.find((c) => c.id === draggedCap);
    if (!cap || cap.status === status) return;
    setCaptacoes((p) => p.map((c) => c.id === draggedCap ? { ...c, status } : c));
    await updateCaptacaoStatus(draggedCap, status);
    setDraggedCap(null);
  };

  // ── Counts ──
  const vendaCounts = VENDAS_COLS.reduce((a, c) => { a[c.id] = leads.filter((l) => l.status === c.id).length; return a; }, {} as Record<string, number>);
  const capCounts = CAPTACAO_COLS.reduce((a, c) => { a[c.id] = captacoes.filter((x) => x.status === c.id).length; return a; }, {} as Record<string, number>);
  const taxaVendas = leads.length > 0 ? Math.round((vendaCounts.convertido / leads.length) * 100) : 0;
  const taxaCap = captacoes.length > 0 ? Math.round((capCounts.captado / captacoes.length) * 100) : 0;

  // ── Stage changes from modals ──
  function handleLeadStageChange(id: string, newStatus: Lead["status"]) {
    setLeads((p) => p.map((l) => l.id === id ? { ...l, status: newStatus } : l));
    setSelectedLead((prev) => prev && prev.id === id ? { ...prev, status: newStatus } : prev);
    updateLeadStatus(id, newStatus);
  }

  function handleCapStageChange(id: string, newStatus: Captacao["status"]) {
    setCaptacoes((p) => p.map((c) => c.id === id ? { ...c, status: newStatus } : c));
    setSelectedCap((prev) => prev && prev.id === id ? { ...prev, status: newStatus } : prev);
    updateCaptacaoStatus(id, newStatus);
  }

  if (loading) {
    return (
      <CorretorLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Meu Pipeline</h1>
            <p className="text-sm text-muted-foreground">Arraste os cards para avançar no funil</p>
          </div>
          {tab === "captacao" && (
            <button
              onClick={() => setShowNovaCap(true)}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Novo
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
          {(["vendas", "captacao"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "vendas" ? <><Users className="h-3.5 w-3.5" />Vendas</> : <><Target className="h-3.5 w-3.5" />Captação</>}
            </button>
          ))}
        </div>

        {/* Stats */}
        {tab === "vendas" ? (
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Total" value={leads.length} color="bg-blue-50 text-blue-900" />
            <Stat label="Convertidos" value={vendaCounts.convertido} color="bg-green-50 text-green-900" />
            <Stat label="Taxa" value={`${taxaVendas}%`} color="bg-violet-50 text-violet-900" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Total" value={captacoes.length} color="bg-violet-50 text-violet-900" />
            <Stat label="Captados" value={capCounts.captado} color="bg-green-50 text-green-900" />
            <Stat label="Taxa" value={`${taxaCap}%`} color="bg-amber-50 text-amber-900" />
          </div>
        )}

        {/* Mini funnel */}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">Progresso:</span>
          <MiniFunnel
            cols={tab === "vendas" ? VENDAS_COLS : CAPTACAO_COLS}
            counts={tab === "vendas" ? vendaCounts : capCounts}
          />
        </div>

        {/* Kanban */}
        <div className="flex gap-3 overflow-x-auto pb-4">
          {(tab === "vendas" ? VENDAS_COLS : CAPTACAO_COLS).map((col) => {
            const isLeads = tab === "vendas";
            const items = isLeads
              ? leads.filter((l) => l.status === (col.id as Lead["status"]))
              : captacoes.filter((c) => c.status === (col.id as Captacao["status"]));
            const isOver = isLeads ? dragOverLead === col.id : dragOverCap === col.id;

            return (
              <div
                key={col.id}
                className={`flex-shrink-0 w-[240px] rounded-xl border transition-all ${
                  isOver ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-muted/30"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  isLeads ? setDragOverLead(col.id) : setDragOverCap(col.id);
                }}
                onDragLeave={() => isLeads ? setDragOverLead(null) : setDragOverCap(null)}
                onDrop={(e) => isLeads
                  ? dropLead(e, col.id as Lead["status"])
                  : dropCap(e, col.id as Captacao["status"])
                }
              >
                {/* Column header */}
                <div className="px-3 py-2.5 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                      <h3 className="font-semibold text-xs text-foreground">{col.label}</h3>
                    </div>
                    <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${col.lightBg} ${col.lightText}`}>
                      {items.length}
                    </span>
                  </div>
                </div>

                {/* Cards */}
                <div className="p-1.5 space-y-1.5 min-h-[160px]">
                  {items.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-xs text-muted-foreground italic">
                      Vazio
                    </div>
                  ) : items.map((item) => {
                    const isLead = "nome" in item && "origem" in item;
                    const lead = isLead ? (item as Lead) : null;
                    const cap = !isLead ? (item as Captacao) : null;
                    const urgency = urgencyBorder(item.criado_em);

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => {
                          isDraggingRef.current = true;
                          if (lead) { setDraggedLead(lead.id); }
                          else if (cap) { setDraggedCap(cap.id); }
                          e.dataTransfer.effectAllowed = "move";
                          (e.currentTarget as HTMLElement).style.opacity = "0.5";
                        }}
                        onDragEnd={(e) => {
                          setDraggedLead(null);
                          setDraggedCap(null);
                          setDragOverLead(null);
                          setDragOverCap(null);
                          (e.currentTarget as HTMLElement).style.opacity = "1";
                          // Reset after a tick so click doesn't fire
                          setTimeout(() => { isDraggingRef.current = false; }, 50);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isDraggingRef.current) return;
                          if (lead) setSelectedLead(lead);
                          else if (cap) setSelectedCap(cap);
                        }}
                        className={`group relative cursor-pointer rounded-lg border-l-4 border border-border bg-card p-2.5 shadow-sm transition-all hover:shadow-md hover:border-primary/30 ${urgency} ${
                          (draggedLead === item.id || draggedCap === item.id) ? "opacity-50" : ""
                        }`}
                      >
                        {/* Hover overlay */}
                        <div className="absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <span className="bg-black/60 text-white text-xs font-medium rounded-md px-2 py-1">
                            Ver detalhes
                          </span>
                        </div>

                        {lead ? (
                          <div>
                            <p className="font-semibold text-xs text-foreground truncate">{lead.nome}</p>
                            {lead.negocio_titulo && (
                              <span className="inline-block mt-0.5 rounded-full bg-blue-50 text-blue-700 px-1.5 py-0.5 text-xs font-medium truncate max-w-full">
                                {lead.negocio_titulo}
                              </span>
                            )}
                            {lead.telefone && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span>{lead.telefone}</span>
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{lead.origem.replace(/-/g, " ")}</span>
                              <span className="text-xs text-muted-foreground">{timeAgo(lead.criado_em)}</span>
                            </div>
                          </div>
                        ) : cap ? (
                          <div>
                            <p className="font-semibold text-xs text-foreground truncate">{cap.nome_negocio}</p>
                            {cap.tipo && (
                              <span className="inline-block mt-0.5 rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{cap.tipo}</span>
                            )}
                            {cap.contato_telefone && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3 shrink-0" />
                                <span>{cap.contato_telefone}</span>
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center justify-between">
                              {cap.endereco && <span className="text-xs text-muted-foreground truncate max-w-[120px]">{cap.endereco}</span>}
                              <span className="text-xs text-muted-foreground ml-auto">{timeAgo(cap.criado_em)}</span>
                            </div>
                            {cap.status === "captado" && (
                              <div className="mt-1 flex items-center gap-1 text-xs text-green-600 font-medium">
                                <CheckCircle2 className="h-3 w-3" />
                                Captado!
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStageChange={handleLeadStageChange}
        />
      )}

      {selectedCap && (
        <CaptacaoDetailModal
          cap={selectedCap}
          onClose={() => setSelectedCap(null)}
          onStageChange={handleCapStageChange}
        />
      )}
    </CorretorLayout>
  );
};

export default CorretorPipeline;
