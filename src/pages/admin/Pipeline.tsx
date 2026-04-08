import { useEffect, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import { Loader2, GripVertical, Phone, Mail, Clock, Building2, Store, Megaphone, MessageCircle } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import LeadDetailModal from "@/components/admin/LeadDetailModal";
import { getAllLeads, updateLeadStatus, type Lead } from "@/stores/leadStore";

const PIPELINE_COLUMNS = [
  {
    id: "novo" as const,
    label: "Novos",
    color: "bg-blue-500",
    lightBg: "bg-blue-50",
    lightText: "text-blue-700",
    description: "Leads recém-capturados",
  },
  {
    id: "em-andamento" as const,
    label: "Em Andamento",
    color: "bg-amber-500",
    lightBg: "bg-amber-50",
    lightText: "text-amber-700",
    description: "Corretor em contato",
  },
  {
    id: "convertido" as const,
    label: "Convertidos",
    color: "bg-green-500",
    lightBg: "bg-green-50",
    lightText: "text-green-700",
    description: "Negócio fechado",
  },
  {
    id: "perdido" as const,
    label: "Perdidos",
    color: "bg-red-400",
    lightBg: "bg-red-50",
    lightText: "text-red-700",
    description: "Não converteu",
  },
];

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

const temperatureColors = {
  hot: "bg-red-500",
  warm: "bg-amber-400",
  cold: "bg-slate-300",
};

const Pipeline = () => {
  usePageTitle("Admin - Pipeline");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const fetchLeads = async () => {
    const data = await getAllLeads();
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLead(leadId);
    e.dataTransfer.effectAllowed = "move";
    // Make the drag image semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedLead(null);
    setDragOverColumn(null);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: Lead["status"]) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedLead) return;

    const lead = leads.find((l) => l.id === draggedLead);
    if (!lead || lead.status === newStatus) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === draggedLead ? { ...l, status: newStatus } : l))
    );

    await updateLeadStatus(draggedLead, newStatus);
    setDraggedLead(null);
  };

  const handleStatusChange = async (leadId: string, newStatus: Lead["status"]) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    await updateLeadStatus(leadId, newStatus);
  };

  if (loading) {
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
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Pipeline</h1>
          <p className="mt-1 text-muted-foreground">
            Arraste os leads entre as colunas para atualizar o status
          </p>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map((column) => {
            const columnLeads = leads.filter((l) => l.status === column.id);
            const isOver = dragOverColumn === column.id;

            return (
              <div
                key={column.id}
                className={`flex-shrink-0 w-[300px] rounded-xl border transition-all ${
                  isOver
                    ? "border-primary bg-primary/5 shadow-lg"
                    : "border-border bg-muted/30"
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {/* Column Header */}
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${column.color}`} />
                      <h3 className="font-semibold text-foreground text-sm">
                        {column.label}
                      </h3>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${column.lightBg} ${column.lightText}`}>
                      {columnLeads.length}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {column.description}
                  </p>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[200px]">
                  {columnLeads.length === 0 ? (
                    <div className="flex items-center justify-center h-24 text-xs text-muted-foreground italic">
                      Nenhum lead
                    </div>
                  ) : (
                    columnLeads.map((lead) => {
                      const temp = getTemperature(lead.criado_em);
                      const OrigemIcon = origemIcons[lead.origem] || MessageCircle;

                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onDragEnd={handleDragEnd}
                          onClick={() => setSelectedLead(lead)}
                          className={`group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md hover:border-primary/30 ${
                            draggedLead === lead.id ? "opacity-50" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {/* Drag Handle */}
                            <div className="mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing">
                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>

                            <div className="flex-1 min-w-0">
                              {/* Name + Temperature */}
                              <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${temperatureColors[temp]}`} title={`Lead ${temp}`} />
                                <p className="font-semibold text-sm text-foreground truncate">
                                  {lead.nome}
                                </p>
                              </div>

                              {/* Contact */}
                              <div className="mt-1.5 space-y-1">
                                {lead.email && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Mail className="h-3 w-3" />
                                    <span className="truncate">{lead.email}</span>
                                  </div>
                                )}
                                {lead.telefone && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    <span>{lead.telefone}</span>
                                  </div>
                                )}
                              </div>

                              {/* Interest */}
                              {(lead.negocio_titulo || lead.galeria_nome) && (
                                <p className="mt-1.5 text-xs text-primary font-medium truncate">
                                  {lead.negocio_titulo || lead.galeria_nome}
                                  {lead.espaco_numero && ` — ${lead.espaco_numero}`}
                                </p>
                              )}

                              {/* Footer: Origin + Time */}
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
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={async (newStatus) => {
            await handleStatusChange(selectedLead.id, newStatus);
            setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);
          }}
        />
      )}
    </AdminLayout>
  );
};

export default Pipeline;
