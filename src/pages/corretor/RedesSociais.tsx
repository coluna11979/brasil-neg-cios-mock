import { useEffect, useRef, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { supabase } from "@/lib/supabase";
import { callClaude } from "@/lib/anthropic";
import { getAllNegocios, formatCurrency, type Negocio } from "@/stores/negocioStore";
import {
  Instagram, MessageCircle, Download, Copy, Check, Loader2,
  Sparkles, Search, Megaphone, RefreshCw, ChevronLeft,
} from "lucide-react";

interface Profile {
  nome: string;
  telefone: string;
  foto_url: string;
  creci: string;
}

// ─── Category config ───────────────────────────────────────────────────────────
const CAT: Record<string, { bg1: string; bg2: string; accent: string; light: string; icon: string; photo: string }> = {
  "Alimentação":        { bg1: "#0a2010", bg2: "#0f3018", accent: "#22c55e", light: "#86efac", icon: "🍽️",  photo: "#052e16" },
  "Saúde e Estética":   { bg1: "#1a0a28", bg2: "#2d0f45", accent: "#c084fc", light: "#e9d5ff", icon: "💆",  photo: "#3b0764" },
  "Serviços":           { bg1: "#0a1428", bg2: "#0f2040", accent: "#60a5fa", light: "#bfdbfe", icon: "🔧",  photo: "#1e3a5f" },
  "Varejo":             { bg1: "#1a140a", bg2: "#2a1f08", accent: "#fbbf24", light: "#fef08a", icon: "🛍️",  photo: "#451a03" },
  "Tecnologia":         { bg1: "#0a1428", bg2: "#0e1e3a", accent: "#22d3ee", light: "#a5f3fc", icon: "💻",  photo: "#083344" },
  "Educação":           { bg1: "#0f0f28", bg2: "#151540", accent: "#818cf8", light: "#c7d2fe", icon: "📚",  photo: "#1e1b4b" },
  "Automotivo":         { bg1: "#1a0e08", bg2: "#2a150a", accent: "#fb923c", light: "#fed7aa", icon: "🚗",  photo: "#431407" },
  "Indústria":          { bg1: "#111111", bg2: "#1a1a1a", accent: "#94a3b8", light: "#e2e8f0", icon: "🏭",  photo: "#0f172a" },
  "Imóveis Comerciais": { bg1: "#0a1a1a", bg2: "#0f2828", accent: "#2dd4bf", light: "#99f6e4", icon: "🏢",  photo: "#042f2e" },
  "Outro":              { bg1: "#0d1a2e", bg2: "#0f2040", accent: "#C49A1E", light: "#fde68a", icon: "💼",  photo: "#1c1208" },
};
function getCat(cat: string) { return CAT[cat] || CAT["Outro"]; }
function getInitials(name: string) { return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase(); }
function formatPhone(tel: string) {
  const d = tel?.replace(/\D/g, "") || "";
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return tel;
}

// ─── POST INSTAGRAM (360×360) ─────────────────────────────────────────────────
function PostInstagram({ negocio, profile, divRef }: {
  negocio: Negocio; profile: Profile; divRef: React.RefObject<HTMLDivElement>;
}) {
  const c = getCat(negocio.categoria);
  const PHOTO_H = 148;
  const TOTAL_H = 360;

  return (
    <div ref={divRef} style={{
      width: 360, height: TOTAL_H, borderRadius: 14, overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: "Arial, Helvetica, sans-serif", boxSizing: "border-box",
      position: "relative",
    }}>
      {/* ── PHOTO AREA ── */}
      <div style={{
        height: PHOTO_H, flexShrink: 0, position: "relative",
        background: `radial-gradient(ellipse at 70% 30%, ${c.bg2} 0%, ${c.photo} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        {/* Real photo background */}
        {negocio.foto_url && (
          <>
            <img src={negocio.foto_url} crossOrigin="anonymous"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.55) 100%)" }} />
          </>
        )}

        {/* Placeholder circles (only when no photo) */}
        {!negocio.foto_url && <>
          <div style={{ position: "absolute", top: -40, right: -40, width: 180, height: 180, borderRadius: "50%", background: `${c.accent}18` }} />
          <div style={{ position: "absolute", bottom: -20, left: -30, width: 120, height: 120, borderRadius: "50%", background: `${c.accent}10` }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${c.accent}20 0%, transparent 70%)` }} />
        </>}

        {/* Top bar overlaid */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "#000" }}>NJ</div>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 8.5, letterSpacing: 1.5, textTransform: "uppercase" }}>NegociaAky</span>
          </div>
          <div style={{ background: "rgba(0,0,0,0.45)", border: `1px solid ${c.accent}80`, borderRadius: 20, padding: "2px 8px", fontSize: 8.5, color: c.light, letterSpacing: 0.5 }}>
            {negocio.categoria}
          </div>
        </div>

        {/* Category icon (only when no photo) */}
        {!negocio.foto_url && (
          <div style={{ fontSize: 58, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))", zIndex: 1 }}>
            {getCat(negocio.categoria).icon}
          </div>
        )}

        {/* Bottom fade overlay */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 40, background: `linear-gradient(to bottom, transparent, ${c.bg1})`, zIndex: 2 }} />
      </div>

      {/* ── INFO AREA ── */}
      <div style={{
        flex: 1, background: c.bg1,
        padding: "12px 16px 0",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div>
          <div style={{
            fontSize: negocio.titulo.length > 32 ? 14 : negocio.titulo.length > 22 ? 16 : 18,
            fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 8,
          }}>
            {negocio.titulo.toUpperCase()}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {negocio.preco && (
              <div style={{ background: `${c.accent}22`, border: `1px solid ${c.accent}50`, borderRadius: 6, padding: "3px 8px", fontSize: 10, color: c.accent, fontWeight: 700 }}>
                💰 {formatCurrency(negocio.preco)}
              </div>
            )}
            {negocio.faturamento_mensal && (
              <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 6, padding: "3px 8px", fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                📈 {formatCurrency(negocio.faturamento_mensal)}/mês
              </div>
            )}
            {negocio.cidade && (
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: "3px 8px", fontSize: 9.5, color: "rgba(255,255,255,0.55)" }}>
                📍 {negocio.cidade} · {negocio.estado}
              </div>
            )}
          </div>
        </div>

        {/* Corretor strip */}
        <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)`, padding: "8px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", border: `1.5px solid ${c.accent}`, flexShrink: 0, background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {profile.foto_url
                ? <img src={profile.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
                : <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>{getInitials(profile.nome)}</span>
              }
            </div>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#fff" }}>{profile.nome}</div>
              <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.4)" }}>Corretor de Negócios</div>
            </div>
          </div>
          {profile.telefone && (
            <div style={{ fontSize: 9, color: c.accent, fontWeight: 600 }}>{formatPhone(profile.telefone)}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── STORY / STATUS (270×480) ─────────────────────────────────────────────────
function StoryPost({ negocio, profile, divRef }: {
  negocio: Negocio; profile: Profile; divRef: React.RefObject<HTMLDivElement>;
}) {
  const c = getCat(negocio.categoria);
  const PHOTO_H = 200;

  return (
    <div ref={divRef} style={{
      width: 270, height: 480, borderRadius: 16, overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: "Arial, Helvetica, sans-serif", boxSizing: "border-box",
    }}>
      {/* ── PHOTO AREA ── */}
      <div style={{
        height: PHOTO_H, flexShrink: 0, position: "relative",
        background: `radial-gradient(ellipse at 65% 35%, ${c.bg2} 0%, ${c.photo} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        {/* Real photo */}
        {negocio.foto_url && (
          <>
            <img src={negocio.foto_url} crossOrigin="anonymous"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.65) 100%)" }} />
          </>
        )}

        {/* Placeholder circles */}
        {!negocio.foto_url && <>
          <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", background: `${c.accent}15` }} />
          <div style={{ position: "absolute", bottom: -20, left: -30, width: 130, height: 130, borderRadius: "50%", background: `${c.accent}10` }} />
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${c.accent}25 0%, transparent 70%)` }} />
        </>}

        {/* Top bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: c.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#000" }}>NJ</div>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" }}>NegociaAky</span>
          </div>
          <div style={{ background: "rgba(0,0,0,0.45)", border: `1px solid ${c.accent}80`, borderRadius: 20, padding: "2px 9px", fontSize: 8, color: c.light }}>
            {negocio.categoria}
          </div>
        </div>

        {/* Icon placeholder */}
        {!negocio.foto_url && (
          <div style={{ fontSize: 72, filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.6))", zIndex: 1 }}>
            {getCat(negocio.categoria).icon}
          </div>
        )}

        {/* Bottom fade */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 50, background: `linear-gradient(to bottom, transparent, ${c.bg1})`, zIndex: 2 }} />
      </div>

      {/* ── INFO AREA ── */}
      <div style={{
        flex: 1, background: c.bg1,
        padding: "10px 16px 14px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 9.5, color: c.accent, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>
            OPORTUNIDADE DE NEGÓCIO
          </div>
          <div style={{
            fontSize: negocio.titulo.length > 28 ? 14 : 17,
            fontWeight: 900, color: "#fff", lineHeight: 1.25, marginBottom: 10,
          }}>
            {negocio.titulo}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {negocio.preco && (
              <div style={{ background: `${c.accent}20`, border: `1px solid ${c.accent}45`, borderRadius: 8, padding: "7px 12px" }}>
                <div style={{ fontSize: 8, color: c.accent, letterSpacing: 1, textTransform: "uppercase", marginBottom: 1 }}>Valor de Venda</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>{formatCurrency(negocio.preco)}</div>
              </div>
            )}
            <div style={{ display: "flex", gap: 5 }}>
              {negocio.faturamento_mensal && (
                <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 7, padding: "6px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", marginBottom: 1 }}>Faturamento</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>{formatCurrency(negocio.faturamento_mensal)}/mês</div>
                </div>
              )}
              {negocio.cidade && (
                <div style={{ flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 7, padding: "6px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)", marginBottom: 1 }}>Local</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>{negocio.cidade}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CTA + Corretor */}
        <div>
          <div style={{ background: c.accent, borderRadius: 50, padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: 800, color: "#000", marginBottom: 8 }}>
            📲 Entre em contato!
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "7px 10px" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", border: `1.5px solid ${c.accent}`, flexShrink: 0, background: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {profile.foto_url
                ? <img src={profile.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
                : <span style={{ fontSize: 9, fontWeight: 800, color: "#fff" }}>{getInitials(profile.nome)}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.nome}</div>
              {profile.telefone && <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.45)" }}>{formatPhone(profile.telefone)}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Formato = "post" | "story" | "status";

const FORMATO_CONFIG: Record<Formato, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  post:   { label: "Post Instagram",  icon: <Instagram className="h-4 w-4" />,     desc: "1080×1080",     color: "from-pink-500 to-purple-600" },
  story:  { label: "Story Instagram", icon: <Instagram className="h-4 w-4" />,     desc: "1080×1920",     color: "from-violet-500 to-pink-500" },
  status: { label: "Status WhatsApp", icon: <MessageCircle className="h-4 w-4" />, desc: "9:16 pessoal",  color: "from-green-500 to-emerald-600" },
};

const TODAS_CATS = Object.keys(CAT);

const CorretorRedesSociais = () => {
  usePageTitle("Redes Sociais | Área do Corretor");

  const [negocios, setNegocios]       = useState<Negocio[]>([]);
  const [profile, setProfile]         = useState<Profile>({ nome: "", telefone: "", foto_url: "", creci: "" });
  const [loading, setLoading]         = useState(true);

  // Seleção por categoria
  const [catSelecionada, setCatSelecionada] = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState<Negocio | null>(null);
  const [showNegociosPicker, setShowNegociosPicker] = useState(false);

  const [formato, setFormato]         = useState<Formato>("post");
  const [copy, setCopy]               = useState("");
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copiedText, setCopiedText]   = useState(false);
  const [downloading, setDownloading] = useState(false);

  const postRef  = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data } = await supabase.from("profiles").select("nome, telefone, foto_url, creci").eq("id", session.user.id).single();
        if (data) setProfile(data as Profile);
      }
      const all = await getAllNegocios();
      setNegocios(all.filter((n) => n.status === "ativo"));
      setLoading(false);
    };
    init();
  }, []);

  // Categorias com produtos disponíveis
  const catsComProdutos = TODAS_CATS.filter((cat) => negocios.some((n) => n.categoria === cat));

  // Negócios filtrados por categoria + busca
  const negociosDaCat = catSelecionada
    ? negocios.filter((n) => n.categoria === catSelecionada)
    : negocios;
  const negociosFiltrados = negociosDaCat.filter((n) =>
    n.titulo.toLowerCase().includes(search.toLowerCase()) ||
    n.cidade.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectCategoria = (cat: string) => {
    setCatSelecionada(cat);
    setSelected(null);
    setCopy("");
    setSearch("");
    setShowNegociosPicker(true);
  };

  const handleSelectNegocio = (n: Negocio) => {
    setSelected(n);
    setShowNegociosPicker(false);
    setCopy("");
  };

  const handleVoltarCategoria = () => {
    setCatSelecionada(null);
    setSelected(null);
    setShowNegociosPicker(false);
    setCopy("");
  };

  const handleGerarCopy = async () => {
    if (!selected) return;
    setGeneratingCopy(true);
    setCopy("");
    const info = [
      `Nome: ${selected.titulo}`, `Categoria: ${selected.categoria}`,
      `Local: ${selected.cidade}, ${selected.estado}`,
      selected.preco              ? `Valor de venda: ${formatCurrency(selected.preco)}` : "",
      selected.faturamento_mensal ? `Faturamento mensal: ${formatCurrency(selected.faturamento_mensal)}` : "",
      selected.area_m2            ? `Área: ${selected.area_m2}m²` : "",
      selected.descricao          ? `Descrição: ${selected.descricao}` : "",
    ].filter(Boolean).join("\n");
    const corretorInfo = `Corretor: ${profile.nome}${profile.telefone ? " · " + formatPhone(profile.telefone) : ""}${profile.creci ? " · CRECI " + profile.creci : ""}`;

    const prompts: Record<Formato, string> = {
      post: `Você é especialista em marketing de negócios no Instagram Brasil.\nCrie APENAS uma legenda para Instagram anunciando este negócio à venda.\nRegras: tom entusiasmado e profissional, emojis estratégicos, máx 8 linhas, CTA para WhatsApp, finalize com 15-20 hashtags.\n\n${info}\n${corretorInfo}`,
      story: `Você é especialista em Instagram Stories Brasil.\nCrie APENAS um texto curto para Story (máx 4 linhas), muito objetivo, com emojis chamativos, CTA "Manda mensagem" ou "Link na bio", tom urgente. Sem hashtags.\n\n${info}\n${corretorInfo}`,
      status: `Você é especialista em marketing pelo WhatsApp Brasil.\nCrie APENAS um texto curto para Status WhatsApp (máx 5 linhas), linguagem descontraída, com emojis, CTA "Me chama no WhatsApp". Sem hashtags.\n\n${info}\n${corretorInfo}`,
    };

    try {
      const result = await callClaude(prompts[formato]);
      setCopy(result.trim());
    } catch {
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

          {/* ─── COLUNA ESQUERDA ─── */}
          <div className="space-y-4">

            {/* STEP 1: Categoria ou Negócio */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">1</div>
                <p className="font-semibold text-foreground text-sm">
                  {catSelecionada ? "Escolha o negócio" : "Escolha a categoria"}
                </p>
                {catSelecionada && (
                  <button onClick={handleVoltarCategoria}
                    className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" /> Voltar
                  </button>
                )}
              </div>

              {/* ── Seletor de categoria ── */}
              {!catSelecionada && (
                <div className="grid grid-cols-2 gap-2">
                  {TODAS_CATS.map((cat) => {
                    const c = getCat(cat);
                    const count = negocios.filter((n) => n.categoria === cat).length;
                    const hasProducts = count > 0;
                    return (
                      <button key={cat}
                        onClick={() => hasProducts && handleSelectCategoria(cat)}
                        disabled={!hasProducts}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                          hasProducts
                            ? "border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/30 cursor-pointer"
                            : "border-border/40 bg-muted/10 opacity-40 cursor-not-allowed"
                        }`}>
                        <div
                          style={hasProducts ? { background: `${c.accent}20`, border: `1px solid ${c.accent}40` } : {}}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-xl shrink-0 bg-muted/30">
                          {c.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{cat}</p>
                          <p className="text-xs text-muted-foreground">
                            {hasProducts ? `${count} produto${count !== 1 ? "s" : ""}` : "sem produtos"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Categoria selecionada: header + lista de negócios ── */}
              {catSelecionada && (
                <div className="space-y-3">
                  {/* Badge da categoria */}
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2 border border-border bg-muted/30">
                    <span className="text-xl">{getCat(catSelecionada).icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{catSelecionada}</p>
                      <p className="text-xs text-muted-foreground">{negociosDaCat.length} negócio{negociosDaCat.length !== 1 ? "s" : ""} disponível{negociosDaCat.length !== 1 ? "is" : ""}</p>
                    </div>
                  </div>

                  {/* Negócio selecionado */}
                  {selected && (
                    <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
                      <span className="text-xl shrink-0">{getCat(selected.categoria).icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-xs truncate">{selected.titulo}</p>
                        {selected.preco && <p className="text-xs font-bold text-primary">{formatCurrency(selected.preco)}</p>}
                      </div>
                      <button onClick={() => setShowNegociosPicker(!showNegociosPicker)}
                        className="text-xs text-primary font-medium hover:underline shrink-0">
                        Trocar
                      </button>
                    </div>
                  )}

                  {/* Lista de produtos */}
                  {(!selected || showNegociosPicker) && (
                    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                      <div className="p-2 border-b border-border">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <input type="text" placeholder="Buscar produto..."
                            value={search} onChange={(e) => setSearch(e.target.value)} autoFocus
                            className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-muted outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                      </div>
                      <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
                        {negociosFiltrados.length === 0 ? (
                          <p className="text-center py-6 text-xs text-muted-foreground">Nenhum resultado</p>
                        ) : negociosFiltrados.map((n) => (
                          <button key={n.id} onClick={() => handleSelectNegocio(n)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${selected?.id === n.id ? "bg-primary/5" : ""}`}>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-xs truncate">{n.titulo}</p>
                              <p className="text-xs text-muted-foreground">{n.cidade}, {n.estado}</p>
                            </div>
                            {n.preco && <span className="text-xs font-bold text-primary shrink-0">{formatCurrency(n.preco)}</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STEP 2: Formato */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">2</div>
                <p className="font-semibold text-foreground text-sm">Formato</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(FORMATO_CONFIG) as [Formato, typeof FORMATO_CONFIG[Formato]][]).map(([key, cfg]) => (
                  <button key={key} onClick={() => { setFormato(key); setCopy(""); }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all ${formato === key ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${cfg.color} text-white`}>{cfg.icon}</div>
                    <span className="leading-tight text-center">{cfg.label}</span>
                    <span className="text-[10px] opacity-60">{cfg.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* STEP 3: Copy com IA */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">3</div>
                <p className="font-semibold text-foreground text-sm">Texto / Copy com IA</p>
              </div>
              <button onClick={handleGerarCopy} disabled={!selected || generatingCopy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-4 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-40">
                {generatingCopy
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando com IA...</>
                  : <><Sparkles className="h-4 w-4" /> Gerar Copy com IA</>}
              </button>
              {copy && (
                <div className="space-y-2">
                  <textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={8}
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                  <div className="flex gap-2">
                    <button onClick={handleCopyText}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90">
                      {copiedText ? <><Check className="h-3.5 w-3.5" /> Copiado!</> : <><Copy className="h-3.5 w-3.5" /> Copiar texto</>}
                    </button>
                    <button onClick={handleGerarCopy} disabled={generatingCopy}
                      className="flex items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/70 disabled:opacity-40">
                      <RefreshCw className={`h-3.5 w-3.5 ${generatingCopy ? "animate-spin" : ""}`} /> Regerar
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

          {/* ─── COLUNA DIREITA: Preview ─── */}
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
                    : <StoryPost     negocio={selected} profile={profile} divRef={storyRef} />
                  }
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl bg-muted/20 border-2 border-dashed border-border">
                  <span className="text-5xl mb-3 opacity-20">🖼️</span>
                  <p className="text-sm text-muted-foreground font-medium">Selecione uma categoria</p>
                  <p className="text-xs text-muted-foreground">e depois o negócio para ver a arte</p>
                </div>
              )}

              {selected && (
                <button onClick={handleDownload} disabled={downloading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50">
                  {downloading
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando PNG...</>
                    : <><Download className="h-4 w-4" /> Baixar Arte em PNG</>}
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
              <p className="text-xs font-semibold text-violet-700 mb-1">💡 Como usar</p>
              <ol className="text-xs text-violet-600 space-y-1 list-decimal list-inside">
                <li>Escolha a categoria do produto</li>
                <li>Selecione o negócio específico</li>
                <li>Escolha o formato (post, story ou status)</li>
                <li>Gere o copy com IA e edite se quiser</li>
                <li>Baixe a arte e poste!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </CorretorLayout>
  );
};

export default CorretorRedesSociais;
