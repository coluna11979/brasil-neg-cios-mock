import { useEffect, useRef, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { supabase } from "@/lib/supabase";
import { callClaude } from "@/lib/anthropic";
import { getAllNegocios, formatCurrency, type Negocio } from "@/stores/negocioStore";
import {
  Instagram, MessageCircle, Download, Copy, Check, Loader2,
  Sparkles, ChevronDown, Search, DollarSign, MapPin, TrendingUp,
  Megaphone, RefreshCw, X,
} from "lucide-react";

interface Profile {
  nome: string;
  telefone: string;
  foto_url: string;
  creci: string;
}

// ─── Category colors ──────────────────────────────────────────────────────────
const CAT_COLOR: Record<string, { bg: string; accent: string; icon: string }> = {
  "Alimentação":       { bg: "#0f2820", accent: "#22c55e", icon: "🍽️" },
  "Saúde e Estética":  { bg: "#1a0f28", accent: "#a855f7", icon: "💆" },
  "Serviços":          { bg: "#0f1a28", accent: "#3b82f6", icon: "🔧" },
  "Varejo":            { bg: "#1a1a0f", accent: "#eab308", icon: "🛍️" },
  "Tecnologia":        { bg: "#0f1a28", accent: "#06b6d4", icon: "💻" },
  "Educação":          { bg: "#0f1428", accent: "#6366f1", icon: "📚" },
  "Automotivo":        { bg: "#1a120f", accent: "#f97316", icon: "🚗" },
  "Indústria":         { bg: "#141414", accent: "#94a3b8", icon: "🏭" },
  "Imóveis Comerciais":{ bg: "#0f1a1a", accent: "#14b8a6", icon: "🏢" },
  "Outro":             { bg: "#0d1f3c", accent: "#C49A1E", icon: "💼" },
};
function getCat(cat: string) {
  return CAT_COLOR[cat] || CAT_COLOR["Outro"];
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}
function formatPhone(tel: string) {
  const d = tel?.replace(/\D/g, "") || "";
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return tel;
}

// ─── Template: Post Instagram (360×360) ──────────────────────────────────────
function PostInstagram({ negocio, profile, divRef }: {
  negocio: Negocio; profile: Profile; divRef: React.RefObject<HTMLDivElement>;
}) {
  const cat = getCat(negocio.categoria);
  return (
    <div ref={divRef} style={{
      width: 360, height: 360,
      background: cat.bg,
      borderRadius: 12,
      overflow: "hidden",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      fontFamily: "Arial, Helvetica, sans-serif",
      boxSizing: "border-box",
    }}>
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: `${cat.accent}15` }} />
      <div style={{ position: "absolute", top: -30, right: -30, width: 130, height: 130, borderRadius: "50%", border: `1px solid ${cat.accent}25` }} />
      <div style={{ position: "absolute", bottom: 60, left: -40, width: 140, height: 140, borderRadius: "50%", background: `${cat.accent}08` }} />

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 0", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: cat.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#000" }}>NJ</div>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>NegócioJá</span>
        </div>
        <div style={{ background: `${cat.accent}25`, border: `1px solid ${cat.accent}50`, borderRadius: 20, padding: "3px 10px", fontSize: 9, color: cat.accent, letterSpacing: 0.5 }}>
          {negocio.categoria}
        </div>
      </div>

      {/* Category icon */}
      <div style={{ textAlign: "center", padding: "16px 0 8px", fontSize: 40, zIndex: 1 }}>
        {getCat(negocio.categoria).icon}
      </div>

      {/* Business name */}
      <div style={{ padding: "0 20px", zIndex: 1, flex: 1 }}>
        <div style={{ fontSize: negocio.titulo.length > 30 ? 18 : 22, fontWeight: 900, color: "#ffffff", lineHeight: 1.2, marginBottom: 8 }}>
          {negocio.titulo.toUpperCase()}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {negocio.preco && (
            <div style={{ background: `${cat.accent}20`, border: `1px solid ${cat.accent}40`, borderRadius: 6, padding: "4px 8px", fontSize: 10, color: cat.accent, fontWeight: 700 }}>
              💰 {formatCurrency(negocio.preco)}
            </div>
          )}
          {negocio.faturamento_mensal && (
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 6, padding: "4px 8px", fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
              📈 {formatCurrency(negocio.faturamento_mensal)}/mês
            </div>
          )}
          {negocio.cidade && (
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 6, padding: "4px 8px", fontSize: 10, color: "rgba(255,255,255,0.6)" }}>
              📍 {negocio.cidade} · {negocio.estado}
            </div>
          )}
        </div>
      </div>

      {/* Bottom corretor strip */}
      <div style={{ background: "rgba(255,255,255,0.06)", borderTop: `1px solid rgba(255,255,255,0.08)`, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", overflow: "hidden", border: `1.5px solid ${cat.accent}`, flexShrink: 0, background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {profile.foto_url
              ? <img src={profile.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
              : <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{getInitials(profile.nome)}</span>
            }
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{profile.nome}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>Corretor de Negócios</div>
          </div>
        </div>
        {profile.telefone && (
          <div style={{ fontSize: 9, color: cat.accent, fontWeight: 600 }}>{formatPhone(profile.telefone)}</div>
        )}
      </div>
    </div>
  );
}

