import { useEffect, useState, useRef } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { Users, Phone, Mail, MapPin, Clock, MessageCircle, List, Columns } from "lucide-react";
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

const KANBAN_COLUMNS: { status: Lead["status"]; label: string; color: string; headerBg: string }[] = [
  { status: "novo", label: "Novos", color: "border-blue-300", headerBg: "bg-blue-50 text-blue-700" },
  { status: "em-andamento", label: "Em Andamento", color: "border-amber-300", headerBg: "bg-amber-50 text-amber-700" },
  { status: "convertido", label: "Convertidos", color: "border-green-300", headerBg: "bg-green-50 text-green-700" },
  { status: "perdido", label: "Perdidos", color: "border-red-300", headerBg: "bg-red-50 text-red-700" },
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
}) => (
  <div
    draggable
    onDragStart={(e) => onDragStart(e, lead.id)}
    className="rounded-lg border border-border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing select-none"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm text-foreground truncate">{lead.nome}</p>
        {lead.negocio_titulo && (
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {lead.negocio_titulo}
          </p>
        )}
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
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {timeAgo(lead.criado_em)}
      </span>
    </div>
  </div>
);

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
      className={`flex flex-col rounded-xl border-2 ${column.color} bg-muted/30 min-h-[400px] transition-colors ${isDragOver ? "bg-primary/5" : ""}`}
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
      <div className={`rounded-t-lg px-4 py-2.5 ${column.headerBg} flex items-center justify-between`}>
        <span className="font-semibold text-sm">{column.label}</span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">{leads.length}</span>
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
          <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground">
            Arraste aqui
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
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Meus Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {leads.length} contato{leads.length !== 1 ? "s" : ""} recebido{leads.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por nome, e-mail..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-full sm:w-56"
          />
          <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Users className="h-12 w-12 mb-3 opacity-20" />
          <p className="font-medium">Nenhum lead encontrado</p>
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
        <div className="space-y-3">
          {filtrados.map((lead) => (
            <div
              key={lead.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{lead.nome}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[lead.status]}`}>
                      {STATUS_LABEL[lead.status]}
                    </span>
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
                    <span className="flex items-center gap-1">
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
            </div>
          ))}
        </div>
      )}
    </CorretorLayout>
  );
};

export default CorretorLeads;
