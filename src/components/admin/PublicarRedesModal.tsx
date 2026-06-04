import { useEffect, useRef, useState } from "react";
import {
  X, Copy, Check, MessageCircle, Facebook, Linkedin, Send, Instagram,
  Twitter, Download, Upload, Loader2, Sparkles, Megaphone, Wand2,
  Type, MapPin, Tag, DollarSign,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, type Negocio } from "@/stores/negocioStore";
import { callClaude } from "@/lib/anthropic";

interface Props {
  negocio: Negocio;
  onClose: () => void;
}

type Formato = "feed" | "story" | "reels";

const DIMENSOES: Record<Formato, { w: number; h: number; label: string; aspect: string; isVideo: boolean }> = {
  feed:  { w: 1080, h: 1080, label: "Feed 1:1",  aspect: "1/1",  isVideo: false },
  story: { w: 1080, h: 1920, label: "Story",     aspect: "9/16", isVideo: false },
  reels: { w: 1080, h: 1920, label: "Reels 🎬",  aspect: "9/16", isVideo: true  },
};

const REELS_DURATION_S = 6;
const REELS_FPS = 30;

// Brand
const BRAND_BLUE = "#007BFF";
const BRAND_CYAN = "#00E6FF";
const BRAND_DARK = "#0D1117";
const BRAND_DOMAIN = "negociaaky.com.br";

// Temas de cor de acento — afetam pill, marca e destaques.
// Texto principal continua branco (melhor legibilidade em qualquer foto).
type TemaCor = {
  id: string;
  label: string;
  hex: string;        // cor principal do acento
  hexDark: string;    // tom escuro pra gradients
  emoji: string;
};
const TEMAS_COR: TemaCor[] = [
  { id: "cyan",   label: "Padrão",     hex: "#00E6FF", hexDark: "#007BFF", emoji: "💎" },
  { id: "gold",   label: "Premium",    hex: "#FFC857", hexDark: "#D4A24A", emoji: "👑" },
  { id: "red",    label: "Urgência",   hex: "#FF4757", hexDark: "#B91C2A", emoji: "🔥" },
  { id: "green",  label: "Sucesso",    hex: "#22C55E", hexDark: "#15803D", emoji: "✅" },
  { id: "violet", label: "Sofisticado",hex: "#A78BFA", hexDark: "#7C3AED", emoji: "✨" },
];

// Presets de selo (chips clicáveis)
const SELOS_PRESET = [
  "À VENDA",
  "ALUGA-SE",
  "ESPAÇO DISPONÍVEL",
  "OPORTUNIDADE",
  "PASSA-PONTO",
  "PREÇO REDUZIDO",
  "NOVO",
  "URGENTE",
  "VENDIDO",
  "ALUGOU",
];

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|\s|-)([a-zà-ú])/g, (_, sep, ch) => sep + ch.toUpperCase());

// Se o título tem " – " ou " — " ou " - ", separa em [título, bairro].
// Ex: "Salão de Beleza Premium – Jardins" → titulo: "Salão de Beleza Premium", bairro: "Jardins"
function splitTituloBairro(t: string): { titulo: string; bairro: string } {
  if (!t) return { titulo: "", bairro: "" };
  const m = t.match(/^(.+?)\s+[–—-]\s+(.+)$/);
  if (m) return { titulo: m[1].trim(), bairro: m[2].trim() };
  return { titulo: t.trim(), bairro: "" };
}

// Mapeia cada selo pra cor de tema padrão — garante consistência visual no grid
const SELO_TO_TEMA: Record<string, string> = {
  "À VENDA":           "cyan",
  "ALUGA-SE":          "cyan",
  "ESPAÇO DISPONÍVEL": "cyan",
  "OPORTUNIDADE":      "cyan",
  "PASSA-PONTO":     "violet",
  "PREÇO REDUZIDO":  "red",
  "NOVO":            "cyan",
  "URGENTE":         "red",
  "VENDIDO":         "green",
  "ALUGOU":          "green",
};

// A tabela negocios pode ter foto em `imagens` (array), `imagem` (single) ou `foto_url`
// Galerias mapeadas pra Negocio também caem aqui pelo foto_url.
function pickInitialPhoto(n: Negocio): string {
  const ext = n as Negocio & { imagens?: string[]; imagem?: string };
  if (ext.imagens && ext.imagens.length > 0 && ext.imagens[0]) return ext.imagens[0];
  if (ext.imagem) return ext.imagem;
  if (n.foto_url) return n.foto_url;
  return "";
}

