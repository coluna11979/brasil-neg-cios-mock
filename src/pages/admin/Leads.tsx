import { useState, useMemo, useEffect } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Search,
  Mail,
  Phone,
  Clock,
  Building2,
  Store,
  Megaphone,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import { getAllLeads, updateLeadStatus, calculateLeadScore, getScoreLabel, type Lead } from "@/stores/leadStore";

const statusColors: Record<string, string> = {
  novo: "bg-blue-100 text-blue-700",
  "em-andamento": "bg-amber-100 text-amber-700",
  convertido: "bg-green-100 text-green-700",
  perdido: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  novo: "Novo",
  "em-andamento": "Em andamento",
  convertido: "Convertido",
  perdido: "Perdido",
};

const origemIcons: Record<string, typeof Building2> = {
  "contato-negocio": Building2,
  "contato-galeria": Store,
  anunciar: Megaphone,
};

const origemLabels: Record<string, string> = {
  "contato-negocio": "Negócio",
  "contato-galeria": "Galeria",
  anunciar: "Anunciante",
  newsletter: "Newsletter",
  "exit-intent": "Exit Intent",
  whatsapp: "Chatbot",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const Leads = () => {
  usePageTitle("Admin - Leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [origemFilter, setOrigemFilter] = useState("all");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);

  const fetchLeads = async () => {
    const data = await getAllLeads();
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        if (statusFilter !== "all" && lead.status !== statusFilter) return false;
        if (origemFilter !== "all" && lead.origem !== origemFilter) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            lead.nome.toLowerCase().includes(q) ||
            (lead.email || "").toLowerCase().includes(q) ||
            (lead.telefone || "").includes(q) ||
            (lead.mensagem || "").toLowerCase().includes(q) ||
            (lead.negocio_titulo || "").toLowerCase().includes(q) ||
            (lead.galeria_nome || "").toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => calculateLeadScore(b) - calculateLeadScore(a));
  }, [leads, searchQuery, statusFilter, origemFilter]);

  const handleStatusChange = async (leadId: string, newStatus: Lead["status"]) => {
    await updateLeadStatus(leadId, newStatus);
    await fetchLeads();
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
          <h1 className="font-display text-2xl font-bold text-foreground">
            Gestão de Leads
          </h1>
          <p className="mt-1 text-muted-foreground">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} capturado{leads.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, negócio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="novo">Novo</SelectItem>
              <SelectItem value="em-andamento">Em andamento</SelectItem>
              <SelectItem value="convertido">Convertido</SelectItem>
              <SelectItem value="perdido">Perdido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={origemFilter} onValueChange={setOrigemFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              <SelectItem value="contato-negocio">Negócio</SelectItem>
              <SelectItem value="contato-galeria">Galeria</SelectItem>
              <SelectItem value="anunciar">Anunciante</SelectItem>
              <SelectItem value="newsletter">Newsletter</SelectItem>
              <SelectItem value="exit-intent">Exit Intent</SelectItem>
              <SelectItem value="whatsapp">Chatbot</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leads Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-12 gap-4 border-b border-border bg-muted/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-3">Lead</div>
            <div className="col-span-2">Interesse</div>
            <div className="col-span-2">Origem</div>
            <div className="col-span-2">Data</div>
            <div className="col-span-1">Score</div>
            <div className="col-span-2">Status</div>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="px-5 py-12 text-center text-muted-foreground">
              {leads.length === 0
                ? "Nenhum lead capturado ainda. Os leads aparecerão aqui quando alguém entrar em contato."
                : "Nenhum lead encontrado com os filtros aplicados."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLeads.map((lead) => {
                const OrigemIcon = origemIcons[lead.origem] || Building2;
                const isExpanded = expandedLead === lead.id;

                return (
                  <div key={lead.id}>
                    <button
                      type="button"
                      onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                      className="w-full text-left md:grid md:grid-cols-12 md:gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                    >
                      {/* Lead info */}
                      <div className="md:col-span-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                          {lead.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{lead.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                        </div>
                      </div>

                      {/* Interest */}
                      <div className="md:col-span-2 mt-2 md:mt-0 flex items-center">
                        <p className="text-sm text-muted-foreground truncate">
                          {lead.negocio_titulo || lead.galeria_nome || "Contato geral"}
                          {lead.espaco_numero && ` - ${lead.espaco_numero}`}
                        </p>
                      </div>

                      {/* Origin */}
                      <div className="md:col-span-2 mt-2 md:mt-0 flex items-center gap-1.5">
                        <OrigemIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{origemLabels[lead.origem] || lead.origem}</span>
                      </div>

                      {/* Date */}
                      <div className="md:col-span-2 mt-2 md:mt-0 flex items-center">
                        <span className="text-sm text-muted-foreground">{formatDate(lead.criado_em)}</span>
                      </div>

                      {/* Score */}
                      <div className="md:col-span-1 mt-2 md:mt-0 flex items-center">
                        {(() => {
                          const score = calculateLeadScore(lead);
                          const { label, color } = getScoreLabel(score);
                          return (
                            <div className="flex flex-col items-start gap-0.5">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${color}`}>{label}</span>
                              <span className="text-[10px] text-muted-foreground">{score}pts</span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Status */}
                      <div className="md:col-span-2 mt-2 md:mt-0 flex items-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[lead.status] || "bg-gray-100 text-gray-700"}`}>
                          {statusLabels[lead.status] || lead.status}
                        </span>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 px-5 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                              Contato
                            </h4>
                            <div className="space-y-2">
                              {lead.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                                    {lead.email}
                                  </a>
                                </div>
                              )}
                              {lead.telefone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <a href={`tel:${lead.telefone}`} className="text-primary hover:underline">
                                    {lead.telefone}
                                  </a>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {formatDate(lead.criado_em)}
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                              Mensagem
                            </h4>
                            <p className="text-sm text-foreground leading-relaxed">
                              {lead.mensagem || "Sem mensagem"}
                            </p>
                          </div>
                        </div>

                        {/* Status change */}
                        <div className="mt-4 flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground mr-2">Alterar status:</span>
                          {(["novo", "em-andamento", "convertido", "perdido"] as const).map((s) => (
                            <button
                              key={s}
                              onClick={() => handleStatusChange(lead.id, s)}
                              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                lead.status === s
                                  ? statusColors[s] + " ring-2 ring-offset-1 ring-current"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                            >
                              {statusLabels[s]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Leads;
