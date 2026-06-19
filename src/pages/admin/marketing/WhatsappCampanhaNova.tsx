import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Loader2, Users, RefreshCw, MessageSquare,
  Search, X, Filter, UserPlus, Phone, Hash, Tag, Globe, CheckCircle2,
  ChevronRight, ChevronLeft, CheckSquare,
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

const ORIGEM_LABEL: Record<string, string> = Object.fromEntries(ORIGEM_OPTS.map((o) => [o.value, o.label]));
const ORIGEM_ICON: Record<string, string> = Object.fromEntries(ORIGEM_OPTS.map((o) => [o.value, o.icon]));
const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS_OPTS.map((o) => [o.value, o.label]));
const STATUS_COLOR: Record<string, string> = Object.fromEntries(STATUS_OPTS.map((o) => [o.value, o.color]));

function leadSubtitle(lead: LeadOption): string {
  const parts: string[] = [];
  if (lead.origem) {
    const lbl = ORIGEM_LABEL[lead.origem] || lead.origem;
    if (lead.negocio_titulo) parts.push(`${lbl}: ${lead.negocio_titulo}`);
    else if (lead.galeria_nome) parts.push(`${lbl}: ${lead.galeria_nome}`);
    else parts.push(lbl);
  }
  return parts.join(" · ") || "";
}

type AudienceMode = "filtros" | "especificos";

interface LeadOption {
  id: string;
  nome: string | null;
  telefone: string;
  origem?: string | null;
  status?: string | null;
  negocio_titulo?: string | null;
  galeria_nome?: string | null;
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
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [origemCounts, setOrigemCounts] = useState<Record<string, number>>({});

