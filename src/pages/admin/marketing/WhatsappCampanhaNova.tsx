import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Loader2, Users, RefreshCw, MessageSquare,
  Search, X, Filter, UserPlus, Phone, Hash, Tag, Globe, CheckCircle2,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useSaveWhatsappCampaign, getWhatsappAudienceCount } from "@/hooks/useWhatsappMarketing";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const STATUS_OPTS = [
  { value: "novo", label: "Novo", color: "bg-sky-500" },
  { value: "em-andamento", label: "Em andamento", color: "bg-amber-500" },
  { value: "convertido", label: "Convertido", color: "bg-emerald-500" },
  { value: "perdido", label: "Perdido", color: "bg-red-500" },
];
const ORIGEM_OPTS = [
  { value: "contato-negocio", label: "Negócio", icon: "💼" },
  { value: "contato-galeria", label: "Galeria", icon: "🏪" },
  { value: "anunciar", label: "Anúncio", icon: "📢" },
  { value: "newsletter", label: "Newsletter", icon: "📧" },
  { value: "exit-intent", label: "Exit Intent", icon: "🚪" },
  { value: "whatsapp", label: "WhatsApp", icon: "💬" },
  { value: "chatbot", label: "Chatbot", icon: "🤖" },
];
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
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("filtros");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [origens, setOrigens] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<LeadOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<LeadOption[]>([]);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      setAudCount(await getWhatsappAudienceCount(buildFilters()));
    } catch (e: any) {
      toast.error(e.message || "Erro contando audiência");
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => { refreshCount(); }, [statuses, origens, tagsInput, selectedLeads, audienceMode]);

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
    if (!name.trim() || !message.trim()) { toast.error("Nome e mensagem são obrigatórios"); return; }
    if (audienceMode === "especificos" && selectedLeads.length === 0) { toast.error("Selecione ao menos um lead"); return; }
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

  const activeFilterCount = statuses.length + origens.length + (tagsInput.trim() ? 1 : 0);

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-5 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/admin/marketing/whatsapp" className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold">Nova campanha</h1>
              <p className="text-xs text-muted-foreground">WhatsApp Marketing</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={save.isPending}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-green-500/20 hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Criar rascunho
          </button>
        </div>

        {/* Conteúdo */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-500" /> Conteúdo da mensagem
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome interno</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Promoção Junho 2026"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500/10 transition-all"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mensagem</label>
                <div className="flex gap-1">
                  {VARS.map((v) => (
                    <button key={v} type="button" onClick={() => insertVar(v)}
                      className="rounded-lg bg-gradient-to-b from-green-50 to-green-100 border border-green-200/60 px-2.5 py-1 text-[11px] font-mono text-green-700 hover:from-green-100 hover:to-green-150 shadow-sm transition-all">
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
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500/10 resize-y font-mono leading-relaxed transition-all"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Clique nas variáveis para inserir automaticamente</span>
                <span className={`tabular-nums ${message.length > 1000 ? "text-amber-500 font-semibold" : ""}`}>
                  {message.length} caracteres
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Preview */}
        {message && (
          <section className="rounded-2xl overflow-hidden border border-green-200/60">
            <div className="px-5 py-3 bg-gradient-to-r from-green-600 to-green-500 flex items-center gap-2">
              <Phone className="h-4 w-4 text-white/80" />
              <h2 className="font-semibold text-sm text-white">Preview no WhatsApp</h2>
            </div>
            <div className="bg-[#0b141a] p-5">
              <div className="bg-[#005c4b] rounded-lg rounded-tr-none p-3.5 max-w-[85%] ml-auto shadow-lg">
                <p className="text-[13.5px] text-white whitespace-pre-wrap leading-relaxed">
                  {message
                    .replace(/\{\{primeiro_nome\}\}/g, "Sara")
                    .replace(/\{\{nome\}\}/g, "Sara Machado")
                    .replace(/\{\{telefone\}\}/g, "11953937618")
                    .replace(/\*(.*?)\*/g, "⟨b⟩$1⟨/b⟩")
                  }
                </p>
                <p className="text-[10px] text-white/50 text-right mt-1.5">23:19 ✓✓</p>
              </div>
              <p className="text-[10px] text-white/30 text-center mt-3">Preview com dados fictícios</p>
            </div>
          </section>
        )}

        {/* ── AUDIÊNCIA ── */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header com contador */}
          <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-muted/50 to-muted/30 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" /> Audiência
            </h2>
            <div className="flex items-center gap-3">
              {/* Contador animado */}
              <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-1.5 shadow-sm">
                {loadingCount ? (
                  <Loader2 className="h-4 w-4 animate-spin text-green-500" />
                ) : (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                    {audCount ?? 0}
                  </span>
                )}
                <span className="text-xs font-medium text-foreground">
                  {audienceMode === "especificos" ? "selecionados" : "leads"}
                </span>
              </div>
              {audienceMode === "filtros" && (
                <button onClick={refreshCount} className="flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-card hover:bg-muted transition-colors" title="Recalcular">
                  <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loadingCount ? "animate-spin" : ""}`} />
                </button>
              )}
            </div>
          </div>

          <div className="p-5 space-y-5">
            {/* Toggle modo — estilo moderno */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAudienceMode("filtros")}
                className={`relative flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  audienceMode === "filtros"
                    ? "border-green-500 bg-green-50/50 shadow-sm shadow-green-500/10"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  audienceMode === "filtros" ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <Filter className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${audienceMode === "filtros" ? "text-green-700" : "text-foreground"}`}>
                    Por filtros
                  </p>
                  <p className="text-[11px] text-muted-foreground">Status, origem, tags</p>
                </div>
                {audienceMode === "filtros" && (
                  <CheckCircle2 className="absolute top-2.5 right-2.5 h-4 w-4 text-green-500" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setAudienceMode("especificos")}
                className={`relative flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                  audienceMode === "especificos"
                    ? "border-green-500 bg-green-50/50 shadow-sm shadow-green-500/10"
                    : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  audienceMode === "especificos" ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                }`}>
                  <UserPlus className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${audienceMode === "especificos" ? "text-green-700" : "text-foreground"}`}>
                    Selecionar leads
                  </p>
                  <p className="text-[11px] text-muted-foreground">Escolher um a um</p>
                </div>
                {audienceMode === "especificos" && (
                  <CheckCircle2 className="absolute top-2.5 right-2.5 h-4 w-4 text-green-500" />
                )}
              </button>
            </div>

            {/* ── MODO FILTROS ── */}
            {audienceMode === "filtros" && (
              <div className="space-y-5">
                {activeFilterCount > 0 && (
                  <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200/60 px-4 py-2.5">
                    <Filter className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-xs font-medium text-green-700">
                      {activeFilterCount} filtro{activeFilterCount > 1 ? "s" : ""} ativo{activeFilterCount > 1 ? "s" : ""}
                    </span>
                    <button
                      onClick={() => { setStatuses([]); setOrigens([]); setTagsInput(""); }}
                      className="ml-auto text-[11px] text-green-600 hover:text-green-800 font-medium"
                    >
                      Limpar filtros
                    </button>
                  </div>
                )}

                {/* Status */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status do lead</label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {STATUS_OPTS.map((o) => {
                      const active = statuses.includes(o.value);
                      return (
                        <button key={o.value} type="button" onClick={() => setStatuses(toggle(statuses, o.value))}
                          className={`flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-2.5 text-xs font-medium transition-all ${
                            active
                              ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                              : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                          }`}>
                          <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-green-500" : o.color} shrink-0`} />
                          {o.label}
                          {active && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Origem */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origem do lead</label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ORIGEM_OPTS.map((o) => {
                      const active = origens.includes(o.value);
                      return (
                        <button key={o.value} type="button" onClick={() => setOrigens(toggle(origens, o.value))}
                          className={`flex items-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-xs font-medium transition-all ${
                            active
                              ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                              : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                          }`}>
                          <span className="text-sm">{o.icon}</span>
                          {o.label}
                          {active && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</label>
                  </div>
                  <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="vip, newsletter, quente"
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500/10 transition-all"
                  />
                  <p className="text-[11px] text-muted-foreground">Separadas por vírgula. Vazio = ignora tags.</p>
                </div>

                {!activeFilterCount && (
                  <div className="rounded-xl bg-muted/50 border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Sem filtros ativos</span> — todos os {audCount ?? 0} leads com telefone serão incluídos.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── MODO LEADS ESPECÍFICOS ── */}
            {audienceMode === "especificos" && (
              <div className="space-y-4">
                {/* Selecionados */}
                {selectedLeads.length > 0 && (
                  <div className="rounded-xl border border-green-200 bg-green-50/30 p-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {selectedLeads.length} selecionado{selectedLeads.length > 1 ? "s" : ""}
                      </span>
                      <button onClick={() => setSelectedLeads([])}
                        className="text-[11px] text-green-600 hover:text-red-500 font-medium transition-colors">
                        Remover todos
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLeads.map((l) => (
                        <span key={l.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-green-200 px-2.5 py-1.5 text-xs font-medium text-green-800 shadow-sm">
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-green-100 text-[10px] font-bold text-green-600">
                            {(l.nome || "?")[0].toUpperCase()}
                          </span>
                          <span className="max-w-[120px] truncate">{l.nome || l.telefone}</span>
                          <button onClick={() => toggleLead(l)} className="text-green-400 hover:text-red-500 transition-colors ml-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou telefone..."
                    className="w-full rounded-xl border border-border bg-background pl-10 pr-10 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500/10 transition-all"
                  />
                  {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-green-500" />}
                </div>

                {/* Results */}
                {search.trim() && searchResults.length === 0 && !searching && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <Search className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhum lead encontrado para "{search}"</p>
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="rounded-xl border border-border overflow-hidden max-h-72 overflow-y-auto shadow-sm">
                    {searchResults.map((lead, i) => {
                      const selected = isSelected(lead.id);
                      return (
                        <button key={lead.id} type="button" onClick={() => toggleLead(lead)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                            i > 0 ? "border-t border-border" : ""
                          } ${selected
                            ? "bg-green-50"
                            : "hover:bg-muted/50"
                          }`}>
                          <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold shrink-0 ${
                            selected ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                          }`}>
                            {selected ? <CheckCircle2 className="h-4 w-4" /> : (lead.nome || "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium truncate ${selected ? "text-green-700" : "text-foreground"}`}>
                              {lead.nome || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {lead.telefone}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedLeads.length === 0 && !search.trim() && (
                  <div className="rounded-xl bg-muted/50 border border-dashed border-border p-6 text-center">
                    <UserPlus className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Busque e selecione</span> os leads que vão receber a mensagem.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