const PublicarRedesModal = ({ negocio, onClose }: Props) => {
  const isGaleria = (negocio as { tipo?: string }).tipo === "galeria";
  const pageUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${isGaleria ? `/galerias?id=${negocio.id}` : `/anuncio/${negocio.id}`}`
      : "";

  // ── State ──────────────────────────────────────────────────────────────
  const [formato, setFormato] = useState<Formato>("feed");
  const [imgSrc, setImgSrc] = useState<string>(() => pickInitialPhoto(negocio));
  const [imgLoading, setImgLoading] = useState(false);
  const [headline, setHeadline] = useState("À VENDA");
  // Auto-split: se título tem " – ", separa em título + bairro pra não truncar no grid
  const initialSplit = splitTituloBairro(negocio.titulo || "");
  const [titulo, setTitulo] = useState(initialSplit.titulo);
  const [local, setLocal] = useState(() => {
    // Prioridade: bairro extraído do título > bairro do cadastro > cidade/UF
    if (initialSplit.bairro) return initialSplit.bairro;
    if (negocio.bairro) return titleCase(negocio.bairro);
    return `${titleCase(negocio.cidade || "")}${negocio.estado ? `, ${negocio.estado.toUpperCase()}` : ""}`;
  });
  const [preco, setPreco] = useState(negocio.preco ? formatCurrencyShort(negocio.preco) : "");
  const [faturamento, setFaturamento] = useState(
    negocio.faturamento_mensal ? formatCurrencyShort(negocio.faturamento_mensal) : ""
  );
  const [lucro, setLucro] = useState("");
  const [locacao, setLocacao] = useState("");
  const [tema, setTema] = useState<TemaCor>(TEMAS_COR[0]);
  const [customColor, setCustomColor] = useState("#00E6FF");
  const [showCTA, setShowCTA] = useState(false);
  const [ctaText, setCtaText] = useState("💬 INTERESSE? MANDE DM");
  // Qual métrica fica no pill destacado (estilo META)
  type DestaqueMetrica = "valor" | "lucro" | "faturamento" | "locacao";
  const [destaque, setDestaque] = useState<DestaqueMetrica>("valor");
  const [copy, setCopy] = useState(() => buildDefaultCopy(negocio, pageUrl));
  const [copiedCopy, setCopiedCopy] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [artDownloaded, setArtDownloaded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const logoElRef = useRef<HTMLImageElement | null>(null);

  // ── Carrega fontes Poppins pro canvas ──────────────────────────────────
  useEffect(() => {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (!fonts) { setFontsReady(true); return; }
    Promise.all([
      fonts.load("700 60px Poppins"),
      fonts.load("800 80px Poppins"),
      fonts.load("500 36px Poppins"),
    ]).finally(() => setFontsReady(true));
  }, []);

  // ── Carrega logos (ícone + completa) ───────────────────────────────────
  useEffect(() => {
    const logo = new Image();
    logo.crossOrigin = "anonymous";
    logo.onload = () => { logoElRef.current = logo; drawCanvas(); };
    logo.onerror = () => { logoElRef.current = null; };
    logo.src = "/logo-icon.png";

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Carrega imagem do negócio ──────────────────────────────────────────
  useEffect(() => {
    if (!imgSrc) {
      imgElRef.current = null;
      drawCanvas();
      return;
    }
    setImgLoading(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgElRef.current = img; setImgLoading(false); drawCanvas(); };
    img.onerror = () => {
      const img2 = new Image();
      img2.onload = () => { imgElRef.current = img2; setImgLoading(false); drawCanvas(); };
      img2.onerror = () => { imgElRef.current = null; setImgLoading(false); drawCanvas(); };
      img2.src = imgSrc;
    };
    img.src = imgSrc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgSrc]);

  // Redesenha em qualquer mudança
  useEffect(() => {
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formato, headline, titulo, local, preco, faturamento, lucro, locacao, tema, customColor, destaque, showCTA, ctaText, fontsReady]);

  // Easings + helper de visibilidade animada
  function vis(t: number, start: number, end: number): number {
    if (t <= start) return 0;
    if (t >= end) return 1;
    return (t - start) / (end - start);
  }
  function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t: number): number {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }

  function drawCanvas(animT: number = 1) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { w, h } = DIMENSOES[formato];
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isStory = formato === "story" || formato === "reels";
    const safeTop = isStory ? 220 : 0;
    const safeBottom = isStory ? 260 : 0;
    const padX = isStory ? 80 : 70;
    const cx = w / 2; // centro horizontal — TUDO ancorado aqui

    // Cores de acento do tema (afeta pill, marca, tagline, selo)
    const ACCENT = tema.id === "custom" ? customColor : tema.hex;
    const ACCENT_DARK = tema.hexDark;
    const ACCENT_GLOW = hexToRgba(ACCENT, 0.45);

    // ── BG: foto full-bleed ────────────────────────────────────────────────
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, w, h);

    if (imgElRef.current) {
      // Ken Burns: zoom suave de 1.0 → 1.12 ao longo da animação
      const zoom = lerp(1.0, 1.12, easeOutCubic(animT));
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);
      drawCover(ctx, imgElRef.current, 0, 0, w, h);
      ctx.restore();
    } else {
      const phGrad = ctx.createLinearGradient(0, 0, w, h);
      phGrad.addColorStop(0, "#1e3a5f");
      phGrad.addColorStop(1, "#0F172A");
      ctx.fillStyle = phGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // Overlay escuro FORTE (estilo META) — sem ele o texto branco some
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, 0, w, h);

    // Vinheta sutil pra puxar foco pro centro
    const vGrad = ctx.createRadialGradient(cx, h / 2, h * 0.25, cx, h / 2, h * 0.75);
    vGrad.addColorStop(0, "rgba(0,0,0,0)");
    vGrad.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, w, h);

    // ── BLOCO 1: TÍTULO + BAIRRO (TOPO CENTRALIZADO) ──────────────────────
    // Espaço extra reservado pro selo + respiro
    const tituloAreaTop = safeTop + (isStory ? 160 : 140);
    const tituloMaxW = w - padX * 2;

    // Auto-shrink no título
    let tituloSize = isStory ? 92 : 80;
    while (tituloSize > (isStory ? 56 : 48)) {
      ctx.font = `800 ${tituloSize}px Poppins, sans-serif`;
      if (fitsInLines(ctx, titulo, tituloMaxW, 2)) break;
      tituloSize -= 4;
    }
    // Anim título: fade-in + slide-up de 0.08 → 0.25
    const tituloVis = easeOutCubic(vis(animT, 0.08, 0.28));
    const tituloYOffset = lerp(40, 0, tituloVis);
    ctx.globalAlpha = tituloVis;
    ctx.font = `800 ${tituloSize}px Poppins, sans-serif`;
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 6;
    const tituloLH = tituloSize * 1.08;
    const tituloEndY = wrapTextCenter(ctx, titulo, cx, tituloAreaTop + tituloSize + tituloYOffset, tituloMaxW, tituloLH, 2);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.globalAlpha = 1;

    // Bairro / Local — quando tem múltiplas linhas, vira EYEBROW + INFO PRINCIPAL
    // (hierarquia tipográfica estilo editorial)
    let afterSubY = tituloEndY;
    if (local.trim()) {
      const localVis = easeOutCubic(vis(animT, 0.20, 0.38));
      const localYOff = lerp(20, 0, localVis);
      ctx.globalAlpha = localVis;
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;

      const localLines = local.split("\n").map((l) => l.trim()).filter(Boolean);

      if (localLines.length === 1) {
        // ── Linha única: render normal
        const localSize = isStory ? 54 : 48;
        ctx.font = `500 ${localSize}px Poppins, sans-serif`;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        const subY = tituloEndY + (isStory ? 50 : 40) + localSize;
        ctx.fillText(localLines[0], cx, subY + localYOff);
        afterSubY = subY;
      } else {
        // ── 2+ linhas: HIERARQUIA EDITORIAL
        // Linha 1 → eyebrow (pequena, tracked, opacidade 70%)
        // Linhas 2+ → info principal (maior, peso medium, branco)
        const eyebrowSize = isStory ? 28 : 24;
        const mainSize = isStory ? 56 : 50;
        const eyebrowGap = isStory ? 18 : 14;
        const mainLineH = mainSize * 1.1;

        // Eyebrow (linha 1)
        ctx.font = `700 ${eyebrowSize}px Poppins, sans-serif`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        const eyebrowY = tituloEndY + (isStory ? 50 : 40) + eyebrowSize;
        drawTracked(ctx, localLines[0].toUpperCase(), cx, eyebrowY + localYOff, isStory ? 4 : 3, "center");

        // Info principal (linhas 2+)
        ctx.font = `600 ${mainSize}px Poppins, sans-serif`;
        ctx.fillStyle = "#fff";
        const mainFirstY = eyebrowY + eyebrowGap + mainSize;
        for (let i = 1; i < localLines.length; i++) {
          ctx.fillText(localLines[i], cx, mainFirstY + (i - 1) * mainLineH + localYOff);
        }
        afterSubY = mainFirstY + (localLines.length - 2) * mainLineH;
      }

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.globalAlpha = 1;
    }

    // ── BLOCO 3: ASSINATURA DA MARCA (rodapé centralizado) ────────────────
    // Usa o logo-icon.png (transparente) + wordmark e tagline desenhados
    // — integra natural com qualquer foto, sem caixa escura sobreposta.
    const logoSize = isStory ? 96 : 80;
    const wordmarkSize = isStory ? 58 : 50;
    const taglineSize = isStory ? 20 : 17;
    const gapLogoWord = isStory ? 22 : 18;
    const gapWordTag = isStory ? 18 : 14;
    const brandH = logoSize + gapLogoWord + wordmarkSize + gapWordTag + taglineSize;
    const ctaH = showCTA && ctaText.trim() ? (isStory ? 70 : 56) : 0;
    const ctaGap = ctaH > 0 ? (isStory ? 40 : 32) : 0;
    const brandBottomMargin = isStory ? safeBottom + 50 : 70;
    const brandTopY = h - brandBottomMargin - brandH;
    const ctaY = brandTopY - ctaGap - ctaH;

    // ── CTA opcional (acima da marca) ─────────────────────────────────────
    if (showCTA && ctaText.trim()) {
      const ctaFontSize = isStory ? 32 : 28;
      ctx.font = `800 ${ctaFontSize}px Poppins, sans-serif`;
      const text = ctaText.toUpperCase();
      const textW = ctx.measureText(text).width;

      // Pill pill com border na cor do tema
      const padX = isStory ? 36 : 30;
      const pillW = textW + padX * 2;
      const pillX = cx - pillW / 2;

      ctx.save();
      // Aplica fade-in junto com o resto da marca na animação
      const ctaAlpha = animT === 1 ? 1 : easeOutCubic(vis(animT, 0.72, 0.90));
      ctx.globalAlpha = ctaAlpha;

      // Sombra suave
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 6;
      roundRect(ctx, pillX, ctaY, pillW, ctaH, ctaH / 2);
      ctx.fillStyle = "rgba(13, 17, 23, 0.7)";
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Border na cor do tema
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 3;
      roundRect(ctx, pillX, ctaY, pillW, ctaH, ctaH / 2);
      ctx.stroke();

      // Texto
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, cx, ctaY + ctaH / 2 + 2);
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }

    // Anim marca: fade-in 0.78 → 0.95
    const brandVis = easeOutCubic(vis(animT, 0.78, 0.95));
    ctx.globalAlpha = brandVis;

    // Ícone transparente centralizado — com glow sutil na cor do tema
    if (logoElRef.current) {
      // Halo glow atrás (radial gradient sutil)
      const glowR = logoSize * 0.9;
      const glow = ctx.createRadialGradient(cx, brandTopY + logoSize / 2, 0, cx, brandTopY + logoSize / 2, glowR);
      glow.addColorStop(0, hexToRgba(ACCENT, 0.35));
      glow.addColorStop(0.5, hexToRgba(ACCENT, 0.15));
      glow.addColorStop(1, hexToRgba(ACCENT, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(cx - glowR, brandTopY + logoSize / 2 - glowR, glowR * 2, glowR * 2);
      // Logo por cima
      ctx.drawImage(logoElRef.current, cx - logoSize / 2, brandTopY, logoSize, logoSize);
    }

    // Wordmark "Negocia" branco + "Aky" cyan (igual à logo real)
    ctx.font = `800 ${wordmarkSize}px Poppins, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 5;

    const w1 = "Negocia";
    const w2 = "Aky";
    const w1Width = ctx.measureText(w1).width;
    const w2Width = ctx.measureText(w2).width;
    const wordmarkTotalW = w1Width + w2Width;
    const wordmarkBaselineY = brandTopY + logoSize + gapLogoWord + wordmarkSize;
    const wordmarkStartX = cx - wordmarkTotalW / 2;
    ctx.fillStyle = "#fff";
    ctx.fillText(w1, wordmarkStartX, wordmarkBaselineY);
    ctx.fillStyle = ACCENT;
    ctx.fillText(w2, wordmarkStartX + w1Width, wordmarkBaselineY);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Tagline "CONECTA. NEGOCIA. REALIZA." na cor do tema
    ctx.font = `600 ${taglineSize}px Poppins, sans-serif`;
    ctx.fillStyle = ACCENT;
    const taglineY = wordmarkBaselineY + gapWordTag + taglineSize;
    drawTracked(ctx, "CONECTA. NEGOCIA. REALIZA.", cx, taglineY, isStory ? 5 : 4, "center");
    ctx.globalAlpha = 1;

    // ── BLOCO 2: MÉTRICAS NO CENTRO (entre subtítulo e logo) ──────────────
    // Centraliza verticalmente o conjunto faturamento + pill
    const metricsAreaTop = afterSubY + (isStory ? 80 : 60);
    const metricsAreaBottom = brandTopY - (isStory ? 80 : 60);
    const metricsAreaH = metricsAreaBottom - metricsAreaTop;

    // Monta dicionário de métricas e separa: hero (pill) + secundárias (texto)
    const allMetrics: Record<string, { label: string; value: string }> = {
      valor:       { label: pickValorLabel(headline), value: preco },
      lucro:       { label: "Lucro",       value: lucro },
      faturamento: { label: "Faturamento", value: faturamento },
      locacao:     { label: "Locação",     value: locacao },
    };
    const hero = allMetrics[destaque]?.value.trim()
      ? allMetrics[destaque]
      : null;
    // Secundárias são as preenchidas que NÃO são o destaque
    const textMetrics: { label: string; value: string }[] = [];
    for (const key of ["faturamento", "lucro", "locacao", "valor"]) {
      if (key === destaque) continue;
      const m = allMetrics[key];
      if (m && m.value.trim()) textMetrics.push(m);
    }

    const hasHero = hero !== null;
    const fatValueSize = isStory ? 66 : 56;
    const pillValueSize = isStory ? 86 : 76;
    const pillH = pillValueSize + (isStory ? 56 : 48);
    const lineGap = isStory ? 22 : 16;
    const pillGapTop = isStory ? 36 : 28;
    const totalMetricsH =
      textMetrics.length * fatValueSize +
      Math.max(0, textMetrics.length - 1) * lineGap +
      (textMetrics.length > 0 && hasHero ? pillGapTop : 0) +
      (hasHero ? pillH : 0);

    // Posição vertical das métricas:
    // - se tem TEXTO + pill → centraliza no espaço disponível
    // - se tem SÓ pill (vazio em volta) → aproxima do subtítulo pra evitar void visual
    let metricsY: number;
    if (textMetrics.length === 0 && hasHero) {
      // Só o pill: posiciona em ~30% do espaço (mais próximo do subtítulo)
      metricsY = metricsAreaTop + Math.max(0, metricsAreaH * 0.25);
    } else {
      // Texto + pill: centraliza normalmente
      metricsY = metricsAreaTop + Math.max(0, (metricsAreaH - totalMetricsH) / 2);
    }

    // Renderiza cada métrica textual (centralizada) — anim em cascata
    for (let i = 0; i < textMetrics.length; i++) {
      const m = textMetrics[i];
      const start = 0.38 + i * 0.05;
      const end = start + 0.12;
      const mVis = easeOutCubic(vis(animT, start, end));
      const mYOff = lerp(24, 0, mVis);
      ctx.globalAlpha = mVis;

      const labelSize = isStory ? 54 : 46;
      const labelText = `${m.label}: `;
      const valueText = m.value;

      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;

      ctx.font = `400 ${labelSize}px Poppins, sans-serif`;
      const labelW = ctx.measureText(labelText).width;
      ctx.font = `800 ${fatValueSize}px Poppins, sans-serif`;
      const valueW = ctx.measureText(valueText).width;
      const totalW = labelW + valueW;
      const startX = cx - totalW / 2;
      const baselineY = metricsY + fatValueSize;

      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.font = `400 ${labelSize}px Poppins, sans-serif`;
      ctx.fillText(labelText, startX, baselineY + mYOff);
      ctx.font = `800 ${fatValueSize}px Poppins, sans-serif`;
      ctx.fillText(valueText, startX + labelW, baselineY + mYOff);

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.globalAlpha = 1;
      metricsY = baselineY + lineGap;
    }
    // Ajuste: adiciona o gap maior antes do pill, e remove o último lineGap
    if (textMetrics.length > 0) metricsY = metricsY - lineGap + pillGapTop;

    // Pill HERO estilo META — fundo sólido na cor do tema, texto branco
    if (hasHero && hero) {
      // Anim pill: aparece com bounce 0.62 → 0.80
      const pillVis = easeOutBack(vis(animT, 0.62, 0.85));
      const pillScale = lerp(0.7, 1.0, pillVis);
      const pillAlpha = vis(animT, 0.62, 0.78);
      ctx.globalAlpha = pillAlpha;

      const pillLabelSize = isStory ? 68 : 60;
      const pillLabelText = `${hero.label}: `;
      const pillValueText = hero.value;

      ctx.font = `800 ${pillLabelSize}px Poppins, sans-serif`;
      const labelW = ctx.measureText(pillLabelText).width;
      ctx.font = `900 ${pillValueSize}px Poppins, sans-serif`;
      const valueW = ctx.measureText(pillValueText).width;

      const pillPadX = isStory ? 64 : 56;
      const pillW = labelW + valueW + pillPadX * 2;
      const pillX = cx - pillW / 2;
      const pillY = metricsY;

      // Aplica scale centrado no pill
      ctx.save();
      ctx.translate(pillX + pillW / 2, pillY + pillH / 2);
      ctx.scale(pillScale, pillScale);
      ctx.translate(-(pillX + pillW / 2), -(pillY + pillH / 2));

      // Sombra suave por baixo (depth)
      ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 12;
      roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2);

      // Fundo SÓLIDO na cor do tema (gradient sutil pra dar volume)
      const fillGrad = ctx.createLinearGradient(pillX, pillY, pillX, pillY + pillH);
      fillGrad.addColorStop(0, ACCENT);
      fillGrad.addColorStop(1, ACCENT_DARK);
      ctx.fillStyle = fillGrad;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Highlight interno sutil (acabamento)
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.lineWidth = 2;
      roundRect(ctx, pillX + 2, pillY + 2, pillW - 4, pillH - 4, (pillH - 4) / 2);
      ctx.stroke();

      // Texto do pill — TUDO BRANCO BOLD (estilo META)
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      const textY = pillY + pillH / 2 + 2;
      ctx.fillStyle = "#fff";
      ctx.font = `800 ${pillLabelSize}px Poppins, sans-serif`;
      ctx.fillText(pillLabelText, pillX + pillPadX, textY);
      ctx.font = `900 ${pillValueSize}px Poppins, sans-serif`;
      ctx.fillText(pillValueText, pillX + pillPadX + labelW, textY);
      ctx.textBaseline = "alphabetic";
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // ── SELO no topo (sempre desenha quando preenchido — inclusive À VENDA) ─
    if (headline.trim()) {
      ctx.font = `800 ${isStory ? 48 : 42}px Poppins, sans-serif`;
      const text = headline.toUpperCase();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const metrics = ctx.measureText(text);
      const bw = metrics.width + 64;
      const bh = isStory ? 82 : 72;
      const bx = cx - bw / 2;
      const by = safeTop + (isStory ? 30 : 30);

      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
      roundRect(ctx, bx, by, bw, bh, bh / 2);
      const pillGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
      pillGrad.addColorStop(0, ACCENT_DARK);
      pillGrad.addColorStop(1, ACCENT);
      ctx.fillStyle = pillGrad;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = "#fff";
      ctx.fillText(text, cx, by + bh / 2 + 1);
      ctx.textBaseline = "alphabetic";
    }
  }

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgSrc(url);
  };

  // ── Exporta vídeo Reels (WebM) ─────────────────────────────────────────
  const handleExportVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || exporting) return;

    setExporting(true);
    setExportProgress(0);

    try {
      const stream = canvas.captureStream(REELS_FPS);

      // Pega o melhor codec disponível (vp9 > vp8 > webm)
      let mime = "video/webm;codecs=vp9";
      if (!MediaRecorder.isTypeSupported(mime)) mime = "video/webm;codecs=vp8";
      if (!MediaRecorder.isTypeSupported(mime)) mime = "video/webm";

      const recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 5_000_000, // 5 Mbps — boa qualidade pra 1080p
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
      recorder.start();

      // Render loop: 6s de animação
      const durationMs = REELS_DURATION_S * 1000;
      const startTime = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          const elapsed = performance.now() - startTime;
          const t = Math.min(elapsed / durationMs, 1);
          drawCanvas(t);
          setExportProgress(Math.round(t * 100));
          if (t < 1) {
            requestAnimationFrame(tick);
          } else {
            // Mantém o último frame por mais 200ms pra garantir captura
            setTimeout(resolve, 200);
          }
        };
        requestAnimationFrame(tick);
      });

      recorder.stop();
      await stopped;

      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const slug = (negocio.titulo || "anuncio").toLowerCase().replace(/\s+/g, "-").slice(0, 40);
      a.download = `negociaaky-reels-${slug}.webm`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
      setArtDownloaded(true);
    } catch (err) {
      console.error("Erro ao gerar vídeo:", err);
      alert("Não foi possível gerar o vídeo. Tente baixar como PNG ou trocar a foto.");
    } finally {
      setExporting(false);
      setExportProgress(0);
      // Redesenha o estado final
      drawCanvas(1);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const link = document.createElement("a");
      const slug = (negocio.titulo || "anuncio").toLowerCase().replace(/\s+/g, "-").slice(0, 40);
      link.download = `negociaaky-${formato}-${slug}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setArtDownloaded(true);
    } catch (err) {
      alert("A foto está bloqueando CORS. Faça upload de uma nova foto pelo botão 'Trocar foto'.");
      console.error(err);
    }
  };

  const handleRegenerarCopy = async () => {
    setAiLoading(true);
    try {
      const prompt = `Você é um especialista em copy de venda de negócios comerciais no Brasil (estilo META Negócios).

DADOS DO NEGÓCIO:
- Nome: ${negocio.titulo}
- Categoria: ${negocio.categoria || "negócio"}
- Local: ${local}
- Preço: ${preco || "sob consulta"}
- Faturamento bruto: ${faturamento || (negocio.faturamento_mensal ? formatCurrency(negocio.faturamento_mensal) : "não informado")}
- Lucro líquido: ${lucro || "a confirmar"}
- Locação: ${locacao || "—"}
- Área: ${negocio.area_m2 ? `${negocio.area_m2} m²` : "não informada"}
- Descrição original: ${negocio.descricao?.slice(0, 500) || ""}

FORMATO OBRIGATÓRIO (siga essa estrutura EXATAMENTE):

🏢 [NOME EM CAIXA ALTA]
📍 [Bairro — Cidade/UF]

[3 a 5 bullets curtos começando com "- " descrevendo o negócio: diferencial, operação, equipe, horário, etc. Cada bullet vira uma linha]

✅ Faturamento bruto: [valor]
✅ Lucro Líquido: [valor ou "a confirmar"]
✅ [outra métrica relevante: Área, Custo Fixo, etc.]

✔ Preço: [valor] ✔

O vendedor se compromete a ficar 30 dias trabalhados com o comprador para garantir a transferência do know-how e a apresentação do movimento.

⚠️ Para preservar o sigilo do negócio, não divulgamos o endereço aqui. Agende uma visita.

💬 Mais informações: ${pageUrl}

#NegociaAky #[categoria] #Negocios #Empreender #PassoOPonto

REGRAS:
- Tom: direto, profissional, sem promessas vazias
- NÃO use markdown nem asteriscos
- NÃO invente números — se não tiver dado, deixa "a confirmar" ou omite o bullet
- Português brasileiro
- Máximo 320 palavras`;
      const result = await callClaude(prompt);
      setCopy(result.trim());
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const copyCopy = async () => {
    await navigator.clipboard.writeText(copy);
    setCopiedCopy(true);
    setTimeout(() => setCopiedCopy(false), 2000);
  };

  // Refaz a legenda usando os valores ATUAIS digitados no modal
  // (faturamento, lucro, locacao, preco, titulo, local) — sem IA.
  const rebuildCopyFromState = () => {
    const cidade = titleCase(negocio.cidade || "");
    const localFmt = local || `${cidade}${negocio.estado ? `/${negocio.estado.toUpperCase()}` : ""}`;

    const descBullets = (negocio.descricao || "")
      .split(/\n|\.\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5 && s.length < 120)
      .slice(0, 6)
      .map((s) => `- ${s.replace(/\.+$/, "")}.`);

    const lines: string[] = [];
    lines.push(`🏢 ${titulo.toUpperCase()}`);
    lines.push(`📍 ${localFmt}`);
    lines.push("");
    if (descBullets.length > 0) {
      lines.push(...descBullets);
      lines.push("");
    }
    if (faturamento.trim()) lines.push(`✅ Faturamento bruto: ${faturamento}`);
    if (lucro.trim())       lines.push(`✅ Lucro Líquido: ${lucro}`);
    if (locacao.trim())     lines.push(`✅ Locação: ${locacao}`);
    if (negocio.area_m2)    lines.push(`✅ Área: ${negocio.area_m2} m²`);
    lines.push("");
    if (preco.trim()) {
      lines.push(`✔ Preço: ${preco} ✔`);
      lines.push("");
    }
    lines.push("O vendedor se compromete a ficar 30 dias trabalhados com o comprador para garantir a transferência do know-how e a apresentação do movimento.");
    lines.push("");
    lines.push("⚠️ Para preservar o sigilo do negócio, não divulgamos o endereço aqui. Agende uma visita.");
    lines.push("");
    lines.push(`💬 Mais informações: ${pageUrl}`);
    lines.push("");
    const cat = (negocio.categoria || "negocio").toLowerCase().replace(/[^a-z0-9]/g, "");
    lines.push(`#NegociaAky #${cat} #Negocios #Empreender #PassoOPonto`);
    setCopy(lines.join("\n"));
  };

  const encodedCopy = encodeURIComponent(copy);
  const encodedUrl = encodeURIComponent(pageUrl);

  const redes = [
    { name: "WhatsApp", icon: MessageCircle, color: "bg-[#25D366] hover:bg-[#1ebe5d]",
      url: `https://wa.me/?text=${encodedCopy}` },
    { name: "Facebook", icon: Facebook, color: "bg-[#1877F2] hover:bg-[#1361c9]",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedCopy}` },
    { name: "X / Twitter", icon: Twitter, color: "bg-black hover:bg-gray-800",
      url: `https://twitter.com/intent/tweet?text=${encodedCopy}` },
    { name: "LinkedIn", icon: Linkedin, color: "bg-[#0A66C2] hover:bg-[#084e94]",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { name: "Telegram", icon: Send, color: "bg-[#26A5E4] hover:bg-[#1e8bbf]",
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedCopy}` },
  ];

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    // Só fecha por clique no fundo em telas grandes — no mobile o backdrop é fullscreen,
    // evita fechamentos acidentais (user tem que usar o X do header).
    if (e.target === e.currentTarget && window.innerWidth >= 640) onClose();
  };

  const copyChars = copy.length;
  const copyLimit = formato === "story" ? 2200 : 2200; // limite IG
  const copyOverLimit = copyChars > copyLimit;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto sm:py-6 sm:px-4"
      onClick={handleBackdrop}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative w-full max-w-5xl sm:rounded-2xl border border-border bg-card shadow-2xl min-h-screen sm:min-h-0">
        {/* Header — sticky no mobile pra sempre ter o X acessível */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-card/95 backdrop-blur-sm"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#007BFF] to-[#00E6FF]">
              <Megaphone className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-lg font-bold text-foreground leading-tight">Gerar arte para redes</h2>
              <p className="text-xs text-muted-foreground truncate">{negocio.titulo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:bg-muted/80 active:scale-95 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid lg:grid-cols-[440px_1fr]">
          {/* ─── Preview (esquerda no desktop / topo no mobile) ─────────── */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6 border-b lg:border-b-0 lg:border-r border-border lg:sticky lg:top-0 lg:self-start lg:max-h-screen lg:overflow-y-auto">
            {/* Segmented control formato */}
            <div className="flex p-1 mb-4 rounded-xl bg-white/5 border border-white/10">
              {(Object.keys(DIMENSOES) as Formato[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormato(f)}
                  disabled={exporting}
                  className={`flex-1 rounded-lg px-2 py-2 text-[11px] font-bold transition-all disabled:opacity-40 ${
                    formato === f
                      ? "bg-white text-slate-900 shadow"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  {DIMENSOES[f].label}
                </button>
              ))}
            </div>

            {/* Canvas preview — limites otimizados pra mobile (menor) e desktop (maior) */}
            <div className="relative rounded-xl overflow-hidden bg-black flex items-center justify-center mx-auto"
                 style={{
                   aspectRatio: DIMENSOES[formato].aspect,
                   maxHeight: DIMENSOES[formato].isVideo || formato === "story"
                     ? "min(56vh, 560px)"
                     : "min(40vh, 420px)",
                   maxWidth: DIMENSOES[formato].isVideo || formato === "story" ? 315 : "100%",
                 }}>
              {imgLoading && (
                <div className="absolute inset-0 z-10 bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain"
                style={{ display: "block" }}
              />
              {!imgSrc && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/40 text-white hover:bg-black/50 transition-colors"
                >
                  <Upload className="h-8 w-8" />
                  <span className="text-sm font-semibold">Clique para subir foto</span>
                </button>
              )}
            </div>

            {/* Ações principais — height confortável + active states */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={exporting}
                className="flex items-center justify-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/15 px-3 py-3 sm:py-2.5 text-sm sm:text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-40 min-h-[44px]"
              >
                <Upload className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                {imgSrc ? "Trocar foto" : "Subir foto"}
              </button>
              {formato === "reels" ? (
                <button
                  onClick={handleExportVideo}
                  disabled={!imgSrc || exporting}
                  className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 px-3 py-3 sm:py-2.5 text-sm sm:text-xs font-bold text-white hover:opacity-95 active:opacity-90 active:scale-95 disabled:opacity-40 transition-all min-h-[44px]"
                >
                  {exporting ? (
                    <><Loader2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 animate-spin" /> {exportProgress}%</>
                  ) : (
                    <><Download className="h-4 w-4 sm:h-3.5 sm:w-3.5" /> Gerar vídeo</>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleDownload}
                  disabled={!imgSrc}
                  className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#007BFF] to-[#00E6FF] px-3 py-3 sm:py-2.5 text-sm sm:text-xs font-bold text-white hover:opacity-95 active:opacity-90 active:scale-95 disabled:opacity-40 transition-all min-h-[44px]"
                >
                  <Download className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                  Baixar PNG
                </button>
              )}
            </div>

            {/* Barra de progresso quando exportando */}
            {exporting && (
              <div className="mt-3">
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-100"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-white/60 mt-1 text-center">
                  Renderizando frame {Math.round(exportProgress * REELS_DURATION_S * REELS_FPS / 100)}/{REELS_DURATION_S * REELS_FPS}…
                </p>
              </div>
            )}

            <p className="mt-3 text-[11px] text-white/50 text-center leading-relaxed">
              {formato === "reels"
                ? "🎬 Reels: vídeo 1080×1920px de 6s com Ken Burns + texto animado. Sai em WebM (o Insta converte)."
                : formato === "story"
                ? "Story: áreas escuras do topo e rodapé ficam atrás dos botões do Instagram"
                : "Feed: arte 1080×1080px, ideal pro perfil"}
            </p>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>

          {/* ─── Editor (direita no desktop / abaixo do preview no mobile) ──── */}
          <div
            className="p-4 sm:p-6 space-y-5"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            {/* SEÇÃO 1: Conteúdo na arte */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Type className="h-4 w-4 text-primary" />
                <h3 className="text-base sm:text-sm font-bold text-foreground">Conteúdo na arte</h3>
              </div>

              {/* Selo: chips preset */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Tag className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground" />
                  <Label className="text-sm sm:text-xs text-muted-foreground font-semibold">Selo de destaque</Label>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SELOS_PRESET.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setHeadline(s);
                        // Auto-aplica tema de cor associado ao selo (consistência no grid)
                        const temaId = SELO_TO_TEMA[s];
                        if (temaId) {
                          const t = TEMAS_COR.find((x) => x.id === temaId);
                          if (t) setTema(t);
                        }
                        // Auto-ativa/desativa CTA:
                        // - desativa pra VENDIDO/ALUGOU (negócio já fechado)
                        // - ativa pra todos os outros (aumenta conversão)
                        if (s === "VENDIDO" || s === "ALUGOU") {
                          setShowCTA(false);
                        } else {
                          setShowCTA(true);
                        }
                      }}
                      className={`rounded-full px-3 py-2 sm:px-2.5 sm:py-1 text-sm sm:text-xs font-bold transition-all active:scale-95 ${
                        headline === s
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Ou digite um selo customizado..."
                  className="h-11 sm:h-9 text-base sm:text-sm"
                />
              </div>

              {/* Tema de cor de acento */}
              <div className="mb-3">
                <Label className="text-sm sm:text-xs text-muted-foreground font-semibold mb-2 block">Cor de destaque</Label>
                <div className="flex flex-wrap gap-1.5">
                  {TEMAS_COR.map((t) => {
                    const isActive = tema.id === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTema(t)}
                        className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-2 sm:px-2.5 sm:py-1 text-sm sm:text-xs font-bold transition-all active:scale-95 ${
                          isActive
                            ? "border-foreground bg-foreground/5 text-foreground"
                            : "border-transparent bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60"
                        }`}
                      >
                        <span
                          className="inline-block h-3.5 w-3.5 sm:h-3 sm:w-3 rounded-full border border-white/20 shadow-sm"
                          style={{ background: t.hex }}
                        />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                  {/* Custom color */}
                  <button
                    onClick={() => setTema({ id: "custom", label: "Custom", hex: customColor, hexDark: customColor, emoji: "🎨" })}
                    className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-2 sm:px-2.5 sm:py-1 text-sm sm:text-xs font-bold transition-all active:scale-95 ${
                      tema.id === "custom"
                        ? "border-foreground bg-foreground/5 text-foreground"
                        : "border-transparent bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/60"
                    }`}
                  >
                    <span
                      className="inline-block h-3.5 w-3.5 sm:h-3 sm:w-3 rounded-full border border-white/20 shadow-sm"
                      style={{ background: customColor }}
                    />
                    Custom
                  </button>
                </div>
                {tema.id === "custom" && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        setTema({ id: "custom", label: "Custom", hex: e.target.value, hexDark: e.target.value, emoji: "🎨" });
                      }}
                      className="h-8 w-12 rounded cursor-pointer border border-border"
                    />
                    <span className="text-[11px] text-muted-foreground font-mono">{customColor.toUpperCase()}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm sm:text-xs text-muted-foreground font-semibold">
                      Título do anúncio
                      <span className="font-normal text-muted-foreground/70 ml-1">(Enter quebra linha)</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setTitulo(smartTitleCase(titulo))}
                      className="flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] sm:text-[10px] font-bold text-amber-700 hover:bg-amber-100 active:scale-95 transition-all"
                      title="Formatar em Title Case"
                    >
                      Aa
                    </button>
                  </div>
                  <Textarea
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    rows={2}
                    maxLength={120}
                    className="text-base sm:text-sm font-medium resize-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground" />
                      <Label className="text-sm sm:text-xs text-muted-foreground font-semibold">
                        Local / Bairro
                        <span className="font-normal text-muted-foreground/70 ml-1">(Enter quebra linha)</span>
                      </Label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLocal(smartTitleCase(local))}
                      className="flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-1 text-[11px] sm:text-[10px] font-bold text-amber-700 hover:bg-amber-100 active:scale-95 transition-all"
                      title="Formatar em Title Case"
                    >
                      Aa
                    </button>
                  </div>
                  <Textarea
                    value={local}
                    onChange={(e) => setLocal(e.target.value)}
                    placeholder="Pinheiros"
                    rows={2}
                    maxLength={120}
                    className="text-base sm:text-sm resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm sm:text-xs text-muted-foreground font-semibold">Faturamento (opcional)</Label>
                    <Input
                      value={faturamento}
                      onChange={(e) => setFaturamento(e.target.value)}
                      placeholder="R$ 360 Mil"
                      className="mt-1 h-11 sm:h-9 text-base sm:text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm sm:text-xs text-muted-foreground font-semibold">Lucro líquido (opcional)</Label>
                    <Input
                      value={lucro}
                      onChange={(e) => setLucro(e.target.value)}
                      placeholder="R$ 70 Mil"
                      className="mt-1 h-11 sm:h-9 text-base sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm sm:text-xs text-muted-foreground font-semibold">Valor locação (opcional)</Label>
                    <Input
                      value={locacao}
                      onChange={(e) => setLocacao(e.target.value)}
                      placeholder="R$ 8 Mil/mês"
                      className="mt-1 h-11 sm:h-9 text-base sm:text-sm"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <DollarSign className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-muted-foreground" />
                      <Label className="text-sm sm:text-xs text-muted-foreground font-semibold">Valor destaque (pill)</Label>
                    </div>
                    <Input
                      value={preco}
                      onChange={(e) => setPreco(e.target.value)}
                      placeholder="R$ 150 Mil"
                      className="h-11 sm:h-9 text-base sm:text-sm font-bold"
                    />
                  </div>
                </div>
                <p className="text-xs sm:text-[11px] text-muted-foreground">
                  💡 Formato curto: "R$ 360 Mil", "R$ 1,2 Mi", "R$ 8 Mil/mês"
                </p>

                {/* Seletor: qual métrica vai no pill destacado */}
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 mt-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="h-3 w-3 text-violet-500" />
                    <Label className="text-sm sm:text-xs font-bold">Métrica em destaque (pill)</Label>
                  </div>
                  <p className="text-xs sm:text-[11px] text-muted-foreground mb-2">
                    Qual número vai no pill grande colorido (estilo META)
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([
                      { id: "valor",       label: "Valor",       short: "Valor" },
                      { id: "lucro",       label: "Lucro",       short: "Lucro" },
                      { id: "faturamento", label: "Faturamento", short: "Fat." },
                      { id: "locacao",     label: "Locação",     short: "Loc." },
                    ] as { id: DestaqueMetrica; label: string; short: string }[]).map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setDestaque(d.id)}
                        className={`rounded-md px-2 py-2.5 sm:py-1.5 text-sm sm:text-xs font-bold transition-all active:scale-95 ${
                          destaque === d.id
                            ? "text-white shadow"
                            : "bg-card border border-border text-muted-foreground hover:text-foreground"
                        }`}
                        style={destaque === d.id ? { background: tema.id === "custom" ? customColor : tema.hex } : {}}
                      >
                        {d.short}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle: CTA opcional no rodapé */}
                <div className="rounded-lg border border-border bg-muted/30 p-2.5 mt-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm sm:text-xs font-bold flex items-center gap-1.5">
                        <Megaphone className="h-3.5 w-3.5 sm:h-3 sm:w-3 text-primary" />
                        CTA opcional (acima da logo)
                      </Label>
                      <p className="text-xs sm:text-[11px] text-muted-foreground mt-1 leading-tight">
                        Adiciona um pill com chamada pra ação no rodapé
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCTA(!showCTA)}
                      role="switch"
                      aria-checked={showCTA}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors active:scale-95 ${
                        showCTA ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${
                          showCTA ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  {showCTA && (
                    <div className="mt-2.5 space-y-2">
                      <Input
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        placeholder="Texto do CTA"
                        maxLength={40}
                        className="h-11 sm:h-9 text-base sm:text-sm font-semibold"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "💬 INTERESSE? MANDE DM",
                          "📲 LINK NA BIO",
                          "🔗 NEGOCIAAKY.COM.BR",
                          "👇 CHAMA NO WHATS",
                          "📞 AGENDE UMA VISITA",
                        ].map((preset) => (
                          <button
                            key={preset}
                            onClick={() => setCtaText(preset)}
                            className={`rounded-full px-2.5 py-1 text-xs sm:text-[11px] font-bold transition-all active:scale-95 ${
                              ctaText === preset
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SEÇÃO 2: Legenda */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <h3 className="text-base sm:text-sm font-bold text-foreground">Legenda do post</h3>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={rebuildCopyFromState}
                    className="flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 sm:py-1 text-sm sm:text-xs font-bold text-amber-700 hover:bg-amber-100 active:bg-amber-200 active:scale-95 transition-all"
                    title="Refazer com os valores que você digitou (sem IA)"
                  >
                    <Sparkles className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                    Template
                  </button>
                  <button
                    onClick={handleRegenerarCopy}
                    disabled={aiLoading}
                    className="flex items-center gap-1 rounded-lg bg-violet-50 border border-violet-200 px-3 py-1.5 sm:py-1 text-sm sm:text-xs font-bold text-violet-700 hover:bg-violet-100 active:bg-violet-200 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    {aiLoading
                      ? <Loader2 className="h-3.5 w-3.5 sm:h-3 sm:w-3 animate-spin" />
                      : <Wand2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
                    {aiLoading ? "Gerando..." : "IA"}
                  </button>
                  <button
                    onClick={copyCopy}
                    className="flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 sm:py-1 text-sm sm:text-xs font-bold text-primary hover:bg-primary/15 active:bg-primary/20 active:scale-95 transition-all"
                  >
                    {copiedCopy ? <Check className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> : <Copy className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
                    {copiedCopy ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
              <Textarea
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                rows={7}
                className="text-base sm:text-xs leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[10px] text-muted-foreground">
                  Edite à vontade. A IA pode regerar com base nos dados do anúncio.
                </p>
                <span className={`text-[10px] font-mono ${copyOverLimit ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                  {copyChars}/{copyLimit}
                </span>
              </div>
            </div>

            {/* SEÇÃO 3: Workflow de publicação */}
            <div className="pt-4 border-t border-border">
              <h3 className="text-base sm:text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Como publicar
              </h3>

              {/* Checklist 3 passos */}
              <div className="space-y-2 mb-3">
                {/* Passo 1: Baixar arte */}
                <div className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${
                  artDownloaded ? "border-green-200 bg-green-50" : "border-primary/40 bg-primary/5"
                }`}>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    artDownloaded ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
                  }`}>
                    {artDownloaded ? <Check className="h-3.5 w-3.5" /> : "1"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">
                      {formato === "reels" ? "Gerar o vídeo Reels" : "Baixar a arte"}
                    </p>
                    <p className="text-[11px] sm:text-[10px] text-muted-foreground leading-tight">
                      {formato === "reels"
                        ? "Renderiza 6s animados e salva como WebM"
                        : "Salva o PNG no seu computador/celular"}
                    </p>
                  </div>
                  <button
                    onClick={formato === "reels" ? handleExportVideo : handleDownload}
                    disabled={!imgSrc || exporting}
                    className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 sm:py-1.5 text-sm sm:text-xs font-bold text-primary-foreground hover:bg-primary/90 active:bg-primary/80 active:scale-95 disabled:opacity-40 transition-all min-w-[80px] justify-center"
                  >
                    {exporting ? <Loader2 className="h-3.5 w-3.5 sm:h-3 sm:w-3 animate-spin" /> : <Download className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
                    {formato === "reels" ? (exporting ? `${exportProgress}%` : "Gerar") : "Baixar"}
                  </button>
                </div>

                {/* Passo 2: Copiar legenda */}
                <div className={`flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors ${
                  copiedCopy ? "border-green-200 bg-green-50" : "border-border bg-card"
                }`}>
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    copiedCopy ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {copiedCopy ? <Check className="h-3.5 w-3.5" /> : "2"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground">Copiar a legenda</p>
                    <p className="text-[11px] sm:text-[10px] text-muted-foreground leading-tight">Pra colar como caption do post</p>
                  </div>
                  <button
                    onClick={copyCopy}
                    className="flex items-center gap-1 rounded-lg bg-muted border border-border px-3 py-2 sm:py-1.5 text-sm sm:text-xs font-bold text-foreground hover:bg-muted/80 active:bg-muted/60 active:scale-95 transition-all min-w-[80px] justify-center"
                  >
                    {copiedCopy ? <Check className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> : <Copy className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
                    {copiedCopy ? "Copiado" : "Copiar"}
                  </button>
                </div>

                {/* Passo 3: Abrir rede */}
                <div className={`rounded-lg border p-2.5 transition-colors ${
                  artDownloaded ? "border-border bg-card" : "border-border bg-muted/30 opacity-60"
                }`}>
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">
                      3
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">Abrir a rede e subir a foto</p>
                      <p className="text-[11px] sm:text-[10px] text-muted-foreground leading-tight">A legenda já vai preenchida. Você só anexa o PNG.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {redes.map((r) => {
                      const Icon = r.icon;
                      return (
                        <a
                          key={r.name}
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Abrir ${r.name}`}
                          className={`flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-3 sm:py-2 text-[11px] sm:text-[10px] font-bold text-white transition-all active:scale-95 ${r.color} ${
                            !artDownloaded ? "pointer-events-none" : ""
                          }`}
                        >
                          <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
                          <span className="leading-none">{r.name.split(" ")[0]}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Aviso importante */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex items-start gap-2 mb-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold mt-0.5">!</div>
                <div className="text-[11px] text-amber-900 leading-relaxed">
                  <strong>Por que precisa subir manual?</strong> As redes sociais não permitem upload de imagem por link (segurança). A legenda vai pronta, mas a foto você anexa lá.
                </div>
              </div>

              {/* Dica Instagram */}
              <div className="rounded-lg border border-pink-200 bg-gradient-to-r from-pink-50 to-violet-50 p-2.5 flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-pink-500 to-violet-500 mt-0.5">
                  <Instagram className="h-3 w-3 text-white" />
                </div>
                <div className="text-[11px] text-foreground leading-relaxed">
                  <strong>Instagram:</strong> não tem botão de "abrir" porque o Insta não aceita link de compartilhamento. Use o app do celular: nova publicação → seleciona a arte baixada → cola a legenda.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Helpers de canvas ────────────────────────────────────────────────────

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number, w: number, h: number
) {
  const ir = img.width / img.height;
  const cr = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (ir > cr) {
    sw = img.height * cr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / cr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function drawPin(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  // pin shape (drop pin)
  const cx = x + size / 2;
  const cy = y + size * 0.4;
  ctx.arc(cx, cy, size * 0.38, Math.PI, 0);
  ctx.lineTo(cx, y + size);
  ctx.lineTo(x + size * 0.12, cy);
  ctx.closePath();
  ctx.fill();
  // furinho
  ctx.fillStyle = "#0D1117";
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, spacing: number,
  align: "left" | "right" | "center" = "left"
) {
  let totalW = 0;
  for (const ch of text) totalW += ctx.measureText(ch).width + spacing;
  totalW -= spacing;
  let cx = x;
  if (align === "right") cx = x - totalW;
  else if (align === "center") cx = x - totalW / 2;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

// Formato curto pra criativos: R$ 360 Mil / R$ 1,2 Mi
function formatCurrencyShort(v: number): string {
  if (!v && v !== 0) return "";
  if (v >= 1_000_000) {
    const mi = v / 1_000_000;
    const fmt = mi >= 10 ? mi.toFixed(0) : mi.toFixed(1).replace(".", ",");
    return `R$ ${fmt} Mi`;
  }
  if (v >= 1000) {
    return `R$ ${Math.round(v / 1000)} Mil`;
  }
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

// Title Case brasileiro — mantém preposições/artigos curtos em minúsculo
function smartTitleCase(s: string): string {
  if (!s) return s;
  const minor = new Set([
    "de","da","do","das","dos","e","em","a","o","na","no",
    "com","por","para","pelo","pela","ao","aos","às","à"
  ]);
  return s.split("\n").map((line) =>
    line.split(/\s+/).map((w, i) => {
      const lower = w.toLowerCase();
      // Preserva sigla/abreviação se já tava toda em CAPS (ex: SP, CEP, EST.)
      if (w.length > 1 && w === w.toUpperCase() && /[A-Z]/.test(w)) return w;
      if (i > 0 && minor.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    }).join(" ")
  ).join("\n");
}

// Converte hex (#RRGGBB ou #RGB) pra rgba com alpha
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Define o label do pill conforme o selo escolhido
function pickValorLabel(headline: string): string {
  const h = headline.toUpperCase().trim();
  if (h.includes("PASSA")) return "Passo o Ponto";
  if (h.includes("FRANQUIA") || h.includes("INVEST")) return "Investimento";
  if (h.includes("ALUGA") || h.includes("LOCA")) return "Aluguel";
  if (h.includes("VENDIDO")) return "Vendido por";
  if (h.includes("ALUGOU")) return "Alugado por";
  return "Valor";
}

function fitsInLines(
  ctx: CanvasRenderingContext2D,
  text: string, maxW: number, maxLines: number
): boolean {
  const words = (text || "").split(/\s+/);
  // qualquer palavra individual mais larga que maxW não cabe
  for (const word of words) {
    if (ctx.measureText(word).width > maxW) return false;
  }
  return countLines(ctx, text, maxW, maxLines + 1) <= maxLines;
}

function countLines(
  ctx: CanvasRenderingContext2D,
  text: string, maxW: number, maxLines: number
): number {
  // Quebras manuais (\n) contam como linhas extras
  const segments = (text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  let total = 0;
  for (const seg of segments) {
    const words = seg.split(/\s+/);
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        total++;
        line = word;
        if (total >= maxLines) return maxLines;
      } else {
        line = test;
      }
    }
    if (line) total++;
    if (total >= maxLines) return maxLines;
  }
  return Math.min(total, maxLines);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, maxW: number, lh: number, maxLines: number
): number {
  const words = (text || "").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) {
        // adiciona o resto na última e trunca
        const rest = [word, ...words.slice(words.indexOf(word) + 1)].join(" ");
        let last = rest;
        while (ctx.measureText(last + "…").width > maxW && last.length > 0) {
          last = last.slice(0, -1);
        }
        lines.push(last + (rest.length > last.length ? "…" : ""));
        line = "";
        break;
      }
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return y + (lines.length - 1) * lh;
}

function wrapTextCenter(
  ctx: CanvasRenderingContext2D,
  text: string, cx: number, y: number, maxW: number, lh: number, maxLines: number
): number {
  // Respeita quebras manuais (\n) primeiro, depois auto-wrap em cada segmento
  const manualSegments = (text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  const lines: string[] = [];

  const pushWithAutoWrap = (segment: string) => {
    const words = segment.split(/\s+/);
    let line = "";
    for (const word of words) {
      if (lines.length >= maxLines) return;
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
  };

  for (const seg of manualSegments) {
    if (lines.length >= maxLines) break;
    pushWithAutoWrap(seg);
  }

  // Trunca última linha se ainda tem texto sobrando (estourou maxLines)
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxW) {
      let t = last;
      while (ctx.measureText(t + "…").width > maxW && t.length > 0) t = t.slice(0, -1);
      lines[maxLines - 1] = t + "…";
    }
  }

  const prevAlign = ctx.textAlign;
  ctx.textAlign = "center";
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lh));
  ctx.textAlign = prevAlign;
  return y + (Math.max(1, lines.length) - 1) * lh;
}

// Formato de legenda inspirado no META Negócios:
// - Bullets de descrição
// - Métricas com ✅
// - Preço com ✔ nos dois lados
// - Compromisso do vendedor
// - Aviso de privacidade
function buildDefaultCopy(n: Negocio, url: string): string {
  const cidade = titleCase(n.cidade || "");
  const local = n.bairro ? `${titleCase(n.bairro)} — ${cidade}/${(n.estado || "").toUpperCase()}` :
                           `${cidade}${n.estado ? `/${n.estado.toUpperCase()}` : ""}`;

  // Quebra descrição em linhas bullet (se tiver linhas separadas ou frases curtas)
  const descBullets = (n.descricao || "")
    .split(/\n|\.\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5 && s.length < 120)
    .slice(0, 6)
    .map((s) => `- ${s.replace(/\.+$/, "")}.`);

  const parts: string[] = [];

  // Título / abertura
  parts.push(`🏢 ${n.titulo.toUpperCase()}`);
  parts.push(`📍 ${local}`);
  parts.push("");

  // Bullets de descrição
  if (descBullets.length > 0) {
    parts.push(...descBullets);
    parts.push("");
  }

  // Métricas financeiras com ✅
  if (n.faturamento_mensal) {
    parts.push(`✅ Faturamento bruto: ${formatCurrency(n.faturamento_mensal)}`);
  }
  // Lucro e Locação ficam preenchidos pelo admin no modal — coloca placeholders
  parts.push("✅ Lucro Líquido: a confirmar");

  if (n.area_m2) {
    parts.push(`✅ Área: ${n.area_m2} m²`);
  }
  parts.push("");

  // Preço com ✔ nos dois lados (estilo META)
  if (n.preco) {
    parts.push(`✔ Preço: ${formatCurrency(n.preco)} ✔`);
    parts.push("");
  }

  // Bloco de compromisso (template padrão META)
  parts.push(
    "O vendedor se compromete a ficar 30 dias trabalhados com o comprador para garantir a transferência do know-how e a apresentação do movimento."
  );
  parts.push("");

  // Aviso de privacidade + CTA
  parts.push("⚠️ Para preservar o sigilo do negócio, não divulgamos o endereço aqui.");
  parts.push("");
  parts.push(`💬 Quer agendar uma visita? Acesse: ${url}`);
  parts.push("");

  // Hashtags
  const cat = (n.categoria || "negocio").toLowerCase().replace(/[^a-z0-9]/g, "");
  parts.push(`#NegociaAky #${cat} #Negocios #Empreender #PassoOPonto #Oportunidade`);

  return parts.join("\n");
}

export default PublicarRedesModal;
