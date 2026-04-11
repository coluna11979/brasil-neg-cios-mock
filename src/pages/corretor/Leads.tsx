import { useEffect, useState, useRef } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { Users, Phone, Mail, MapPin, Clock, MessageCircle, List, Columns, Search, X, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { getAllLeads, updateLeadStatus, type Lead } from "@/stores/leadStore";
import { Button } from "@/components/ui/button";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  return `${days} dias atrás`;
}

function isUrgent(dateStr: string, status: Lead["status"]): boolean {
  if (status !== "novo") return false;
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  return days > 3;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const STATUS_STYLE: Record<Lead["status"], string> = {
  "novo": "bg-blue-100 text-blue-700",
  "em-andamento": "bg-amber-100 text-amber-700",
  "convertido": "bg-green-100 text-green-700",
  "perdido": "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<Lead["status"], string> = {
  "novo": "Novo",
  "em-andamento": "Em andamento",
  "convertido": "Convertido",
  "perdido": "Perdido",
};

const STATUS_BORDER_LEFT: Record<Lead["status"], string> = {
  "novo": "border-l-blue-400",
  "em-andamento": "border-l-amber-400",
  "convertido": "border-l-green-400",
  "perdido": "border-l-red-400",
};

const STATUS_AVATAR_BG: Record<Lead["status"], string> = {
  "novo": "bg-blue-100 text-blue-700",
  "em-andamento": "bg-amber-100 text-amber-700",
  "convertido": "bg-green-100 text-green-700",
  "perdido": "bg-red-100 text-red-700",
};

const KANBAN_COLUMNS: { status: Lead["status"]; label: string; color: string; headerBg: string; badgeBg: string; emptyBorder: string }[] = [
  {
    status: "novo",
    label: "Novos",
    color: "border-blue-300",
    headerBg: "bg-blue-50 text-blue-700",
    badgeBg: "bg-blue-200 text-blue-800",
    emptyBorder: "border-blue-200 text-blue-400",
  },
  {
    status: "em-andamento",
    label: "Em Andamento",
    color: "border-amber-300",
    headerBg: "bg-amber-50 text-amber-700",
    badgeBg: "bg-amber-200 text-amber-800",
    emptyBorder: "border-amber-200 text-amber-400",
  },
  {
    status: "convertido",
    label: "Convertidos",
    color: "border-green-300",
    headerBg: "bg-green-50 text-green-700",
    badgeBg: "bg-green-200 text-green-800",
    emptyBorder: "border-green-200 text-green-400",
  },
  {
    status: "perdido",
    label: "Perdidos",
    color: "border-red-300",
    headerBg: "bg-red-50 text-red-700",
    badgeBg: "bg-red-200 text-red-800",
    emptyBorder: "border-red-200 text-red-400",
  },
];

// ---- Kanban Card ----
const KanbanCard = ({
  lead,
  onDragStart,
  onNavigate,
}: {
  lead: Lead;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onNavigate: () => void;
}) => {
  const urgent = isUrgent(lead.criado_em, lead.status);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className={`rounded-lg border border-border border-l-4 ${STATUS_BORDER_LEFT[lead.status]} bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing select-none transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Avatar + Name */}
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div
            className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${STATUS_AVATAR_BG[lead.status]}`}
          >
            {getInitials(lead.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-semibold text-sm text-foreground truncate">{lead.nome}</p>
              {urgent && (
                <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 shrink-0">
                  <Zap className="h-2.5 w-2.5" />
                  Urgente
                </span>
              )}
            </div>
            {lead.negocio_titulo && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {lead.negocio_titulo}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onNavigate}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Ver mensagens"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {lead.telefone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {lead.telefone}
          </span>
        )}
        {lead.email && (
          <span className="flex items-center gap-1 truncate">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[120px]">{lead.email}</span>
          </span>
        )}
      </div>

      {lead.mensagem && (
        <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5 line-clamp-2">
          "{lead.mensagem}"
        </p>
      )}

      <div className="mt-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Clock className="h-3 w-3" />
          {timeAgo(lead.criado_em)}
        </span>
      </div>
    </div>
  );
};

