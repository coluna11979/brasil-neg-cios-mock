import { useState, useMemo, useEffect } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Search, Mail, Phone, Clock, Building2, Store, Megaphone,
  Loader2, UserPlus, X, CheckCircle2, Sparkles, Users,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  getAllLeads, updateLeadStatus, calculateLeadScore,
  getScoreLabel, assignLead, type Lead,
} from "@/stores/leadStore";
import { supabase } from "@/lib/supabase";
import { callClaude } from "@/lib/anthropic";

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
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

interface Corretor { id: string; nome: string; telefone?: string; bairro?: string; regiao?: string; }

// ─── Modal Atribuir ───────────────────────────────────────────────────────────
function AtribuirModal({ lead, corretores, onClose, onAssigned }: {
  lead: Lead;
  corretores: Corretor[];
  onClose: () => void;
  onAssigned: (leadId: string, corretorId: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [aiRecomendado, setAiRecomendado] = useState<string | null>(null);
  const [aiJustificativa, setAiJustificativa] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (corretores.length === 0) return;
    setAiLoading(true);
    const corretoresInfo = corretores.map((c) =>
      `ID: ${c.id} | Nome: ${c.nome}${c.bairro ? ` | Bairro: ${c.bairro}` : ""}${c.regiao ? ` | Região: ${c.regiao}` : ""}`
    ).join("\n");
    const prompt = `Você é um assistente de distribuição de leads imobiliários/comerciais.

Lead chegou com os seguintes dados:
- Nome: ${lead.nome}
- Mensagem: ${lead.mensagem || "sem mensagem"}
- Negócio de interesse: ${lead.negocio_titulo || lead.galeria_nome || "não especificado"}
- Origem: ${lead.origem}

Corretores disponíveis:
${corretoresInfo}

Com base na localização, perfil do lead e área de atuação de cada corretor, qual deles tem maior chance de conversão?

Responda APENAS no formato JSON:
{"id": "UUID_DO_CORRETOR_RECOMENDADO", "motivo": "frase curta de justificativa (máx 80 chars)"}`;

    callClaude(prompt)
      .then((res) => {
        try {
          const json = JSON.parse(res.replace(/```json\n?|```/g, "").trim());
          if (json.id && corretores.find((c) => c.id === json.id)) {
            setAiRecomendado(json.id);
            setAiJustificativa(json.motivo || "");
          }
        } catch { /* ignore parse errors */ }
      })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, []);

  const handleAssign = async () => {
    if (!selected) return;
    setLoading(true);
    const { ok } = await assignLead(lead.id, selected);
    setLoading(false);
    if (ok) {
      setDone(true);
      setTimeout(() => {
        onAssigned(lead.id, selected);
        onClose();
      }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display font-bold text-foreground">Atribuir Lead</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{lead.nome} — {lead.negocio_titulo || "Contato geral"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-7 w-7 text-green-600" />
            </div>
            <p className="font-semibold text-foreground">Lead atribuído!</p>
            <p className="text-sm text-muted-foreground text-center px-6">
              Corretor notificado via WhatsApp com sugestão de mensagem preparada pela IA ✨
            </p>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-3">
              <p className="text-sm text-muted-foreground">Selecione o corretor que vai atender este lead:</p>

              {/* AI loading */}
              {aiLoading && (
                <div className="flex items-center gap-2 rounded-lg bg-violet-50 border border-violet-200 px-3 py-2 text-xs text-violet-700">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                  IA analisando melhor corretor...
                </div>
              )}

              {/* AI recommendation justification */}
              {!aiLoading && aiRecomendado && aiJustificativa && (
                <div className="flex items-start gap-2 rounded-lg bg-violet-50 border border-violet-200 px-3 py-2.5">
                  <Sparkles className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-violet-700"><strong>IA recomenda:</strong> {aiJustificativa}</p>
                </div>
              )}

              {corretores.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">Nenhum corretor ativo encontrado.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {[...corretores].sort((a, b) => (b.id === aiRecomendado ? 1 : 0) - (a.id === aiRecomendado ? 1 : 0)).map((c) => {
                    const isRecomendado = c.id === aiRecomendado;
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 cursor-pointer rounded-xl border-2 px-4 py-3 transition-all ${
                          selected === c.id
                            ? "border-primary bg-primary/5"
                            : isRecomendado
                            ? "border-violet-400 bg-violet-50 hover:border-violet-500"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          checked={selected === c.id}
                          onChange={() => setSelected(c.id)}
                        />
                        <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selected === c.id ? "border-primary" : isRecomendado ? "border-violet-500" : "border-muted-foreground"
                        }`}>
                          {selected === c.id && <div className="h-2 w-2 rounded-full bg-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-foreground">{c.nome}</p>
                            {isRecomendado && (
                              <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                                <Sparkles className="h-2.5 w-2.5" /> IA Recomenda
                              </span>
                            )}
                          </div>
                          {(c.bairro || c.telefone) && (
                            <p className="text-xs text-muted-foreground">
                              {[c.bairro, c.telefone].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {!aiLoading && !aiRecomendado && (
                <div className="rounded-lg bg-violet-50 border border-violet-200 px-3 py-2.5 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-violet-700">
                    A IA vai gerar automaticamente uma sugestão de primeira mensagem para o corretor usar no CRM.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-border px-5 py-4">
              <button onClick={onClose} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button
                disabled={!selected || loading}
                onClick={handleAssign}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Atribuindo...</> : <><UserPlus className="h-4 w-4" />Atribuir Lead</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const Leads = () => {
  usePageTitle("Admin - Leads");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [origemFilter, setOrigemFilter] = useState("all");
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [tab, setTab] = useState<"sem-corretor" | "atribuidos" | "todos">("sem-corretor");
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [assignModal, setAssignModal] = useState<Lead | null>(null);

  const fetchLeads = async () => {
    const data = await getAllLeads();
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
    supabase
      .from("profiles")
      .select("id, nome, telefone, bairro, regiao")
      .eq("role", "corretor")
      .eq("ativo", true)
      .then(({ data }) => setCorretores((data as Corretor[]) || []));
  }, []);

  const tabLeads = useMemo(() => {
    if (tab === "sem-corretor") return leads.filter((l) => !l.corretor_id);
    if (tab === "atribuidos") return leads.filter((l) => !!l.corretor_id);
    return leads;
  }, [leads, tab]);

  const filteredLeads = useMemo(() => {
    return tabLeads
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
  }, [tabLeads, searchQuery, statusFilter, origemFilter]);

  const handleStatusChange = async (leadId: string, newStatus: Lead["status"]) => {
    await updateLeadStatus(leadId, newStatus);
    setLeads((p) => p.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));
  };

  const handleAssigned = (leadId: string, corretorId: string) => {
    setLeads((p) => p.map((l) => l.id === leadId ? { ...l, corretor_id: corretorId } : l));
  };

  const semCorretor = leads.filter((l) => !l.corretor_id).length;
  const comCorretor = leads.filter((l) => !!l.corretor_id).length;

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
          <h1 className="font-display text-2xl font-bold text-foreground">Gestão de Leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {leads.length} lead{leads.length !== 1 ? "s" : ""} · {semCorretor} aguardando atribuição
          </p>
        </div>

        {/* Alerta de pendentes */}
        {semCorretor > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <Users className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-sm text-amber-800">
              <strong>{semCorretor} lead{semCorretor !== 1 ? "s" : ""}</strong> aguardando atribuição a um corretor
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-muted p-1 w-fit">
          {([
            { id: "sem-corretor", label: "Sem Corretor", badge: semCorretor, urgent: semCorretor > 0 },
            { id: "atribuidos", label: "Atribuídos", badge: comCorretor, urgent: false },
            { id: "todos", label: "Todos", badge: leads.length, urgent: false },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                tab === t.id
                  ? t.urgent ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                  : "bg-muted-foreground/20 text-muted-foreground"
              }`}>
                {t.badge}
              </span>
            </button>
          ))}
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

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 border-b border-border bg-muted/50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="col-span-3">Lead</div>
            <div className="col-span-2">Interesse</div>
            <div className="col-span-2">Origem</div>
            <div className="col-span-2">Data</div>
            <div className="col-span-1">Score</div>
            <div className="col-span-2">Status / Ação</div>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="px-5 py-12 text-center text-muted-foreground">
              {tab === "sem-corretor"
                ? "🎉 Todos os leads estão atribuídos!"
                : "Nenhum lead encontrado com os filtros aplicados."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredLeads.map((lead) => {
                const OrigemIcon = origemIcons[lead.origem] || Building2;
                const isExpanded = expandedLead === lead.id;
                const semCorretor = !lead.corretor_id;

                return (
                  <div key={lead.id} className={semCorretor ? "bg-amber-50/30" : ""}>
                    <button
                      type="button"
                      onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                      className="w-full text-left md:grid md:grid-cols-12 md:gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="md:col-span-3 flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                          {lead.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{lead.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                        </div>
                      </div>

                      <div className="md:col-span-2 mt-2 md:mt-0 flex items-center">
                        <p className="text-sm text-muted-foreground truncate">
                          {lead.negocio_titulo || lead.galeria_nome || "Contato geral"}
                        </p>
                      </div>

                      <div className="md:col-span-2 mt-2 md:mt-0 flex items-center gap-1.5">
                        <OrigemIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{origemLabels[lead.origem] || lead.origem}</span>
                      </div>

                      <div className="md:col-span-2 mt-2 md:mt-0 flex items-center">
                        <span className="text-sm text-muted-foreground">{formatDate(lead.criado_em)}</span>
                      </div>

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

                      <div className="md:col-span-2 mt-2 md:mt-0 flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColors[lead.status] || "bg-gray-100 text-gray-700"}`}>
                          {statusLabels[lead.status] || lead.status}
                        </span>
                        {semCorretor && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                            Sem corretor
                          </span>
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-border bg-muted/20 px-5 py-4 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contato</h4>
                            <div className="space-y-2">
                              {lead.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                  <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
                                </div>
                              )}
                              {lead.telefone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <a href={`tel:${lead.telefone}`} className="text-primary hover:underline">{lead.telefone}</a>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {formatDate(lead.criado_em)}
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Mensagem</h4>
                            <p className="text-sm text-foreground leading-relaxed">{lead.mensagem || "Sem mensagem"}</p>
                          </div>
                        </div>

                        {/* Botão Atribuir */}
                        {semCorretor && (
                          <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 px-4 py-3">
                            <UserPlus className="h-5 w-5 text-amber-600 shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-amber-800">Este lead ainda não tem corretor</p>
                              <p className="text-xs text-amber-600">Atribua a um corretor para ele receber a notificação e a sugestão de mensagem da IA</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setAssignModal(lead); }}
                              className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition-colors shrink-0"
                            >
                              <UserPlus className="h-4 w-4" />
                              Atribuir
                            </button>
                          </div>
                        )}

                        {/* Corretor atual */}
                        {!semCorretor && (
                          <div className="flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-700 font-medium">
                                Atribuído — {corretores.find(c => c.id === lead.corretor_id)?.nome || "corretor"}
                              </span>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setAssignModal(lead); }}
                              className="text-xs text-green-600 hover:underline"
                            >
                              Reatribuir
                            </button>
                          </div>
                        )}

                        {/* Status change */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-muted-foreground mr-1">Alterar status:</span>
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

      {assignModal && (
        <AtribuirModal
          lead={assignModal}
          corretores={corretores}
          onClose={() => setAssignModal(null)}
          onAssigned={handleAssigned}
        />
      )}
    </AdminLayout>
  );
};

export default Leads;
