import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Users, RefreshCw, MessageSquare, Search, X } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useSaveWhatsappCampaign, getWhatsappAudienceCount } from "@/hooks/useWhatsappMarketing";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const STATUS_OPTS = ["novo", "em-andamento", "convertido", "perdido"];
const ORIGEM_OPTS = ["contato-negocio", "contato-galeria", "anunciar", "newsletter", "exit-intent", "whatsapp", "chatbot"];
const VARS = ["{{nome}}", "{{primeiro_nome}}", "{{telefone}}"];

type AudienceMode = "filtros" | "especificos";

interface LeadOption {
  id: string;
  nome: string | null;
  telefone: string;
}

export default function WhatsappCampanhaNova() {
  usePageTitle("Nova campanha WhatsApp | Admin");
  const navigate = useNavigate();
  const save = useSaveWhatsappCampaign();

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  // Modo audiência
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("filtros");

  // Filtros
  const [statuses, setStatuses] = useState<string[]>([]);
  const [origens, setOrigens] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");

  // Seleção específica
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<LeadOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<LeadOption[]>([]);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Contagem
  const [audCount, setAudCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const buildFilters = () => {
    if (audienceMode === "especificos" && selectedLeads.length > 0) {
      return { lead_ids: selectedLeads.map((l) => l.id) };
    }
    return {
      statuses: statuses.length ? statuses : undefined,
      origens: origens.length ? origens : undefined,
      tags_any: tagsInput.trim() ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
    };
  };

  const refreshCount = async () => {
    setLoadingCount(true);
    try {
      const n = await getWhatsappAudienceCount(buildFilters());
      setAudCount(n);
    } catch (e: any) {
      toast.error(e.message || "Erro contando audiência");
    } finally {
      setLoadingCount(false);
    }
  };

  // Recontagem automática ao mudar filtros
  useEffect(() => { refreshCount(); }, [statuses, origens, tagsInput, selectedLeads, audienceMode]);

  // Busca de leads com debounce
  useEffect(() => {
    if (audienceMode !== "especificos") return;
    if (!search.trim()) { setSearchResults([]); return; }
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase
          .from("leads")
          .select("id, nome, telefone")
          .or(`nome.ilike.%${search}%,telefone.ilike.%${search}%`)
          .not("telefone", "is", null)
          .neq("telefone", "")
          .limit(20);
        setSearchResults((data || []) as LeadOption[]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [search, audienceMode]);

  const toggleLead = (lead: LeadOption) => {
    setSelectedLeads((prev) =>
      prev.find((l) => l.id === lead.id)
        ? prev.filter((l) => l.id !== lead.id)
        : [...prev, lead]
    );
  };

  const isSelected = (id: string) => selectedLeads.some((l) => l.id === id);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const insertVar = (v: string) => setMessage((m) => m + v);

  const handleSave = async () => {
    if (!name.trim() || !message.trim()) {
      toast.error("Nome e mensagem são obrigatórios");
      return;
    }
    if (audienceMode === "especificos" && selectedLeads.length === 0) {
      toast.error("Selecione ao menos um lead");
      return;
    }
    try {
      const created: any = await save.mutateAsync({
        name: name.trim(),
        message: message.trim(),
        audience_filters: buildFilters(),
        status: "draft",
      });
      toast.success("Campanha criada como rascunho");
      navigate(`/admin/marketing/whatsapp/${created.id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar");
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-5 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/admin/marketing/whatsapp" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-xl font-bold">Nova campanha WhatsApp</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={save.isPending}
            className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Criar como rascunho
          </button>
        </div>

        {/* Conteúdo */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Conteúdo</h2>
          <div className="space-y-1">
            <label className="text-xs font-medium">Nome interno</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Promoção Junho 2026"
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Mensagem</label>
              <div className="flex gap-1 flex-wrap justify-end">
                {VARS.map((v) => (
                  <button key={v} type="button" onClick={() => insertVar(v)}
                    className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-mono text-green-700 hover:bg-green-100">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={"Olá {{primeiro_nome}}! 👋\n\nTemos uma novidade exclusiva pra você."}
              rows={5}
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 resize-y font-mono"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Clique nas variáveis acima para inserir</span>
              <span>{message.length} caracteres</span>
            </div>
          </div>
        </section>

        {/* Preview */}
        {message && (
          <section className="rounded-2xl border border-green-200 bg-green-50/50 p-5">
            <h2 className="font-semibold text-sm text-green-800 mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Preview
            </h2>
            <div className="bg-white rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed shadow-sm border border-green-100 max-w-sm">
              {message
                .replace(/\{\{primeiro_nome\}\}/g, "Sara")
                .replace(/\{\{nome\}\}/g, "Sara Machado")
                .replace(/\{\{telefone\}\}/g, "11953937618")}
            </div>
            <p className="text-[10px] text-green-700 mt-2">* Preview com dados fictícios</p>
          </section>
        )}

        {/* Audiência */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          {/* Header + contagem */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" /> Audiência
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                {loadingCount
                  ? <Loader2 className="h-4 w-4 animate-spin inline" />
                  : <>{audCount ?? "—"} {audienceMode === "especificos" ? "selecionados" : "leads com telefone"}</>}
              </span>
              {audienceMode === "filtros" && (
                <button onClick={refreshCount} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingCount ? "animate-spin" : ""}`} /> Recalcular
                </button>
              )}
            </div>
          </div>

          {/* Toggle modo */}
          <div className="inline-flex rounded-xl border border-border bg-muted p-1 text-xs">
            <button
              onClick={() => setAudienceMode("filtros")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${audienceMode === "filtros" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Por filtros
            </button>
            <button
              onClick={() => setAudienceMode("especificos")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${audienceMode === "especificos" ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Leads específicos
            </button>
          </div>

          {/* Modo: filtros */}
          {audienceMode === "filtros" && (
            <div className="space-y-4">
              <p className="text-[11px] text-muted-foreground">
                Apenas leads com telefone são incluídos. Sem filtros = todos os leads.
              </p>
              <FilterChips label="Status do lead" options={STATUS_OPTS} selected={statuses}
                onToggle={(v) => setStatuses(toggle(statuses, v))} />
              <FilterChips label="Origem do lead" options={ORIGEM_OPTS} selected={origens}
                onToggle={(v) => setOrigens(toggle(origens, v))} />
              <div className="space-y-1">
                <label className="text-xs font-medium">Tags (separadas por vírgula)</label>
                <input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="vip, newsletter"
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                />
              </div>
            </div>
          )}

          {/* Modo: leads específicos */}
          {audienceMode === "especificos" && (
            <div className="space-y-3">
              {/* Chips de selecionados */}
              {selectedLeads.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedLeads.map((l) => (
                    <span
                      key={l.id}
                      className="inline-flex items-center gap-1 rounded-full bg-green-100 border border-green-300 px-2.5 py-1 text-xs font-medium text-green-800"
                    >
                      {l.nome || l.telefone}
                      <button onClick={() => toggleLead(l)} className="hover:text-green-600 ml-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => setSelectedLeads([])}
                    className="text-[10px] text-muted-foreground hover:text-destructive ml-1"
                  >
                    Limpar tudo
                  </button>
                </div>
              )}

              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou telefone..."
                  className="w-full rounded-xl border border-border bg-muted pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20"
                />
                {searching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Resultados */}
              {search.trim() && searchResults.length === 0 && !searching && (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhum lead encontrado</p>
              )}
              {searchResults.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((lead) => {
                    const selected = isSelected(lead.id);
                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => toggleLead(lead)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left border-b border-border last:border-0 transition-colors ${
                          selected ? "bg-green-50 text-green-800" : "hover:bg-muted"
                        }`}
                      >
                        <div>
                          <span className="font-medium">{lead.nome || "—"}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{lead.telefone}</span>
                        </div>
                        {selected && <span className="text-green-600 text-xs font-semibold">✓ selecionado</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedLeads.length === 0 && !search.trim() && (
                <p className="text-[11px] text-muted-foreground">
                  Digite o nome ou telefone para buscar e selecionar os leads que vão receber a mensagem.
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function FilterChips({ label, options, selected, onToggle }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button key={o} type="button" onClick={() => onToggle(o)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active ? "bg-green-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}>
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