  // Drill-down state for "Selecionar leads"
  type PickerStep = "choose" | "list";
  type PickerSource = { type: "status"; value: string; label: string } | { type: "origem"; value: string; label: string } | { type: "todos"; value: ""; label: string };
  const [pickerStep, setPickerStep] = useState<PickerStep>("choose");
  const [pickerSource, setPickerSource] = useState<PickerSource | null>(null);
  const [pickerLeads, setPickerLeads] = useState<LeadOption[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

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
    (async () => {
      const { data } = await supabase
        .from("leads")
        .select("status, origem")
        .not("telefone", "is", null)
        .neq("telefone", "");
      if (!data) return;
      const sc: Record<string, number> = {};
      const oc: Record<string, number> = {};
      for (const row of data) {
        const s = row.status || "novo";
        sc[s] = (sc[s] || 0) + 1;
        const o = row.origem || "";
        if (o) oc[o] = (oc[o] || 0) + 1;
      }
      setStatusCounts(sc);
      setOrigemCounts(oc);
    })();
  }, []);

  useEffect(() => {
    if (audienceMode !== "especificos") return;
    if (!search.trim()) { setSearchResults([]); return; }
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await supabase
          .from("leads")
          .select("id, nome, telefone, origem, status, negocio_titulo, galeria_nome")
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

  const openPickerCategory = async (source: PickerSource) => {
    setPickerSource(source);
    setPickerStep("list");
    setPickerLoading(true);
    try {
      let query = supabase.from("leads").select("id, nome, telefone, origem, status, negocio_titulo, galeria_nome").not("telefone", "is", null).neq("telefone", "");
      if (source.type === "status") query = query.eq("status", source.value);
      else if (source.type === "origem") query = query.eq("origem", source.value);
      const { data } = await query.order("nome", { ascending: true }).limit(200);
      setPickerLeads((data || []) as LeadOption[]);
    } finally {
      setPickerLoading(false);
    }
  };

  const selectAllPicker = () => {
    const toAdd = pickerLeads.filter((l) => !isSelected(l.id));
    if (toAdd.length) setSelectedLeads((prev) => [...prev, ...toAdd]);
  };

  const deselectAllPicker = () => {
    const ids = new Set(pickerLeads.map((l) => l.id));
    setSelectedLeads((prev) => prev.filter((l) => !ids.has(l.id)));
  };

  const pickerSelectedCount = pickerLeads.filter((l) => isSelected(l.id)).length;

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
                      const cnt = statusCounts[o.value] || 0;
                      return (
                        <button key={o.value} type="button" onClick={() => setStatuses(toggle(statuses, o.value))}
                          className={`flex items-center gap-2.5 rounded-xl border-2 px-3.5 py-2.5 text-xs font-medium transition-all ${
                            active
                              ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                              : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                          }`}>
                          <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-green-500" : o.color} shrink-0`} />
                          <span className="flex-1 text-left">{o.label}</span>
                          <span className={`min-w-[20px] text-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                            active ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                          }`}>{cnt}</span>
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
                      const cnt = origemCounts[o.value] || 0;
                      return (
                        <button key={o.value} type="button" onClick={() => setOrigens(toggle(origens, o.value))}
                          className={`flex items-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-xs font-medium transition-all ${
                            active
                              ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                              : "border-border bg-card text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                          }`}>
                          <span className="text-sm">{o.icon}</span>
                          <span className="flex-1 text-left">{o.label}</span>
                          <span className={`min-w-[20px] text-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                            active ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                          }`}>{cnt}</span>
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

                {/* STEP 1: Escolher categoria */}
                {pickerStep === "choose" && (
                  <div className="space-y-4">
                    {/* Busca rápida */}
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Busca rápida por nome ou telefone..."
                        className="w-full rounded-xl border border-border bg-background pl-10 pr-10 py-3 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500/10 transition-all"
                      />
                      {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-green-500" />}
                    </div>

                    {/* Search results inline */}
                    {search.trim() && searchResults.length === 0 && !searching && (
                      <div className="rounded-xl border border-dashed border-border p-4 text-center">
                        <p className="text-xs text-muted-foreground">Nenhum lead para "{search}"</p>
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div className="rounded-xl border border-border overflow-hidden max-h-56 overflow-y-auto shadow-sm">
                        {searchResults.map((lead, i) => {
                          const selected = isSelected(lead.id);
                          const sub = leadSubtitle(lead);
                          return (
                            <button key={lead.id} type="button" onClick={() => toggleLead(lead)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                                i > 0 ? "border-t border-border" : ""
                              } ${selected ? "bg-green-50" : "hover:bg-muted/50"}`}>
                              <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shrink-0 ${
                                selected ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                              }`}>
                                {selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : (lead.nome || "?")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-medium truncate ${selected ? "text-green-700" : ""}`}>{lead.nome || "—"}</p>
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <span>{lead.telefone}</span>
                                  {sub && <><span className="text-border">·</span><span className="truncate">{lead.origem && ORIGEM_ICON[lead.origem] ? `${ORIGEM_ICON[lead.origem]} ` : ""}{sub}</span></>}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Categorias — só aparece quando não está buscando */}
                    {!search.trim() && (
                      <>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ou selecione por categoria</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>

                        {/* Todos */}
                        <button type="button"
                          onClick={() => openPickerCategory({ type: "todos", value: "", label: "Todos os leads" })}
                          className="w-full flex items-center gap-3 rounded-xl border-2 border-border px-4 py-3.5 hover:border-green-400 hover:bg-green-50/30 transition-all group">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600 group-hover:bg-green-500 group-hover:text-white transition-colors">
                            <Users className="h-5 w-5" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-foreground">Todos os leads</p>
                            <p className="text-[11px] text-muted-foreground">{Object.values(statusCounts).reduce((a, b) => a + b, 0)} leads com telefone</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-green-500 transition-colors" />
                        </button>

                        {/* Por Status */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Por status</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {STATUS_OPTS.map((o) => {
                              const cnt = statusCounts[o.value] || 0;
                              return (
                                <button key={o.value} type="button"
                                  onClick={() => cnt > 0 && openPickerCategory({ type: "status", value: o.value, label: o.label })}
                                  disabled={cnt === 0}
                                  className={`flex items-center gap-3 rounded-xl border-2 border-border px-3.5 py-3 transition-all group ${
                                    cnt > 0 ? "hover:border-green-400 hover:bg-green-50/30 cursor-pointer" : "opacity-40 cursor-not-allowed"
                                  }`}>
                                  <span className={`h-3 w-3 rounded-full ${o.color} shrink-0`} />
                                  <span className="flex-1 text-left text-sm font-medium text-foreground">{o.label}</span>
                                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground tabular-nums">{cnt}</span>
                                  {cnt > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-green-500 transition-colors" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Por Origem */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Por origem</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {ORIGEM_OPTS.map((o) => {
                              const cnt = origemCounts[o.value] || 0;
                              return (
                                <button key={o.value} type="button"
                                  onClick={() => cnt > 0 && openPickerCategory({ type: "origem", value: o.value, label: o.label })}
                                  disabled={cnt === 0}
                                  className={`flex items-center gap-2 rounded-xl border-2 border-border px-3 py-2.5 transition-all group ${
                                    cnt > 0 ? "hover:border-green-400 hover:bg-green-50/30 cursor-pointer" : "opacity-40 cursor-not-allowed"
                                  }`}>
                                  <span className="text-sm">{o.icon}</span>
                                  <span className="flex-1 text-left text-xs font-medium text-foreground">{o.label}</span>
                                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground tabular-nums">{cnt}</span>
                                  {cnt > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-green-500 transition-colors" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* STEP 2: Lista de leads da categoria */}
                {pickerStep === "list" && pickerSource && (
                  <div className="space-y-3">
                    {/* Voltar + título */}
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => { setPickerStep("choose"); setPickerLeads([]); }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors">
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{pickerSource.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {pickerLoading ? "Carregando..." : `${pickerLeads.length} leads — ${pickerSelectedCount} selecionados`}
                        </p>
                      </div>
                      {!pickerLoading && pickerLeads.length > 0 && (
                        <div className="flex gap-1.5">
                          <button type="button" onClick={selectAllPicker}
                            className="flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-[11px] font-semibold text-green-700 hover:bg-green-100 transition-colors">
                            <CheckSquare className="h-3 w-3" /> Todos
                          </button>
                          {pickerSelectedCount > 0 && (
                            <button type="button" onClick={deselectAllPicker}
                              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-red-500 hover:border-red-200 transition-colors">
                              <X className="h-3 w-3" /> Limpar
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Lista */}
                    {pickerLoading ? (
                      <div className="flex justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                      </div>
                    ) : pickerLeads.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-6 text-center">
                        <p className="text-xs text-muted-foreground">Nenhum lead nesta categoria.</p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border overflow-hidden max-h-80 overflow-y-auto shadow-sm">
                        {pickerLeads.map((lead, i) => {
                          const selected = isSelected(lead.id);
                          const sub = leadSubtitle(lead);
                          const sColor = lead.status ? (STATUS_COLOR[lead.status] || "bg-gray-400") : "";
                          const sLabel = lead.status ? (STATUS_LABEL[lead.status] || lead.status) : "";
                          return (
                            <button key={lead.id} type="button" onClick={() => toggleLead(lead)}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all ${
                                i > 0 ? "border-t border-border" : ""
                              } ${selected ? "bg-green-50" : "hover:bg-muted/50"}`}>
                              <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shrink-0 transition-colors ${
                                selected ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                              }`}>
                                {selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : (lead.nome || "?")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-sm font-medium truncate ${selected ? "text-green-700" : "text-foreground"}`}>
                                  {lead.nome || "—"}
                                </p>
                                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                                  {sub && <span className="truncate max-w-[140px]">{lead.origem && ORIGEM_ICON[lead.origem] ? `${ORIGEM_ICON[lead.origem]} ` : ""}{sub}</span>}
                                  {sub && sLabel && <span className="text-border">·</span>}
                                  {sLabel && (
                                    <span className="flex items-center gap-1">
                                      <span className={`h-1.5 w-1.5 rounded-full ${sColor} shrink-0`} />
                                      {sLabel}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {lead.telefone}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {selectedLeads.length === 0 && pickerStep === "choose" && !search.trim() && (
                  <div className="rounded-xl bg-muted/50 border border-dashed border-border p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      Escolha uma categoria acima ou busque diretamente para selecionar leads.
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