// ---- Kanban Column ----
const KanbanColumn = ({
  column,
  leads,
  onDragStart,
  onDragOver,
  onDrop,
  onNavigate,
}: {
  column: (typeof KANBAN_COLUMNS)[0];
  leads: Lead[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: Lead["status"]) => void;
  onNavigate: () => void;
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      className={`flex flex-col rounded-xl border-2 ${column.color} bg-muted/30 min-h-[400px] transition-colors ${isDragOver ? "bg-primary/5 scale-[1.01]" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
        onDragOver(e);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        setIsDragOver(false);
        onDrop(e, column.status);
      }}
    >
      {/* Column header with count badge */}
      <div className={`rounded-t-lg px-4 py-2.5 ${column.headerBg} flex items-center justify-between`}>
        <span className="font-bold text-sm tracking-wide">{column.label}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${column.badgeBg}`}>
          {leads.length}
        </span>
      </div>

      <div className="flex-1 space-y-2 p-3">
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onDragStart={onDragStart}
            onNavigate={onNavigate}
          />
        ))}
        {leads.length === 0 && (
          <div
            className={`flex flex-col h-24 items-center justify-center rounded-lg border-2 border-dashed gap-1 ${column.emptyBorder}`}
          >
            <Columns className="h-4 w-4 opacity-40" />
            <span className="text-xs opacity-60">Arraste aqui</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Main Component ----
const CorretorLeads = () => {
  usePageTitle("Meus Leads");
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [viewMode, setViewMode] = useState<"lista" | "kanban">("kanban");
  const dragId = useRef<string | null>(null);

  useEffect(() => {
    getAllLeads().then((data) => {
      setLeads(data);
      setLoading(false);
    });
  }, []);

  const filtrados = leads.filter((l) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      l.nome.toLowerCase().includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.telefone?.toLowerCase().includes(q) ||
      l.negocio_titulo?.toLowerCase().includes(q)
    );
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: Lead["status"]) => {
    e.preventDefault();
    if (!dragId.current) return;
    const id = dragId.current;
    dragId.current = null;

    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === targetStatus) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: targetStatus } : l))
    );

    try {
      await updateLeadStatus(id, targetStatus);
    } catch {
      // Revert on error
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: lead.status } : l)));
    }
  };

  return (
    <CorretorLayout>
      {/* Page Header Card */}
      <div className="mb-5 rounded-2xl bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-foreground">Meus Leads</h1>
              <span className="rounded-full bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5">
                {leads.length}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {leads.length} contato{leads.length !== 1 ? "s" : ""} recebido{leads.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("lista")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === "lista" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
            title="Visualização lista"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${viewMode === "kanban" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
            title="Visualização Kanban"
          >
            <Columns className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail, negócio..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-lg border border-border bg-card pl-9 pr-9 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {busca && (
          <Button variant="ghost" size="sm" onClick={() => setBusca("")} className="text-muted-foreground shrink-0">
            Limpar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-20" />
          <p className="font-medium">Nenhum lead encontrado</p>
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              column={col}
              leads={filtrados.filter((l) => l.status === col.status)}
              onDragStart={handleDragStart}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onNavigate={() => navigate("/corretor/mensagens")}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden shadow-sm">
          {filtrados.map((lead, idx) => (
            <div
              key={lead.id}
              className={`flex items-start justify-between gap-3 px-4 py-4 border-b border-border last:border-b-0 transition-colors hover:bg-muted/30 ${idx % 2 === 0 ? "bg-card" : "bg-muted/10"}`}
            >
              {/* Avatar */}
              <div
                className={`shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${STATUS_AVATAR_BG[lead.status]}`}
              >
                {getInitials(lead.nome)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{lead.nome}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[lead.status]}`}>
                    {STATUS_LABEL[lead.status]}
                  </span>
                  {isUrgent(lead.criado_em, lead.status) && (
                    <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">
                      <Zap className="h-2.5 w-2.5" />
                      Urgente
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {lead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {lead.email}
                    </span>
                  )}
                  {lead.telefone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {lead.telefone}
                    </span>
                  )}
                  {lead.negocio_titulo && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {lead.negocio_titulo}
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    {timeAgo(lead.criado_em)}
                  </span>
                </div>

                {lead.mensagem && (
                  <p className="mt-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 line-clamp-2">
                    "{lead.mensagem}"
                  </p>
                )}
              </div>

              <Button
                size="sm"
                variant="outline"
                className="shrink-0 gap-1.5"
                onClick={() => navigate("/corretor/mensagens")}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Mensagens
              </Button>
            </div>
          ))}
        </div>
      )}
    </CorretorLayout>
  );
};

export default CorretorLeads;