// ─── Template: Story / Status (270×480) ──────────────────────────────────────
function StoryPost({ negocio, profile, divRef }: {
  negocio: Negocio; profile: Profile; divRef: React.RefObject<HTMLDivElement>;
}) {
  const cat = getCat(negocio.categoria);
  return (
    <div ref={divRef} style={{
      width: 270, height: 480,
      background: cat.bg,
      borderRadius: 16,
      overflow: "hidden",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "28px 20px 24px",
      fontFamily: "Arial, Helvetica, sans-serif",
      boxSizing: "border-box",
    }}>
      {/* Decorative */}
      <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: `${cat.accent}12` }} />
      <div style={{ position: "absolute", bottom: 80, left: -50, width: 160, height: 160, borderRadius: "50%", background: `${cat.accent}08` }} />

      {/* Top */}
      <div style={{ zIndex: 1, textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", background: cat.accent, borderRadius: 10, width: 44, height: 44, fontSize: 16, fontWeight: 900, color: "#000", marginBottom: 6 }}>NJ</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: 2, textTransform: "uppercase" }}>NegócioJá</div>
      </div>

      {/* Center */}
      <div style={{ zIndex: 1, textAlign: "center" }}>
        <div style={{ background: `${cat.accent}20`, border: `1px solid ${cat.accent}40`, borderRadius: 20, padding: "4px 14px", display: "inline-block", fontSize: 10, color: cat.accent, letterSpacing: 1, marginBottom: 12 }}>
          {getCat(negocio.categoria).icon} {negocio.categoria}
        </div>
        <div style={{ fontSize: 10, color: cat.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
          OPORTUNIDADE DE NEGÓCIO
        </div>
        <div style={{ fontSize: negocio.titulo.length > 25 ? 18 : 22, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 16 }}>
          {negocio.titulo}
        </div>

        {/* Metrics */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
          {negocio.preco && (
            <div style={{ background: `${cat.accent}20`, border: `1px solid ${cat.accent}50`, borderRadius: 8, padding: "8px 20px", width: "100%", boxSizing: "border-box", textAlign: "center" }}>
              <div style={{ fontSize: 9, color: cat.accent, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>Valor de Venda</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>{formatCurrency(negocio.preco)}</div>
            </div>
          )}
          {negocio.faturamento_mensal && (
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "6px 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11 }}>📈</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>Fat. {formatCurrency(negocio.faturamento_mensal)}/mês</span>
            </div>
          )}
          {negocio.cidade && (
            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "5px 14px", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10 }}>📍</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>{negocio.cidade}, {negocio.estado}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA + Corretor */}
      <div style={{ zIndex: 1 }}>
        <div style={{ background: cat.accent, borderRadius: 50, padding: "11px 0", textAlign: "center", fontSize: 13, fontWeight: 800, color: "#000", marginBottom: 10 }}>
          📲 Entre em contato!
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", border: `1.5px solid ${cat.accent}`, flexShrink: 0, background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {profile.foto_url
              ? <img src={profile.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
              : <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>{getInitials(profile.nome)}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.nome}</div>
            {profile.telefone && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)" }}>{formatPhone(profile.telefone)}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Formato = "post" | "story" | "status";

const FORMATO_CONFIG: Record<Formato, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  post:   { label: "Post Instagram",   icon: <Instagram className="h-4 w-4" />,     desc: "1080×1080 · quadrado",  color: "from-pink-500 to-purple-600" },
  story:  { label: "Story Instagram",  icon: <Instagram className="h-4 w-4" />,     desc: "1080×1920 · 9:16",      color: "from-violet-500 to-pink-500" },
  status: { label: "Status WhatsApp",  icon: <MessageCircle className="h-4 w-4" />, desc: "9:16 · direto ao ponto", color: "from-green-500 to-emerald-600" },
};

const CorretorRedesSociais = () => {
  usePageTitle("Redes Sociais | Área do Corretor");

  const [negocios, setNegocios]   = useState<Negocio[]>([]);
  const [profile, setProfile]     = useState<Profile>({ nome: "", telefone: "", foto_url: "", creci: "" });
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<Negocio | null>(null);
  const [formato, setFormato]     = useState<Formato>("post");
  const [showPicker, setShowPicker] = useState(false);

  // Copy
  const [copy, setCopy]           = useState("");
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Download
  const [downloading, setDownloading] = useState(false);

  const postRef  = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase
          .from("profiles")
          .select("nome, telefone, foto_url, creci")
          .eq("id", session.user.id)
          .single();
        if (data) setProfile(data as Profile);
      }
      const all = await getAllNegocios();
      setNegocios(all.filter((n) => n.status === "ativo"));
      setLoading(false);
    };
    init();
  }, []);

  const negociosFiltrados = negocios.filter((n) =>
    n.titulo.toLowerCase().includes(search.toLowerCase()) ||
    n.categoria.toLowerCase().includes(search.toLowerCase()) ||
    n.cidade.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectNegocio = (n: Negocio) => {
    setSelected(n);
    setShowPicker(false);
    setCopy("");
  };

  const handleGerarCopy = async () => {
    if (!selected) return;
    setGeneratingCopy(true);
    setCopy("");

    const info = [
      `Nome do negócio: ${selected.titulo}`,
      `Categoria: ${selected.categoria}`,
      `Localização: ${selected.cidade}, ${selected.estado}`,
      selected.preco       ? `Valor de venda: ${formatCurrency(selected.preco)}` : "",
      selected.faturamento_mensal ? `Faturamento mensal: ${formatCurrency(selected.faturamento_mensal)}` : "",
      selected.area_m2     ? `Área: ${selected.area_m2} m²` : "",
      selected.descricao   ? `Descrição: ${selected.descricao}` : "",
    ].filter(Boolean).join("\n");

    const corretorInfo = `Corretor: ${profile.nome}${profile.telefone ? " · " + formatPhone(profile.telefone) : ""}${profile.creci ? " · CRECI " + profile.creci : ""}`;

    const prompts: Record<Formato, string> = {
      post: `Você é especialista em marketing imobiliário e de negócios no Instagram Brasil.
Crie uma LEGENDA para Instagram anunciando este negócio à venda.

REGRAS:
- Tom: entusiasmado, profissional, direto
- Use emojis estratégicos (não exagere)
- Máximo 8 linhas de texto principal
- Finalize com 15-20 hashtags relevantes separadas por espaço
- Inclua uma chamada para ação clara (CTA) pedindo para chamar no WhatsApp
- Mencione o corretor no final

DADOS DO NEGÓCIO:
${info}

${corretorInfo}

Escreva APENAS a legenda, sem explicações.`,

      story: `Você é especialista em marketing para Instagram Stories no Brasil.
Crie um TEXTO CURTO para Story anunciando este negócio à venda.

REGRAS:
- Máximo 4 linhas, muito objetivo
- Use emojis chamativos
- CTA: "Link na bio" ou "Manda mensagem"
- Tom urgente e direto: "Oportunidade única!", "Não perde!"
- Não precisa de hashtags

DADOS DO NEGÓCIO:
${info}

${corretorInfo}

Escreva APENAS o texto do story, sem explicações.`,

      status: `Você é especialista em marketing pelo WhatsApp no Brasil.
Crie um TEXTO para Status do WhatsApp anunciando este negócio.

REGRAS:
- Máximo 5 linhas, linguagem descontraída e direta
- Emojis brasileiros
- CTA: "Me chama aqui no WhatsApp"
- Mencione o valor se disponível
- Sem hashtags (WhatsApp não usa)

DADOS DO NEGÓCIO:
${info}

${corretorInfo}

Escreva APENAS o texto do status, sem explicações.`,
    };

    try {
      const result = await callClaude(prompts[formato]);
      setCopy(result.trim());
    } catch (e) {
      setCopy("Erro ao gerar copy. Verifique sua conexão e tente novamente.");
    } finally {
      setGeneratingCopy(false);
    }
  };

  const handleDownload = async () => {
    const ref = formato === "post" ? postRef : storyRef;
    if (!ref.current) return;
    setDownloading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const scale = formato === "post" ? 3 : 4;
      const canvas = await html2canvas(ref.current, { scale, useCORS: true, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `${formato}-${selected?.titulo || "post"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(copy);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  if (loading) {
    return (
      <CorretorLayout>
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      </CorretorLayout>
    );
  }

  const activeRef = formato === "post" ? postRef : storyRef;

  return (
    <CorretorLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-violet-600">
            <Megaphone className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Redes Sociais</h1>
            <p className="text-sm text-muted-foreground">Gere artes e copy para Instagram e WhatsApp com IA</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* ─── Coluna Esquerda: Configuração ─── */}
          <div className="space-y-4">

            {/* Step 1: Escolher negócio */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">1</div>
                <p className="font-semibold text-foreground text-sm">Escolha o negócio</p>
              </div>

              {/* Selected preview */}
              {selected ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                  <span className="text-2xl shrink-0">{getCat(selected.categoria).icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{selected.titulo}</p>
                    <p className="text-xs text-muted-foreground">{selected.categoria} · {selected.cidade}</p>
                    {selected.preco && <p className="text-xs font-semibold text-primary">{formatCurrency(selected.preco)}</p>}
                  </div>
                  <button onClick={() => setShowPicker(!showPicker)} className="text-muted-foreground hover:text-foreground">
                    <ChevronDown className={`h-4 w-4 transition-transform ${showPicker ? "rotate-180" : ""}`} />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowPicker(true)}
                  className="w-full flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground hover:bg-muted/40 transition-colors">
                  <span>Selecionar negócio...</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              )}

              {/* Picker dropdown */}
              {showPicker && (
                <div className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar negócio..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-muted outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div className="max-h-52 overflow-y-auto">
                    {negociosFiltrados.length === 0 ? (
                      <p className="text-center py-6 text-xs text-muted-foreground">Nenhum negócio ativo encontrado</p>
                    ) : negociosFiltrados.map((n) => (
                      <button key={n.id} onClick={() => handleSelectNegocio(n)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors text-sm border-b border-border/50 last:border-0 ${selected?.id === n.id ? "bg-primary/5" : ""}`}>
                        <span className="text-xl shrink-0">{getCat(n.categoria).icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate text-xs">{n.titulo}</p>
                          <p className="text-xs text-muted-foreground">{n.categoria} · {n.cidade}</p>
                        </div>
                        {n.preco && <span className="text-xs font-semibold text-primary shrink-0">{formatCurrency(n.preco)}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Formato */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">2</div>
                <p className="font-semibold text-foreground text-sm">Formato</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(FORMATO_CONFIG) as [Formato, typeof FORMATO_CONFIG[Formato]][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => { setFormato(key); setCopy(""); }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all ${formato === key ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${cfg.color} text-white`}>
                      {cfg.icon}
                    </div>
                    <span className="leading-tight text-center">{cfg.label}</span>
                    <span className="text-[10px] opacity-60">{cfg.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Gerar Copy */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">3</div>
                <p className="font-semibold text-foreground text-sm">Texto / Copy com IA</p>
              </div>

              <button onClick={handleGerarCopy} disabled={!selected || generatingCopy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-4 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-40">
                {generatingCopy
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando com IA...</>
                  : <><Sparkles className="h-4 w-4" /> Gerar Copy com IA</>
                }
              </button>

              {copy && (
                <div className="space-y-2">
                  <textarea
                    value={copy}
                    onChange={(e) => setCopy(e.target.value)}
                    rows={8}
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleCopyText}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition-colors">
                      {copiedText ? <><Check className="h-3.5 w-3.5" /> Copiado!</> : <><Copy className="h-3.5 w-3.5" /> Copiar texto</>}
                    </button>
                    <button onClick={handleGerarCopy} disabled={generatingCopy}
                      className="flex items-center justify-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/70 transition-colors disabled:opacity-40">
                      <RefreshCw className={`h-3.5 w-3.5 ${generatingCopy ? "animate-spin" : ""}`} />
                      Regerar
                    </button>
                  </div>
                </div>
              )}

              {!copy && !generatingCopy && (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <Sparkles className="h-8 w-8 opacity-15 mb-2" />
                  <p className="text-xs text-muted-foreground">Selecione um negócio e clique em gerar</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Coluna Direita: Preview + Download ─── */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground text-sm">Preview da Arte</p>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground font-medium">
                  {FORMATO_CONFIG[formato].desc}
                </span>
              </div>

              {selected ? (
                <div className="flex justify-center">
                  {formato === "post"
                    ? <PostInstagram negocio={selected} profile={profile} divRef={postRef} />
                    : <StoryPost negocio={selected} profile={profile} divRef={storyRef} />
                  }
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl bg-muted/20 border-2 border-dashed border-border">
                  <Instagram className="h-12 w-12 opacity-15 mb-3" />
                  <p className="text-sm text-muted-foreground font-medium">Selecione um negócio</p>
                  <p className="text-xs text-muted-foreground">para visualizar a arte</p>
                </div>
              )}

              {selected && (
                <button onClick={handleDownload} disabled={downloading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50">
                  {downloading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando PNG...</>
                    : <><Download className="h-4 w-4" /> Baixar Arte em PNG</>
                  }
                </button>
              )}
            </div>

            {/* Dica */}
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs font-semibold text-violet-700 mb-1">💡 Como usar</p>
              <ol className="text-xs text-violet-600 space-y-1 list-decimal list-inside">
                <li>Selecione o negócio que quer divulgar</li>
                <li>Escolha o formato (post, story ou status)</li>
                <li>Clique em "Gerar Copy com IA" para o texto</li>
                <li>Edite o texto se quiser personalizar</li>
                <li>Baixe a arte e publique!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </CorretorLayout>
  );
};

export default CorretorRedesSociais;
