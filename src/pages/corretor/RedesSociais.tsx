import { useEffect, useRef, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { supabase } from "@/lib/supabase";
import { callClaude } from "@/lib/anthropic";
import { getAllNegocios, formatCurrency, type Negocio } from "@/stores/negocioStore";
import {
  Instagram, MessageCircle, Download, Copy, Check, Loader2,
  Sparkles, Search, Megaphone, RefreshCw, ChevronLeft,
  Store, TrendingUp, Target, Package, Film,
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
// Nunca exibe "Administrador" nas artes. Quando o nome é vazio ou genérico,
// usa o nome da marca como assinatura institucional.
function getDisplayName(name: string) {
  const n = (name || "").trim();
  if (!n || n.toLowerCase() === "administrador") return "NegociaAky";
  return n;
}
function getDisplayRole(name: string) {
  const n = (name || "").trim();
  if (!n || n.toLowerCase() === "administrador") return "Plataforma de Negócios";
  return "Corretor de Negócios";
}
// Detecta se o negócio é locação/aluguel (vs venda).
// Olha badge_texto, descrição e título — cobre verbos (alugar/alugue),
// substantivos (aluguel/locação) e campo "Operação: ...".
function isLocacao(n: Negocio): boolean {
  const badge = (n.badge_texto || "").toUpperCase();
  if (badge.includes("LOCAÇÃO") || badge.includes("LOCACAO") || badge.includes("ALUGUEL") || badge.includes("ALUGA")) return true;
  const txt = `${n.descricao || ""} ${n.titulo || ""}`.toLowerCase();
  // Campo explícito do formulário
  if (txt.includes("operação: locação") || txt.includes("operacao: locacao")) return true;
  if (txt.includes("operação: venda e locação") || txt.includes("operacao: venda e locacao")) return true;
  // Palavras-chave de locação no texto (verbos, substantivos, expressões)
  const keywords = [
    "para alugar", "pra alugar", "aluga-se", "aluga se",
    "para locação", "para locacao", "pra locação", "pra locacao",
    "para locar", "pra locar",
    "aluguel mensal", "valor do aluguel", "para aluguel", "pra aluguel",
    "disponível para locação", "disponivel para locacao",
  ];
  if (keywords.some((k) => txt.includes(k))) return true;
  return false;
}
// Mantém o bairro como o corretor cadastrou (inclui sub-localização tipo "Jardim Ângela - Menininha").
function cleanBairro(bairro: string | null | undefined): string {
  return (bairro || "").trim();
}
// Rótulos contextuais (venda vs locação)
function valueLabel(n: Negocio) { return isLocacao(n) ? "Valor do Aluguel" : "Valor de Venda"; }
function ctaLabel(n: Negocio)   { return isLocacao(n) ? "📲 Quero alugar!"  : "📲 Quero esse negócio!"; }
function opLabel(n: Negocio)    { return isLocacao(n) ? "LOCAÇÃO"           : "VENDA"; }
// True quando o profile é a assinatura institucional NegociaAky (sem corretor real logado).
function isInstitutional(name: string) {
  const n = (name || "").trim();
  return !n || n.toLowerCase() === "administrador";
}
// Localização compacta priorizando o bairro
function localText(n: Negocio) {
  const b = cleanBairro((n as Negocio & { bairro?: string | null }).bairro);
  return b || n.cidade;
}

// ─── POST INSTAGRAM (360×360) ─────────────────────────────────────────────────
function PostInstagram({ negocio, profile, divRef }: {
  negocio: Negocio; profile: Profile; divRef: React.RefObject<HTMLDivElement>;
}) {
  const c = getCat(negocio.categoria);
  const PHOTO_H = 200; // foto maior (era 148) — visual cinema
  const TOTAL_H = 360;
  const ehLocacao = isLocacao(negocio);

  return (
    <div ref={divRef} style={{
      width: 360, height: TOTAL_H, borderRadius: 14, overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: "Arial, Helvetica, sans-serif", boxSizing: "border-box",
      position: "relative",
      background: c.bg1,
    }}>
      {/* ── HERO PHOTO ── */}
      <div style={{
        height: PHOTO_H, flexShrink: 0, position: "relative",
        background: `radial-gradient(ellipse at 70% 30%, ${c.bg2} 0%, ${c.photo} 100%)`,
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
      }}>
        {/* Real photo */}
        {negocio.foto_url && (
          <>
            <img src={negocio.foto_url} crossOrigin="anonymous"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0.40) 0%, rgba(0,0,0,0.10) 35%, rgba(0,0,0,0.45) 75%, ${c.bg1} 100%)` }} />
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 75% 25%, ${c.accent}22 0%, transparent 60%)` }} />
          </>
        )}

        {/* Placeholder */}
        {!negocio.foto_url && <>
          <div style={{ position: "absolute", top: "45%", left: "50%", transform: "translate(-50%,-50%)", width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${c.accent}28 0%, transparent 70%)` }} />
          <div style={{ fontSize: 72, filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.55))", zIndex: 1 }}>
            {getCat(negocio.categoria).icon}
          </div>
        </>}

        {/* Selo VERIFICADO top-left */}
        <div style={{ position: "absolute", top: 12, left: 14, zIndex: 3, display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.55)", border: `1px solid ${c.accent}80`, borderRadius: 20, padding: "3px 9px", backdropFilter: "blur(4px)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.accent, boxShadow: `0 0 8px ${c.accent}` }} />
          <span style={{ fontSize: 7.5, color: c.light, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>Verificado</span>
        </div>

        {/* Pílula OPERAÇÃO top-right (única, destaque) */}
        <div style={{ position: "absolute", top: 12, right: 14, zIndex: 3, background: c.accent, color: "#001", borderRadius: 20, padding: "4px 13px", fontSize: 10, fontWeight: 900, letterSpacing: 1.5, boxShadow: `0 3px 12px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(255,255,255,0.15) inset` }}>
          {opLabel(negocio)}
        </div>

        {/* Headline overlaid no rodapé da foto */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 18px 14px", zIndex: 2 }}>
          <div style={{ fontSize: 8.5, color: c.accent, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 5, textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>
            {negocio.categoria}
          </div>
          <div style={{
            fontSize: negocio.titulo.length > 32 ? 16 : negocio.titulo.length > 22 ? 19 : 22,
            fontWeight: 900, color: "#fff", lineHeight: 1.05, letterSpacing: -0.3,
            textShadow: "0 2px 14px rgba(0,0,0,0.85)",
          }}>
            {negocio.titulo}
          </div>
        </div>
      </div>

      {/* Linha acento entre hero e info */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${c.accent} 40%, ${c.light} 70%, transparent 100%)`, opacity: 0.7, zIndex: 1 }} />

      {/* ── INFO AREA ── */}
      <div style={{
        flex: 1, background: c.bg1,
        padding: "12px 16px 0",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
      }}>
        <div>
          {/* Card de PREÇO em destaque */}
          {negocio.preco && (
            <div style={{ background: `linear-gradient(135deg, ${c.accent}28 0%, ${c.accent}10 100%)`, border: `1px solid ${c.accent}55`, borderRadius: 9, padding: "7px 12px", marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 7.5, color: c.accent, letterSpacing: 1.2, textTransform: "uppercase", fontWeight: 700, marginBottom: 1 }}>{valueLabel(negocio)}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", letterSpacing: -0.3, lineHeight: 1 }}>
                  {formatCurrency(negocio.preco)}
                  {ehLocacao && <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.65)", letterSpacing: 0 }}> /mês</span>}
                </div>
              </div>
              {/* Mini stats à direita */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                {negocio.area_m2 && (
                  <span style={{ fontSize: 10, color: "#fff", fontWeight: 700, opacity: 0.85 }}>📐 {negocio.area_m2}m²</span>
                )}
                {!ehLocacao && negocio.faturamento_mensal && (
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>📈 {formatCurrency(negocio.faturamento_mensal)}/mês</span>
                )}
              </div>
            </div>
          )}
          {/* Localização */}
          {localText(negocio) && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "3px 9px" }}>
              <span style={{ fontSize: 9.5, color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>📍 {localText(negocio)}</span>
            </div>
          )}
        </div>

        {/* Corretor strip */}
        <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)`, padding: "7px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", overflow: "hidden", border: `1.5px solid ${c.accent}`, flexShrink: 0, background: "#0a1228", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {profile.foto_url
                ? <img src={profile.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
                : isInstitutional(profile.nome)
                  ? <img src="/logo-icon.png" alt="NegociaAky" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.35)" }} />
                  : <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>{getInitials(getDisplayName(profile.nome))}</span>
              }
            </div>
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: "#fff" }}>{getDisplayName(profile.nome)}</div>
              <div style={{ fontSize: 8.5, color: "rgba(255,255,255,0.4)" }}>{getDisplayRole(profile.nome)}</div>
            </div>
          </div>
          {profile.telefone && (
            <div style={{ fontSize: 9, color: c.accent, fontWeight: 700, letterSpacing: 0.3 }}>{formatPhone(profile.telefone)}</div>
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
  const PHOTO_H = 270; // foto domina a parte de cima (mais cinema, menos cramped)
  const ehLocacao = isLocacao(negocio);

  return (
    <div ref={divRef} style={{
      width: 270, height: 480, borderRadius: 16, overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: "Arial, Helvetica, sans-serif", boxSizing: "border-box",
      position: "relative",
      background: c.bg1,
    }}>
      {/* ── HERO PHOTO ── */}
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
            {/* Gradient overlay limpo (sem ghost text, sem fade duplo) */}
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.12) 35%, rgba(0,0,0,0.45) 70%, ${c.bg1} 100%)` }} />
            {/* Tint sutil da categoria */}
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 75% 25%, ${c.accent}22 0%, transparent 60%)` }} />
          </>
        )}

        {/* Placeholder quando não tem foto */}
        {!negocio.foto_url && <>
          <div style={{ position: "absolute", top: "40%", left: "50%", transform: "translate(-50%,-50%)", width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${c.accent}30 0%, transparent 70%)` }} />
          <div style={{ fontSize: 90, filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.6))", zIndex: 1 }}>
            {getCat(negocio.categoria).icon}
          </div>
        </>}

        {/* Selo "VERIFICADO" top-left */}
        <div style={{ position: "absolute", top: 13, left: 14, zIndex: 3, display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.55)", border: `1px solid ${c.accent}80`, borderRadius: 20, padding: "3px 9px", backdropFilter: "blur(4px)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: c.accent, boxShadow: `0 0 8px ${c.accent}` }} />
          <span style={{ fontSize: 7.5, color: c.light, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>Verificado</span>
        </div>

        {/* Pílula de OPERAÇÃO top-right (única, em destaque) */}
        <div style={{ position: "absolute", top: 13, right: 14, zIndex: 3, background: c.accent, color: "#001", borderRadius: 20, padding: "4px 12px", fontSize: 10, fontWeight: 900, letterSpacing: 1.5, boxShadow: `0 3px 12px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(255,255,255,0.15) inset` }}>
          {opLabel(negocio)}
        </div>

        {/* Headline overlaid no rodapé da foto */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 18px 14px", zIndex: 2 }}>
          <div style={{ fontSize: 8, color: c.accent, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6, textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>
            {negocio.categoria}
          </div>
          <div style={{
            fontSize: negocio.titulo.length > 32 ? 17 : negocio.titulo.length > 22 ? 19 : 22,
            fontWeight: 900, color: "#fff", lineHeight: 1.05, letterSpacing: -0.3,
            textShadow: "0 2px 14px rgba(0,0,0,0.85)",
          }}>
            {negocio.titulo}
          </div>
        </div>
      </div>

      {/* Linha acento entre hero e info */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${c.accent} 40%, ${c.light} 70%, transparent 100%)`, opacity: 0.7, zIndex: 1 }} />

      {/* ── INFO AREA ── */}
      <div style={{
        flex: 1, background: c.bg1,
        padding: "12px 16px 12px",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        position: "relative",
      }}>
        <div>
          {/* Card de PREÇO em destaque */}
          {negocio.preco && (
            <div style={{ background: `linear-gradient(135deg, ${c.accent}28 0%, ${c.accent}10 100%)`, border: `1px solid ${c.accent}55`, borderRadius: 10, padding: "9px 13px", marginBottom: 7 }}>
              <div style={{ fontSize: 8, color: c.accent, letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 2, fontWeight: 700 }}>{valueLabel(negocio)}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: -0.5, lineHeight: 1 }}>
                {formatCurrency(negocio.preco)}
                {ehLocacao && <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", letterSpacing: 0 }}> /mês</span>}
              </div>
            </div>
          )}

          {/* Mini-cards: Área · (Faturamento ou Local) — sempre 2 colunas iguais */}
          <div style={{ display: "flex", gap: 5 }}>
            {negocio.area_m2 && (
              <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 8px" }}>
                <div style={{ fontSize: 7.5, color: "rgba(255,255,255,0.45)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 1 }}>📐 Área</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{negocio.area_m2}m²</div>
              </div>
            )}
            {!ehLocacao && negocio.faturamento_mensal && (
              <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 8px" }}>
                <div style={{ fontSize: 7.5, color: "rgba(255,255,255,0.45)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 1 }}>📈 Faturamento</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{formatCurrency(negocio.faturamento_mensal)}/mês</div>
              </div>
            )}
            {localText(negocio) && (
              <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 8px", minWidth: 0 }}>
                <div style={{ fontSize: 7.5, color: "rgba(255,255,255,0.45)", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 1 }}>📍 Local</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{localText(negocio)}</div>
              </div>
            )}
          </div>
        </div>

        {/* CTA + Corretor strip */}
        <div>
          {/* CTA pill */}
          <div style={{ background: `linear-gradient(135deg, ${c.accent} 0%, ${c.light} 100%)`, borderRadius: 50, padding: "11px 0", textAlign: "center", fontSize: 13, fontWeight: 900, color: "#001", marginBottom: 8, letterSpacing: 0.3, boxShadow: `0 4px 14px ${c.accent}40` }}>
            {ctaLabel(negocio)}
          </div>
          {/* Corretor */}
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 9, padding: "7px 11px" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", border: `1.5px solid ${c.accent}`, flexShrink: 0, background: "#0a1228", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {profile.foto_url
                ? <img src={profile.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
                : isInstitutional(profile.nome)
                  ? <img src="/logo-icon.png" alt="NegociaAky" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.35)" }} />
                  : <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>{getInitials(getDisplayName(profile.nome))}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getDisplayName(profile.nome)}</div>
              {profile.telefone && <div style={{ fontSize: 9, color: c.accent, fontWeight: 600, letterSpacing: 0.3 }}>{formatPhone(profile.telefone)}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Captação: Vendedor (360×360) ────────────────────────────────────────────
function PostCaptacaoVendedor({ profile, bairro, heroUrl, formato, divRef }: {
  profile: Profile; bairro: string; heroUrl: string; formato: "post" | "story" | "reels" | "status"; divRef: React.RefObject<HTMLDivElement>;
}) {
  const isPortrait = formato === "story" || formato === "reels" || formato === "status";
  const W = isPortrait ? 270 : 360;
  const H = isPortrait ? 480 : 360;
  const PHOTO_H = isPortrait ? 250 : 165;

  return (
    <div ref={divRef} style={{
      width: W, height: H, borderRadius: 14, overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: "Arial, Helvetica, sans-serif",
      background: "linear-gradient(180deg, #03110a 0%, #061e10 60%, #082818 100%)",
      position: "relative", boxSizing: "border-box",
    }}>
      {/* ── HERO: foto + headline overlaid ── */}
      <div style={{ height: PHOTO_H, position: "relative", flexShrink: 0, overflow: "hidden" }}>
        <img src={heroUrl} crossOrigin="anonymous"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        {/* Dark gradient overlay for legibility */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,15,8,0.50) 0%, rgba(2,15,8,0.30) 30%, rgba(2,15,8,0.97) 100%)" }} />
        {/* Subtle green tint top-right */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 75% 25%, rgba(34,197,94,0.22) 0%, transparent 60%)" }} />

        {/* Selo de credibilidade top-left */}
        <div style={{ position: "absolute", top: 14, left: 16, zIndex: 3, display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(34,197,94,0.45)", borderRadius: 20, padding: "3px 9px", backdropFilter: "blur(4px)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
          <span style={{ fontSize: 8, color: "#d1fae5", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Avaliação grátis</span>
        </div>

        {/* Headline overlaid */}
        <div style={{ position: "absolute", inset: 0, padding: isPortrait ? "22px 22px 24px" : "18px 20px", display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 2 }}>
          <div style={{ fontSize: 8.5, color: "#4ade80", fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 7, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            Hora de virar a página
          </div>
          <div style={{ fontSize: isPortrait ? 30 : 25, fontWeight: 900, color: "#fff", lineHeight: 1.02, letterSpacing: -0.3, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>
            Seu negócio vale<br /><span style={{ background: "linear-gradient(90deg, #4ade80, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>mais</span> do que você pensa.
          </div>
        </div>
      </div>

      {/* Background decorations no rodapé */}
      <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, #16a34a18 0%, transparent 70%)", zIndex: 0 }} />
      {/* Linha acento gold-on-green */}
      <div style={{ position: "absolute", top: PHOTO_H - 1, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent 0%, #4ade80 30%, #22d3ee 70%, transparent 100%)", zIndex: 1, opacity: 0.65 }} />

      {/* ── INFO AREA ── */}
      <div style={{ flex: 1, position: "relative", zIndex: 2, padding: isPortrait ? "20px 22px 0" : "16px 18px 0", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
        {/* Tagline 3 verbos com underline accent */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: isPortrait ? 14 : 12, fontWeight: 800, color: "#fff", letterSpacing: 0.8, marginBottom: 10, textTransform: "uppercase" }}>
          <span style={{ borderBottom: "2px solid #4ade80", paddingBottom: 1 }}>Avaliamos</span>
          <span style={{ color: "#22c55e", fontWeight: 400 }}>—</span>
          <span style={{ borderBottom: "2px solid #4ade80", paddingBottom: 1 }}>Vendemos</span>
          <span style={{ color: "#22c55e", fontWeight: 400 }}>—</span>
          <span style={{ borderBottom: "2px solid #4ade80", paddingBottom: 1 }}>Você lucra</span>
        </div>

        {/* Sub: 3 promessas concretas */}
        <div style={{ fontSize: isPortrait ? 12 : 10.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.5, marginBottom: 14, fontWeight: 500 }}>
          <span style={{ color: "#86efac", fontWeight: 700 }}>Sigilo absoluto.</span>{" "}
          <span style={{ color: "#86efac", fontWeight: 700 }}>Comprador qualificado.</span>{" "}
          <span style={{ color: "#86efac", fontWeight: 700 }}>Você no controle.</span>
        </div>

        {/* Bairro badge */}
        {bairro && (
          <div style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 6, padding: "5px 11px", display: "inline-flex", alignSelf: "flex-start" }}>
            <span style={{ fontSize: 10, color: "#86efac", fontWeight: 700 }}>📍 Atendendo em {bairro}</span>
          </div>
        )}
      </div>

      {/* Bottom: corretor */}
      <div style={{ position: "relative", zIndex: 2, padding: "10px 16px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", border: "2px solid #22c55e", flexShrink: 0, background: "#06231a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {profile.foto_url
            ? <img src={profile.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
            : isInstitutional(profile.nome)
              ? <img src="/logo-icon.png" alt="NegociaAky" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.35)" }} />
              : <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{getInitials(getDisplayName(profile.nome))}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getDisplayName(profile.nome)}</div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.telefone ? formatPhone(profile.telefone) : (profile.creci ? `CRECI ${profile.creci}` : getDisplayRole(profile.nome))}
          </div>
        </div>
        <div style={{ background: "#22c55e", borderRadius: 20, padding: "6px 13px", fontSize: 9, fontWeight: 800, color: "#06231a", boxShadow: "0 2px 8px rgba(34,197,94,0.4)" }}>
          💬 Fale comigo
        </div>
      </div>
    </div>
  );
}

// ─── Captação: Investidor (360×360) ─────────────────────────────────────────
function PostCaptacaoInvestidor({ profile, bairro, heroUrl, formato, divRef }: {
  profile: Profile; bairro: string; heroUrl: string; formato: "post" | "story" | "reels" | "status"; divRef: React.RefObject<HTMLDivElement>;
}) {
  const isPortrait = formato === "story" || formato === "reels" || formato === "status";
  const W = isPortrait ? 270 : 360;
  const H = isPortrait ? 480 : 360;
  const PHOTO_H = isPortrait ? 250 : 165;

  return (
    <div ref={divRef} style={{
      width: W, height: H, borderRadius: 14, overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: "Arial, Helvetica, sans-serif",
      background: "linear-gradient(180deg, #030b1a 0%, #060f2a 60%, #091535 100%)",
      position: "relative", boxSizing: "border-box",
    }}>
      {/* ── HERO: foto + headline overlaid ── */}
      <div style={{ height: PHOTO_H, position: "relative", flexShrink: 0, overflow: "hidden" }}>
        <img src={heroUrl} crossOrigin="anonymous"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(3,11,26,0.50) 0%, rgba(3,11,26,0.30) 30%, rgba(3,11,26,0.97) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 75% 25%, rgba(196,154,30,0.22) 0%, transparent 60%)" }} />

        {/* Selo top-left */}
        <div style={{ position: "absolute", top: 14, left: 16, zIndex: 3, display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(196,154,30,0.5)", borderRadius: 20, padding: "3px 9px", backdropFilter: "blur(4px)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fde047", boxShadow: "0 0 8px #fde047" }} />
          <span style={{ fontSize: 8, color: "#fef3c7", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Curadoria</span>
        </div>

        {/* Headline overlaid */}
        <div style={{ position: "absolute", inset: 0, padding: isPortrait ? "22px 22px 24px" : "18px 20px", display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 2 }}>
          <div style={{ fontSize: 8.5, color: "#fde68a", fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 7, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            Pra quem quer renda real
          </div>
          <div style={{ fontSize: isPortrait ? 30 : 25, fontWeight: 900, color: "#fff", lineHeight: 1.02, letterSpacing: -0.3, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>
            Compre um negócio<br />que <span style={{ background: "linear-gradient(90deg, #fde68a, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>já dá lucro</span>.
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: -40, left: -30, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, #C49A1E15 0%, transparent 70%)", zIndex: 0 }} />
      {/* Linha acento */}
      <div style={{ position: "absolute", top: PHOTO_H - 1, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent 0%, #C49A1E 30%, #fde68a 70%, transparent 100%)", zIndex: 1, opacity: 0.65 }} />

      {/* ── INFO AREA ── */}
      <div style={{ flex: 1, position: "relative", zIndex: 2, padding: isPortrait ? "20px 22px 0" : "16px 18px 0", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: isPortrait ? 14 : 12, fontWeight: 800, color: "#fff", letterSpacing: 0.8, marginBottom: 10, textTransform: "uppercase" }}>
          <span style={{ borderBottom: "2px solid #C49A1E", paddingBottom: 1 }}>Auditado</span>
          <span style={{ color: "#C49A1E", fontWeight: 400 }}>—</span>
          <span style={{ borderBottom: "2px solid #C49A1E", paddingBottom: 1 }}>Lucrativo</span>
          <span style={{ color: "#C49A1E", fontWeight: 400 }}>—</span>
          <span style={{ borderBottom: "2px solid #C49A1E", paddingBottom: 1 }}>Pronto</span>
        </div>

        <div style={{ fontSize: isPortrait ? 12 : 10.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.5, marginBottom: 14, fontWeight: 500 }}>
          <span style={{ color: "#fde68a", fontWeight: 700 }}>Faturamento comprovado.</span>{" "}
          <span style={{ color: "#fde68a", fontWeight: 700 }}>Operação rodando.</span>{" "}
          <span style={{ color: "#fde68a", fontWeight: 700 }}>Chaves em 60 dias.</span>
        </div>

        {bairro && (
          <div style={{ background: "rgba(196,154,30,0.15)", border: "1px solid rgba(196,154,30,0.4)", borderRadius: 6, padding: "5px 11px", display: "inline-flex", alignSelf: "flex-start" }}>
            <span style={{ fontSize: 10, color: "#fde68a", fontWeight: 700 }}>📍 Foco em {bairro}</span>
          </div>
        )}
      </div>

      {/* Bottom: corretor */}
      <div style={{ position: "relative", zIndex: 2, padding: "10px 16px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", border: "2px solid #C49A1E", flexShrink: 0, background: "#1c1208", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {profile.foto_url
            ? <img src={profile.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
            : isInstitutional(profile.nome)
              ? <img src="/logo-icon.png" alt="NegociaAky" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.35)" }} />
              : <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{getInitials(getDisplayName(profile.nome))}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getDisplayName(profile.nome)}</div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.telefone ? formatPhone(profile.telefone) : (profile.creci ? `CRECI ${profile.creci}` : getDisplayRole(profile.nome))}
          </div>
        </div>
        <div style={{ background: "#C49A1E", borderRadius: 20, padding: "6px 13px", fontSize: 9, fontWeight: 800, color: "#1c1208", boxShadow: "0 2px 8px rgba(196,154,30,0.4)" }}>
          💬 Fale comigo
        </div>
      </div>
    </div>
  );
}

// ─── Captação: Proprietário de Imóvel (tema ciano/teal) ──────────────────────
function PostCaptacaoProprietario({ profile, bairro, heroUrl, formato, divRef }: {
  profile: Profile; bairro: string; heroUrl: string; formato: "post" | "story" | "reels" | "status"; divRef: React.RefObject<HTMLDivElement>;
}) {
  const isPortrait = formato === "story" || formato === "reels" || formato === "status";
  const W = isPortrait ? 270 : 360;
  const H = isPortrait ? 480 : 360;
  const PHOTO_H = isPortrait ? 250 : 165;

  return (
    <div ref={divRef} style={{
      width: W, height: H, borderRadius: 14, overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: "Arial, Helvetica, sans-serif",
      background: "linear-gradient(180deg, #031820 0%, #062a35 60%, #083a48 100%)",
      position: "relative", boxSizing: "border-box",
    }}>
      {/* ── HERO: foto + headline overlaid ── */}
      <div style={{ height: PHOTO_H, position: "relative", flexShrink: 0, overflow: "hidden" }}>
        <img src={heroUrl} crossOrigin="anonymous"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(3,24,32,0.50) 0%, rgba(3,24,32,0.30) 30%, rgba(3,24,32,0.97) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 75% 25%, rgba(34,211,238,0.22) 0%, transparent 60%)" }} />

        {/* Selo top-left */}
        <div style={{ position: "absolute", top: 14, left: 16, zIndex: 3, display: "flex", alignItems: "center", gap: 5, background: "rgba(0,0,0,0.55)", border: "1px solid rgba(34,211,238,0.5)", borderRadius: 20, padding: "3px 9px", backdropFilter: "blur(4px)" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 8px #22d3ee" }} />
          <span style={{ fontSize: 8, color: "#cffafe", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Vende ou Aluga</span>
        </div>

        {/* Headline overlaid */}
        <div style={{ position: "absolute", inset: 0, padding: isPortrait ? "22px 22px 24px" : "18px 20px", display: "flex", flexDirection: "column", justifyContent: "flex-end", zIndex: 2 }}>
          <div style={{ fontSize: 8.5, color: "#67e8f9", fontWeight: 800, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 7, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
            Imóvel parado é custo
          </div>
          <div style={{ fontSize: isPortrait ? 30 : 25, fontWeight: 900, color: "#fff", lineHeight: 1.02, letterSpacing: -0.3, textShadow: "0 2px 14px rgba(0,0,0,0.9)" }}>
            Vamos colocar seu<br />imóvel pra <span style={{ background: "linear-gradient(90deg, #67e8f9, #22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>render</span>.
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: -40, left: -30, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, #22d3ee15 0%, transparent 70%)", zIndex: 0 }} />
      {/* Linha acento */}
      <div style={{ position: "absolute", top: PHOTO_H - 1, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent 0%, #22d3ee 30%, #67e8f9 70%, transparent 100%)", zIndex: 1, opacity: 0.65 }} />

      {/* ── INFO AREA ── */}
      <div style={{ flex: 1, position: "relative", zIndex: 2, padding: isPortrait ? "20px 22px 0" : "16px 18px 0", display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: isPortrait ? 14 : 12, fontWeight: 800, color: "#fff", letterSpacing: 0.8, marginBottom: 10, textTransform: "uppercase" }}>
          <span style={{ borderBottom: "2px solid #22d3ee", paddingBottom: 1 }}>Vende</span>
          <span style={{ color: "#22d3ee", fontWeight: 400 }}>—</span>
          <span style={{ borderBottom: "2px solid #22d3ee", paddingBottom: 1 }}>Aluga</span>
          <span style={{ color: "#22d3ee", fontWeight: 400 }}>—</span>
          <span style={{ borderBottom: "2px solid #22d3ee", paddingBottom: 1 }}>Você decide</span>
        </div>

        <div style={{ fontSize: isPortrait ? 12 : 10.5, color: "rgba(255,255,255,0.78)", lineHeight: 1.5, marginBottom: 14, fontWeight: 500 }}>
          <span style={{ color: "#67e8f9", fontWeight: 700 }}>Avaliação grátis.</span>{" "}
          <span style={{ color: "#67e8f9", fontWeight: 700 }}>Divulgação completa.</span>{" "}
          <span style={{ color: "#67e8f9", fontWeight: 700 }}>Inquilino ou comprador certo.</span>
        </div>

        {bairro && (
          <div style={{ background: "rgba(34,211,238,0.15)", border: "1px solid rgba(34,211,238,0.4)", borderRadius: 6, padding: "5px 11px", display: "inline-flex", alignSelf: "flex-start" }}>
            <span style={{ fontSize: 10, color: "#cffafe", fontWeight: 700 }}>📍 Atendendo em {bairro}</span>
          </div>
        )}
      </div>

      {/* Bottom: corretor */}
      <div style={{ position: "relative", zIndex: 2, padding: "10px 16px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", border: "2px solid #22d3ee", flexShrink: 0, background: "#062a35", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {profile.foto_url
            ? <img src={profile.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
            : isInstitutional(profile.nome)
              ? <img src="/logo-icon.png" alt="NegociaAky" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.35)" }} />
              : <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{getInitials(getDisplayName(profile.nome))}</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getDisplayName(profile.nome)}</div>
          <div style={{ fontSize: 8, color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {profile.telefone ? formatPhone(profile.telefone) : (profile.creci ? `CRECI ${profile.creci}` : getDisplayRole(profile.nome))}
          </div>
        </div>
        <div style={{ background: "#22d3ee", borderRadius: 20, padding: "6px 13px", fontSize: 9, fontWeight: 800, color: "#031820", boxShadow: "0 2px 8px rgba(34,211,238,0.4)" }}>
          💬 Fale comigo
        </div>
      </div>
    </div>
  );
}

// ─── Catálogo de imagens de fundo (hero) ──────────────────────────────────────
// Imagens Unsplash curadas (alta qualidade, 800px). Cada chave = tipo de
// estabelecimento ou cenário de negócio.
export const HERO_BG_VENDEDOR: Record<string, { label: string; emoji: string; url: string }> = {
  supermercado: { label: "Supermercado",   emoji: "🛒", url: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=85" },
  hortifruti:   { label: "Hortifruti",     emoji: "🥬", url: "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800&q=85" },
  restaurante:  { label: "Restaurante",    emoji: "🍽️", url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=85" },
  farmacia:     { label: "Farmácia",       emoji: "💊", url: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=800&q=85" },
  oficina:      { label: "Oficina",        emoji: "🔧", url: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?w=800&q=85" },
  roupas:       { label: "Loja de Roupas", emoji: "👕", url: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&q=85" },
  padaria:      { label: "Padaria",        emoji: "🥖", url: "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=800&q=85" },
  acougue:      { label: "Açougue",        emoji: "🥩", url: "https://images.unsplash.com/photo-1607275850923-cf3068fe1e72?w=800&q=85" },
  salao:        { label: "Salão de Beleza",emoji: "💇", url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=85" },
  academia:     { label: "Academia",       emoji: "🏋️", url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=85" },
  petshop:      { label: "Pet Shop",       emoji: "🐶", url: "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800&q=85" },
  loja:         { label: "Loja Comercial", emoji: "🏪", url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=85" },
};
export const HERO_BG_PROPRIETARIO: Record<string, { label: string; emoji: string; url: string }> = {
  sala_comercial: { label: "Sala Comercial",  emoji: "🏢", url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=85" },
  loja_vazia:     { label: "Loja Vazia",      emoji: "🏪", url: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=85" },
  galpao:         { label: "Galpão",          emoji: "🏭", url: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=85" },
  predio:         { label: "Prédio",          emoji: "🏬", url: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=85" },
  escritorio:     { label: "Escritório",      emoji: "🖥️", url: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=85" },
  salao_amplo:    { label: "Salão Amplo",     emoji: "🏟️", url: "https://images.unsplash.com/photo-1606293459308-1c70a31e7a93?w=800&q=85" },
  vitrine:        { label: "Loja de Rua",     emoji: "🛍️", url: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&q=85" },
  industrial:     { label: "Industrial",      emoji: "🏗️", url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=85" },
  andar_corp:     { label: "Andar Corporativo",emoji: "🌃", url: "https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=800&q=85" },
  esquina:        { label: "Ponto de Esquina",emoji: "🚦", url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=85" },
  para_chave:     { label: "Chave na Mão",    emoji: "🔑", url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&q=85" },
  garagem:        { label: "Box / Garagem",   emoji: "🅿️", url: "https://images.unsplash.com/photo-1611954058830-1bd7f5edc14e?w=800&q=85" },
};
export const HERO_BG_INVESTIDOR: Record<string, { label: string; emoji: string; url: string }> = {
  reuniao:     { label: "Negociação",   emoji: "🤝", url: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=85" },
  aperto_mao:  { label: "Aperto de Mão",emoji: "✋", url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&q=85" },
  assinatura:  { label: "Contrato",     emoji: "📝", url: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=85" },
  dashboard:   { label: "Dashboard",    emoji: "📊", url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=85" },
  crescimento: { label: "Crescimento",  emoji: "📈", url: "https://images.unsplash.com/photo-1460472178825-e5240623afd5?w=800&q=85" },
  graficos:    { label: "Gráficos",     emoji: "📉", url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=85" },
  capital:     { label: "Capital",      emoji: "💼", url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=85" },
  calculadora: { label: "Análise",      emoji: "🧮", url: "https://images.unsplash.com/photo-1554224311-beee460c201f?w=800&q=85" },
  loja_lux:    { label: "Loja Premium", emoji: "🏬", url: "https://images.unsplash.com/photo-1481437156560-3205f6a55735?w=800&q=85" },
  escritorio:  { label: "Escritório",   emoji: "🏢", url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=85" },
  skyline:     { label: "Centro Empresarial", emoji: "🏙️", url: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=800&q=85" },
  mesa_neg:    { label: "Mesa de Negócios",   emoji: "👔", url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&q=85" },
  franquia:    { label: "Franquia",     emoji: "🏆", url: "https://images.unsplash.com/photo-1556745753-b2904692b3cd?w=800&q=85" },
  carteira:    { label: "Portfólio",    emoji: "📁", url: "https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800&q=85" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
type Aba = "negocios" | "captacao";
type TipoCaptacao = "vendedor" | "investidor" | "proprietario";
type Formato = "post" | "story" | "reels" | "status";
type GatilhoMental = "urgencia" | "escassez" | "fomo" | "ganancia" | "prova_social" | "curiosidade" | "autoridade" | "transformacao";

const FORMATO_CONFIG: Record<Formato, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  post:   { label: "Post Instagram",  icon: <Instagram className="h-4 w-4" />,     desc: "1080×1080",     color: "from-pink-500 to-purple-600" },
  story:  { label: "Story Instagram", icon: <Instagram className="h-4 w-4" />,     desc: "1080×1920",     color: "from-violet-500 to-pink-500" },
  reels:  { label: "Reels Capa",      icon: <Film className="h-4 w-4" />,          desc: "1080×1920",     color: "from-orange-500 to-rose-600" },
  status: { label: "Status WhatsApp", icon: <MessageCircle className="h-4 w-4" />, desc: "9:16 pessoal",  color: "from-green-500 to-emerald-600" },
};

const GATILHOS: Record<GatilhoMental, { icon: string; label: string; desc: string; bg: string; instrucao: string }> = {
  urgencia:      { icon: "🔥", label: "Urgência",      desc: "Agora ou nunca",         bg: "from-orange-500 to-red-600",     instrucao: "O GATILHO PRINCIPAL É URGÊNCIA. Crie pressão temporal real e irresistível. Use frases como 'não vai durar', 'última chance', 'decida hoje'. Faça o leitor sentir que cada segundo que passa é uma oportunidade perdida para sempre." },
  escassez:      { icon: "💎", label: "Escassez",      desc: "Raro e exclusivo",        bg: "from-purple-500 to-indigo-600",  instrucao: "O GATILHO PRINCIPAL É ESCASSEZ. Enfatize que é único, raro de encontrar no mercado, que oportunidades assim surgem poucas vezes na vida. Use frases como 'único disponível', 'raridade no mercado', 'difícil encontrar algo assim'." },
  fomo:          { icon: "😱", label: "FOMO",          desc: "Medo de perder",          bg: "from-yellow-500 to-orange-500",  instrucao: "O GATILHO PRINCIPAL É FOMO (Fear Of Missing Out). Pinte o cenário do arrependimento — como o leitor vai se sentir daqui a 6 meses quando outro aproveitou essa chance. Mencione que outros já estão de olho nisso." },
  ganancia:      { icon: "💰", label: "ROI & Lucro",   desc: "Retorno financeiro",      bg: "from-green-500 to-emerald-600",  instrucao: "O GATILHO PRINCIPAL É GANÂNCIA/ROI. Foque 100% em dinheiro: retorno, lucro mensal, payback, quanto o dinheiro vai render. Seja concreto com números se disponíveis. Faça o leitor calcular mentalmente o quanto vai ganhar." },
  prova_social:  { icon: "👥", label: "Prova Social",  desc: "Validado pelo mercado",   bg: "from-blue-500 to-cyan-600",      instrucao: "O GATILHO PRINCIPAL É PROVA SOCIAL. Valide com dados de mercado, mencione que negócios assim são muito procurados, que o segmento está em alta, que investidores inteligentes já estão nesse mercado. Construa consenso." },
  curiosidade:   { icon: "🧠", label: "Curiosidade",   desc: "Intriga e teaser",        bg: "from-pink-500 to-rose-600",      instrucao: "O GATILHO PRINCIPAL É CURIOSIDADE. Comece com uma pergunta ou afirmação que o leitor nunca viu antes. Revele informações em camadas, deixando sempre algo para descobrir. O leitor deve sentir que precisa saber mais antes de agir." },
  autoridade:    { icon: "🏆", label: "Autoridade",    desc: "Expertise e confiança",   bg: "from-amber-500 to-yellow-600",   instrucao: "O GATILHO PRINCIPAL É AUTORIDADE. Posicione o corretor e a empresa como referência absoluta no mercado de negócios da região. Use linguagem de especialista, dados de mercado, terminologia profissional. Transmita que essa é a fonte mais confiável para esse tipo de transação." },
  transformacao: { icon: "🚀", label: "Transformação", desc: "Mude sua vida hoje",      bg: "from-violet-500 to-purple-600",  instrucao: "O GATILHO PRINCIPAL É TRANSFORMAÇÃO. Pinte o antes e depois de forma vívida. Como é a vida hoje vs como será após essa decisão. Fale sobre independência financeira, realização de sonhos, liberdade. Faça o leitor se ver no futuro que deseja." },
};

// ─── Expert copy builder ──────────────────────────────────────────────────────
function buildCopyPrompt(params: {
  contexto: "negocio_venda" | "imovel_locacao" | "captacao_vendedor" | "captacao_investidor" | "captacao_proprietario";
  formato: Formato;
  gatilho: GatilhoMental;
  dadosNegocio?: string;
  localInfo?: string;
  corretorInfo: string;
}): string {
  const { contexto, formato, gatilho, dadosNegocio, localInfo, corretorInfo } = params;
  const g = GATILHOS[gatilho];

  const formatRules: Record<Formato, string> = {
    post:   "FORMATO: Post Instagram. Máximo 10 linhas de texto corrido. Use emojis estrategicamente (1 por linha no máximo). Finalize com exatamente 15 hashtags relevantes ao mercado de negócios no Brasil.",
    story:  "FORMATO: Story Instagram. Máximo 4 linhas MUITO curtas e impactantes. 1 frase de CTA no final ('Manda mensagem agora!'). Sem hashtags. Tom urgente e visual.",
    status: "FORMATO: Status WhatsApp para grupo de negócios do bairro. Máximo 5 linhas. Linguagem próxima, como se fosse de um vizinho confiável. 1 CTA simples no final. Sem hashtags.",
  };

  const audiencias: Record<typeof contexto, string> = {
    negocio_venda:        "PÚBLICO-ALVO: Compradores e investidores que buscam adquirir um negócio lucrativo.",
    imovel_locacao:       "PÚBLICO-ALVO: Empreendedores e empresas procurando um ponto comercial para ALUGAR e operar seu negócio.",
    captacao_vendedor:    "PÚBLICO-ALVO: Donos de negócio do bairro que podem estar pensando em vender seu estabelecimento.",
    captacao_investidor:  "PÚBLICO-ALVO: Investidores e empreendedores que querem comprar um negócio pronto e lucrativo.",
    captacao_proprietario:"PÚBLICO-ALVO: Proprietários de imóveis comerciais (salas, lojas, galpões, prédios) parados ou com inquilino problemático, que querem VENDER ou ALUGAR seu imóvel com profissionalismo.",
  };

  const contextoCopy: Record<typeof contexto, string> = {
    negocio_venda:        "OBJETIVO: Anunciar este negócio À VENDA e atrair compradores qualificados para entrar em contato com o corretor. NUNCA fale em 'comprar' como sinônimo de 'alugar'.",
    imovel_locacao:       "OBJETIVO: Anunciar este imóvel/ponto comercial PARA LOCAÇÃO (aluguel) e atrair empresários interessados em alugar. NUNCA fale em 'comprar', 'venda' ou 'valor de aquisição' — é ALUGUEL MENSAL. Use termos como 'alugue agora', 'ponto para locação', 'aluguel acessível', 'localização estratégica'. OBRIGATÓRIO: cite explicitamente o TIPO DE IMÓVEL (salão, loja, sala comercial, galpão, etc — pegue do campo Tipo de imóvel ou Descrição) e a METRAGEM (m²) — esses dois dados são decisivos pro empresário escolher.",
    captacao_vendedor:    "OBJETIVO: Fazer donos de negócio do bairro entrarem em contato com o corretor para AVALIAR e LISTAR seu negócio para venda.",
    captacao_investidor:  "OBJETIVO: Fazer investidores entrarem em contato com o corretor para CONHECER as oportunidades de negócios disponíveis.",
    captacao_proprietario:"OBJETIVO: Fazer DONOS DE IMÓVEL COMERCIAL (sala, loja, galpão, prédio) entrarem em contato com o corretor para anunciar seu imóvel — seja pra VENDER, seja pra ALUGAR. Foque na dor de ter imóvel parado virando custo (IPTU, condomínio, manutenção). Deixe claro que o corretor cuida da divulgação, qualificação do candidato (inquilino OU comprador) e fechamento. Termos chave: 'imóvel parado', 'colocar pra render', 'inquilino certo', 'comprador qualificado', 'sem dor de cabeça', 'avaliação gratuita'.",
  };

  const metodo = `
MÉTODO DE COPYWRITING — ESTRUTURA AIDA AVANÇADA:
• A (ATENÇÃO): Primeira linha explosiva que para o scroll instantaneamente. Use o gatilho selecionado aqui.
• I (INTERESSE): 2-3 elementos que desenvolvem por que isso é relevante. Dados concretos valem ouro.
• D (DESEJO): Faça o leitor se imaginar na situação ideal. Pinte a transformação ou o ganho com detalhes sensoriais.
• A (AÇÃO): CTA único, claro, com senso de facilidade. "Manda mensagem" > "Entre em contato".`;

  const dados = dadosNegocio ? `\nDADOS DO NEGÓCIO:\n${dadosNegocio}` : (localInfo ? `\nREGIÃO DE ATUAÇÃO: ${localInfo}` : "");

  return `Você é um especialista em copywriting persuasivo para redes sociais no mercado de compra e venda de negócios no Brasil. Seu nível é de um redator sênior com 10+ anos de experiência em anúncios de alta conversão.

${audiencias[contexto]}
${contextoCopy[contexto]}

${g.instrucao}

${metodo}

${formatRules[formato]}

REGRAS ABSOLUTAS:
- Retorne APENAS o texto final pronto para copiar e colar. Sem explicações, sem títulos, sem "Aqui está o texto:".
- Nunca use clichês como "Oportunidade imperdível" sem desenvolvê-los com dados concretos.
- O gancho da primeira linha deve ser diferente de qualquer coisa que o leitor já viu.
- O CTA deve ser específico e direto ao ponto.
${dados}
${corretorInfo}`;
}

const TODAS_CATS = Object.keys(CAT);

// ─── Mocks por categoria ────────────────────────────────────────────────────
// Quando uma categoria NÃO tem produto real cadastrado, usamos esses exemplos
// pra deixar o corretor gerar arte de demonstração. Marcados com id mock-*.
const mockBase = {
  cidade: "São Paulo",
  estado: "SP",
  status: "ativo" as const,
  proprietario_nome: "Exemplo",
  proprietario_email: "exemplo@negociaaky.com.br",
  proprietario_telefone: "",
  criado_em: new Date().toISOString(),
};
const MOCK_NEGOCIOS_BY_CAT: Record<string, Negocio[]> = {
  "Alimentação": [
    { ...mockBase, id: "mock-alim-1", categoria: "Alimentação", titulo: "Restaurante Italiano · 12 anos", preco: 450000, faturamento_mensal: 85000, area_m2: 180, foto_url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=85", descricao: "Restaurante italiano consolidado com 12 anos de operação. Clientela fidelizada, cozinha equipada, ponto premiado. Lucro líquido médio mensal: R$ 22.000. Tipo de imóvel: Salão. Operação: Venda." },
    { ...mockBase, id: "mock-alim-2", categoria: "Alimentação", titulo: "Padaria de Bairro Tradicional", preco: 320000, faturamento_mensal: 65000, area_m2: 120, foto_url: "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=800&q=85", descricao: "Padaria com 25 anos de bairro, clientela fiel, produção própria. Operação: Venda." },
  ],
  "Saúde e Estética": [
    { ...mockBase, id: "mock-saude-1", categoria: "Saúde e Estética", titulo: "Clínica de Estética Premium", preco: 280000, faturamento_mensal: 48000, area_m2: 110, foto_url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=85", descricao: "Clínica completa com 4 cabines, recepção, equipamentos modernos. Carteira ativa de 600 clientes." },
    { ...mockBase, id: "mock-saude-2", categoria: "Saúde e Estética", titulo: "Salão de Beleza · Bem Localizado", preco: 180000, faturamento_mensal: 32000, area_m2: 85, foto_url: "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=85", descricao: "Salão com 6 cadeiras, recepção, depósito. Em ponto de alto fluxo." },
  ],
  "Serviços": [
    { ...mockBase, id: "mock-serv-1", categoria: "Serviços", titulo: "Lavanderia Industrial", preco: 220000, faturamento_mensal: 38000, area_m2: 95, foto_url: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&q=85", descricao: "Lavanderia atendendo hotéis e restaurantes. Maquinário industrial completo." },
    { ...mockBase, id: "mock-serv-2", categoria: "Serviços", titulo: "Oficina Mecânica Multimarca", preco: 195000, faturamento_mensal: 42000, area_m2: 160, foto_url: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?w=800&q=85", descricao: "Oficina com 4 elevadores, ferramentaria completa, carteira de clientes fixos." },
  ],
  "Varejo": [
    { ...mockBase, id: "mock-var-1", categoria: "Varejo", titulo: "Loja de Roupas Femininas", preco: 165000, faturamento_mensal: 35000, area_m2: 80, foto_url: "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&q=85", descricao: "Loja em rua de comércio forte, estoque consignado, clientela fiel." },
    { ...mockBase, id: "mock-var-2", categoria: "Varejo", titulo: "Papelaria + Bazar Completo", preco: 95000, faturamento_mensal: 22000, area_m2: 60, foto_url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=85", descricao: "Papelaria com bazar, atende escolas da região." },
  ],
  "Tecnologia": [
    { ...mockBase, id: "mock-tec-1", categoria: "Tecnologia", titulo: "Loja de Eletrônicos · Shopping", preco: 380000, faturamento_mensal: 58000, area_m2: 90, foto_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=85", descricao: "Loja em shopping de alto fluxo, marcas premium, equipe treinada." },
    { ...mockBase, id: "mock-tec-2", categoria: "Tecnologia", titulo: "Assistência Técnica Autorizada", preco: 145000, faturamento_mensal: 28000, area_m2: 65, foto_url: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?w=800&q=85", descricao: "AT autorizada Samsung/LG, 8 anos de mercado, contratos garantidos." },
  ],
  "Educação": [
    { ...mockBase, id: "mock-edu-1", categoria: "Educação", titulo: "Escola de Idiomas Consolidada", preco: 320000, faturamento_mensal: 48000, area_m2: 220, foto_url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=85", descricao: "Escola com 8 salas, 280 alunos ativos, professores próprios." },
    { ...mockBase, id: "mock-edu-2", categoria: "Educação", titulo: "Curso Profissionalizante · 320 alunos", preco: 240000, faturamento_mensal: 38000, area_m2: 180, foto_url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=85", descricao: "Cursos técnicos com certificação MEC. Estrutura completa." },
  ],
  "Automotivo": [
    { ...mockBase, id: "mock-auto-1", categoria: "Automotivo", titulo: "Centro Automotivo Completo", preco: 520000, faturamento_mensal: 78000, area_m2: 380, foto_url: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?w=800&q=85", descricao: "Mecânica + funilaria + pintura + estética. Alvará completo." },
    { ...mockBase, id: "mock-auto-2", categoria: "Automotivo", titulo: "Estética Automotiva Premium", preco: 180000, faturamento_mensal: 32000, area_m2: 200, foto_url: "https://images.unsplash.com/photo-1605618826115-fb9e776cba5d?w=800&q=85", descricao: "Detalhes, vitrificação, polimento. Clientela de carros premium." },
  ],
  "Indústria": [
    { ...mockBase, id: "mock-ind-1", categoria: "Indústria", titulo: "Fábrica de Móveis Planejados", preco: 950000, faturamento_mensal: 165000, area_m2: 850, foto_url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=85", descricao: "Fábrica equipada com CNC, marcenaria completa. Carteira de lojistas." },
    { ...mockBase, id: "mock-ind-2", categoria: "Indústria", titulo: "Distribuidora · Galpão 1200m²", preco: 1200000, faturamento_mensal: 280000, area_m2: 1200, foto_url: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=85", descricao: "Distribuidora com frota, contratos de fornecimento, equipe treinada." },
  ],
  "Imóveis Comerciais": [
    { ...mockBase, id: "mock-imov-1", categoria: "Imóveis Comerciais", titulo: "Salão Comercial · Av. Movimentada", preco: 8500, area_m2: 250, foto_url: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=85", descricao: "Salão térreo com pé-direito alto, vitrine ampla. Tipo de imóvel: Salão. Operação: Locação.", badge_texto: "LOCAÇÃO" },
    { ...mockBase, id: "mock-imov-2", categoria: "Imóveis Comerciais", titulo: "Sala Comercial · Centro", preco: 850000, area_m2: 95, foto_url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=85", descricao: "Sala comercial em edifício moderno. Tipo de imóvel: Sala. Operação: Venda." },
  ],
  "Outro": [
    { ...mockBase, id: "mock-out-1", categoria: "Outro", titulo: "Negócio Diferenciado · Nicho Lucrativo", preco: 280000, faturamento_mensal: 42000, area_m2: 100, foto_url: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=85", descricao: "Negócio único de nicho, baixa concorrência, margem alta." },
  ],
};
// Marca um negócio como mock pra UI mostrar selo "EXEMPLO"
const isMock = (n: Negocio) => typeof n.id === "string" && n.id.startsWith("mock-");

const CorretorRedesSociais = () => {
  usePageTitle("Redes Sociais | Área do Corretor");

  const [negocios, setNegocios]       = useState<Negocio[]>([]);
  const [profile, setProfile]         = useState<Profile>({ nome: "", telefone: "", foto_url: "", creci: "" });
  const [loading, setLoading]         = useState(true);

  // Abas
  const [aba, setAba]                 = useState<Aba>("negocios");

  // Gatilho mental (compartilhado entre abas)
  const [gatilho, setGatilho]         = useState<GatilhoMental>("urgencia");

  // Captação
  const [tipoCaptacao, setTipoCaptacao] = useState<TipoCaptacao>("vendedor");
  // Imagem de fundo (hero) das artes de captação — uma chave por tipo
  const [heroBgVendedor, setHeroBgVendedor]         = useState<string>("supermercado");
  const [heroBgInvestidor, setHeroBgInvestidor]     = useState<string>("reuniao");
  const [heroBgProprietario, setHeroBgProprietario] = useState<string>("sala_comercial");
  // Upload custom — quando setado, vira a chave "custom" e usa esse URL local
  const [customBgVendedor, setCustomBgVendedor]         = useState<string>("");
  const [customBgInvestidor, setCustomBgInvestidor]     = useState<string>("");
  const [customBgProprietario, setCustomBgProprietario] = useState<string>("");
  const customFileVendedorRef     = useRef<HTMLInputElement>(null);
  const customFileInvestidorRef   = useRef<HTMLInputElement>(null);
  const customFileProprietarioRef = useRef<HTMLInputElement>(null);

  const handleCustomBgUpload = (e: React.ChangeEvent<HTMLInputElement>, tipo: TipoCaptacao) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (tipo === "vendedor")        { setCustomBgVendedor(url);     setHeroBgVendedor("custom"); }
    else if (tipo === "investidor") { setCustomBgInvestidor(url);   setHeroBgInvestidor("custom"); }
    else                            { setCustomBgProprietario(url); setHeroBgProprietario("custom"); }
    if (e.target) e.target.value = "";
  };

  const resolveHeroUrl = (tipo: TipoCaptacao): string => {
    if (tipo === "vendedor")    return heroBgVendedor    === "custom" ? customBgVendedor    : (HERO_BG_VENDEDOR[heroBgVendedor]?.url || "");
    if (tipo === "investidor")  return heroBgInvestidor  === "custom" ? customBgInvestidor  : (HERO_BG_INVESTIDOR[heroBgInvestidor]?.url || "");
    return heroBgProprietario === "custom" ? customBgProprietario : (HERO_BG_PROPRIETARIO[heroBgProprietario]?.url || "");
  };
  const [bairro, setBairro]           = useState("");
  const [copyCaptacao, setCopyCaptacao] = useState("");
  const [generatingCopyCaptacao, setGeneratingCopyCaptacao] = useState(false);
  const [copiedCaptacao, setCopiedCaptacao] = useState(false);
  const [downloadingCaptacao, setDownloadingCaptacao] = useState(false);
  const captacaoVendedorRef = useRef<HTMLDivElement>(null);
  const captacaoInvestidorRef = useRef<HTMLDivElement>(null);
  const captacaoProprietarioRef = useRef<HTMLDivElement>(null);

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

  // Negócios filtrados por categoria + busca (drill-in)
  // Se a categoria não tem produto real, usa MOCK pra demonstração
  const negociosDaCat = (() => {
    if (!catSelecionada) return negocios;
    const reais = negocios.filter((n) => n.categoria === catSelecionada);
    if (reais.length > 0) return reais;
    return MOCK_NEGOCIOS_BY_CAT[catSelecionada] || [];
  })();
  const negociosFiltrados = negociosDaCat.filter((n) =>
    n.titulo.toLowerCase().includes(search.toLowerCase()) ||
    n.cidade.toLowerCase().includes(search.toLowerCase())
  );

  // Busca GLOBAL (top-level, sem categoria selecionada) — pesquisa em todos os campos
  const buscaGlobal = !catSelecionada && search.trim()
    ? negocios.filter((n) => {
        const q = search.toLowerCase();
        return (
          n.titulo.toLowerCase().includes(q) ||
          n.cidade.toLowerCase().includes(q) ||
          n.categoria.toLowerCase().includes(q) ||
          ((n as Negocio & { bairro?: string | null }).bairro || "").toLowerCase().includes(q)
        );
      })
    : [];

  const handleSelectFromGlobal = (n: Negocio) => {
    setCatSelecionada(n.categoria);
    setSelected(n);
    setShowNegociosPicker(false);
    setSearch("");
    setCopy("");
  };

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

  const handleGerarCopyCaptacao = async () => {
    setGeneratingCopyCaptacao(true);
    setCopyCaptacao("");
    const corretorInfo = `Corretor: ${getDisplayName(profile.nome)}${profile.creci ? " · CRECI " + profile.creci : ""}${profile.telefone ? " · " + formatPhone(profile.telefone) : ""}`;
    const prompt = buildCopyPrompt({
      contexto: tipoCaptacao === "vendedor" ? "captacao_vendedor"
        : tipoCaptacao === "proprietario" ? "captacao_proprietario"
        : "captacao_investidor",
      formato,
      gatilho,
      localInfo: bairro || undefined,
      corretorInfo,
    });
    try {
      const result = await callClaude(prompt);
      setCopyCaptacao(result.trim());
    } catch {
      setCopyCaptacao("Erro ao gerar copy. Verifique sua conexão e tente novamente.");
    } finally {
      setGeneratingCopyCaptacao(false);
    }
  };

  const handleDownloadCaptacao = async () => {
    const ref = tipoCaptacao === "vendedor" ? captacaoVendedorRef
      : tipoCaptacao === "proprietario" ? captacaoProprietarioRef
      : captacaoInvestidorRef;
    if (!ref.current) return;
    setDownloadingCaptacao(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      // post 360x360 com scale 3 = 1080x1080; story/status 270x480 com scale 4 = 1080x1920
      const scale = formato === "post" ? 3 : 4;
      const canvas = await html2canvas(ref.current, { scale, useCORS: true, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `captacao-${tipoCaptacao}-${formato}-${Date.now()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloadingCaptacao(false);
    }
  };

  const handleGerarCopy = async () => {
    if (!selected) return;
    setGeneratingCopy(true);
    setCopy("");
    const ehLocacao = isLocacao(selected);
    const localPretty = localText(selected) + (selected.estado ? `, ${selected.estado}` : "");
    // Extrai "Tipo de imóvel: X" da descrição se existir (vem do form Novo Negócio)
    const tipoImovelMatch = (selected.descricao || "").match(/Tipo de im[óo]vel:\s*([^\n.·—]+)/i);
    const tipoImovel = tipoImovelMatch?.[1]?.trim();
    const dadosNegocio = [
      `Nome: ${selected.titulo}`,
      `Categoria: ${selected.categoria}`,
      `Tipo de operação: ${ehLocacao ? "LOCAÇÃO (aluguel)" : "VENDA"}`,
      tipoImovel                           ? `Tipo de imóvel: ${tipoImovel}` : "",
      `Local: ${localPretty}`,
      selected.preco                       ? `${ehLocacao ? "Valor do aluguel mensal" : "Valor de venda"}: ${formatCurrency(selected.preco)}${ehLocacao ? "/mês" : ""}` : "",
      selected.faturamento_mensal && !ehLocacao ? `Faturamento mensal: ${formatCurrency(selected.faturamento_mensal)}` : "",
      selected.area_m2                     ? `Área útil: ${selected.area_m2}m²` : "",
      selected.descricao                   ? `Descrição completa do imóvel/negócio:\n${selected.descricao}` : "",
    ].filter(Boolean).join("\n");
    const corretorInfo = `Corretor: ${getDisplayName(profile.nome)}${profile.telefone ? " · " + formatPhone(profile.telefone) : ""}${profile.creci ? " · CRECI " + profile.creci : ""}`;
    const prompt = buildCopyPrompt({ contexto: ehLocacao ? "imovel_locacao" : "negocio_venda", formato, gatilho, dadosNegocio, corretorInfo });
    try {
      const result = await callClaude(prompt);
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

        {/* Tabs */}
        <div className="flex gap-2 rounded-2xl border border-border bg-card p-1.5">
          <button
            onClick={() => setAba("negocios")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${aba === "negocios" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
            <Package className="h-4 w-4" />
            Negócios à Venda
          </button>
          <button
            onClick={() => setAba("captacao")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${aba === "captacao" ? "bg-primary text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-muted/40"}`}>
            <Target className="h-4 w-4" />
            Captação de Clientes
          </button>
        </div>

        {/* ──────────────────── ABA: CAPTAÇÃO ──────────────────── */}
        {aba === "captacao" && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Coluna esquerda */}
            <div className="space-y-4">

              {/* STEP 1: Tipo */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">1</div>
                  <p className="font-semibold text-foreground text-sm">Tipo de captação</p>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    onClick={() => { setTipoCaptacao("vendedor"); setCopyCaptacao(""); }}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all ${tipoCaptacao === "vendedor" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-lg">🏪</div>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">Vendedor</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Dono de negócio que quer vender</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setTipoCaptacao("proprietario"); setCopyCaptacao(""); }}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all ${tipoCaptacao === "proprietario" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-700 text-lg">🔑</div>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">Proprietário</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Vender ou alugar imóvel comercial</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setTipoCaptacao("investidor"); setCopyCaptacao(""); }}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all ${tipoCaptacao === "investidor" ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-700 text-lg">📈</div>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">Investidor</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">Quem quer comprar um negócio</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* STEP 2: Bairro/Região */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">2</div>
                  <p className="font-semibold text-foreground text-sm">Bairro / Região <span className="text-muted-foreground font-normal">(opcional)</span></p>
                </div>
                <input
                  type="text"
                  placeholder="Ex: Centro, Vila Madalena, Savassi..."
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground">Personaliza a arte e o copy para o seu território de atuação</p>
              </div>

              {/* STEP 3: Imagem de fundo */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">3</div>
                    <p className="font-semibold text-foreground text-sm">Imagem de fundo</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {tipoCaptacao === "vendedor" ? "12 comércios + upload"
                      : tipoCaptacao === "proprietario" ? "12 tipos de imóvel + upload"
                      : "14 cenários + upload"}
                  </span>
                </div>

                {/* Hidden file inputs */}
                <input ref={customFileVendedorRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleCustomBgUpload(e, "vendedor")} />
                <input ref={customFileInvestidorRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleCustomBgUpload(e, "investidor")} />
                <input ref={customFileProprietarioRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleCustomBgUpload(e, "proprietario")} />

                <div className="grid grid-cols-3 gap-2.5">
                  {/* Tile "Personalizado" / upload — sempre primeiro */}
                  {(() => {
                    const customUrl = tipoCaptacao === "vendedor" ? customBgVendedor
                      : tipoCaptacao === "proprietario" ? customBgProprietario : customBgInvestidor;
                    const activeKey = tipoCaptacao === "vendedor" ? heroBgVendedor
                      : tipoCaptacao === "proprietario" ? heroBgProprietario : heroBgInvestidor;
                    const ativo = activeKey === "custom" && !!customUrl;
                    const fileRef = tipoCaptacao === "vendedor" ? customFileVendedorRef
                      : tipoCaptacao === "proprietario" ? customFileProprietarioRef : customFileInvestidorRef;
                    const setBg = tipoCaptacao === "vendedor" ? setHeroBgVendedor
                      : tipoCaptacao === "proprietario" ? setHeroBgProprietario : setHeroBgInvestidor;
                    return (
                      <button onClick={() => {
                        if (customUrl) { setBg("custom"); } else { fileRef.current?.click(); }
                      }} onDoubleClick={() => fileRef.current?.click()}
                        className={`group relative flex flex-col items-stretch rounded-xl border-2 border-dashed overflow-hidden transition-all ${
                          ativo
                            ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                            : "border-border/60 hover:border-primary/60 hover:bg-primary/5 bg-muted/20"
                        }`}>
                        <div className="relative w-full aspect-square flex items-center justify-center">
                          {customUrl ? (
                            <>
                              <img src={customUrl} alt="Personalizado" className="absolute inset-0 w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              <span className="absolute top-1.5 right-1.5 rounded-full bg-primary text-white text-[9px] font-bold px-1.5 py-0.5">SUA</span>
                            </>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                              <span className="text-[9px] font-semibold">Subir imagem</span>
                            </div>
                          )}
                          {ativo && (
                            <div className="absolute top-1.5 left-1.5 h-4 w-4 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold px-1 py-1.5 truncate text-center ${ativo ? "text-primary" : "text-foreground"}`}>
                          {customUrl ? "Personalizada" : "Personalizado"}
                        </span>
                      </button>
                    );
                  })()}

                  {/* Tiles do banco */}
                  {(tipoCaptacao === "vendedor"     ? Object.entries(HERO_BG_VENDEDOR)
                   : tipoCaptacao === "proprietario" ? Object.entries(HERO_BG_PROPRIETARIO)
                   : Object.entries(HERO_BG_INVESTIDOR)
                  ).map(([key, cfg]) => {
                    const ativo = tipoCaptacao === "vendedor" ? heroBgVendedor === key
                      : tipoCaptacao === "proprietario" ? heroBgProprietario === key
                      : heroBgInvestidor === key;
                    const setBg = tipoCaptacao === "vendedor" ? setHeroBgVendedor
                      : tipoCaptacao === "proprietario" ? setHeroBgProprietario
                      : setHeroBgInvestidor;
                    return (
                      <button key={key} onClick={() => setBg(key)}
                        className={`group relative flex flex-col items-stretch rounded-xl border overflow-hidden transition-all ${
                          ativo ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                        }`}>
                        <div className="relative w-full aspect-square bg-muted/30">
                          <img src={cfg.url} alt={cfg.label} loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover opacity-95 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                          <span className="absolute top-1.5 left-1.5 text-lg drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]">{cfg.emoji}</span>
                          {ativo && (
                            <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary text-white flex items-center justify-center shadow-md">
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-semibold px-1 py-1.5 truncate text-center ${ativo ? "text-primary" : "text-foreground"}`}>{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  💡 Dica: use foto real do bairro pra dar mais autenticidade.
                  {(tipoCaptacao === "vendedor" ? heroBgVendedor
                    : tipoCaptacao === "proprietario" ? heroBgProprietario
                    : heroBgInvestidor) === "custom" && (
                    <button
                      type="button"
                      onClick={() => (tipoCaptacao === "vendedor" ? customFileVendedorRef
                        : tipoCaptacao === "proprietario" ? customFileProprietarioRef
                        : customFileInvestidorRef).current?.click()}
                      className="ml-1 text-primary font-semibold hover:underline"
                    >Trocar imagem</button>
                  )}
                </p>
              </div>

              {/* STEP 4: Formato */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">4</div>
                  <p className="font-semibold text-foreground text-sm">Formato</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(FORMATO_CONFIG) as [Formato, typeof FORMATO_CONFIG[Formato]][]).map(([key, cfg]) => (
                    <button key={key} onClick={() => { setFormato(key); setCopyCaptacao(""); }}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all ${formato === key ? "border-primary bg-primary/5 text-primary" : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"}`}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${cfg.color} text-white`}>{cfg.icon}</div>
                      <span className="leading-tight text-center">{cfg.label}</span>
                      <span className="text-[10px] opacity-60">{cfg.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* STEP 5: Copy com IA */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">5</div>
                  <p className="font-semibold text-foreground text-sm">Gatilho Mental + Copy com IA</p>
                </div>

                {/* Gatilho selector */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Escolha o gatilho persuasivo:</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(Object.entries(GATILHOS) as [GatilhoMental, typeof GATILHOS[GatilhoMental]][]).map(([key, g]) => (
                      <button key={key} onClick={() => { setGatilho(key); setCopyCaptacao(""); }}
                        title={g.desc}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all ${gatilho === key ? "border-primary bg-primary/8 ring-1 ring-primary/30" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                        <span className="text-lg leading-none">{g.icon}</span>
                        <span className={`text-[9px] font-semibold leading-tight ${gatilho === key ? "text-primary" : "text-muted-foreground"}`}>{g.label}</span>
                      </button>
                    ))}
                  </div>
                  {gatilho && (
                    <div className="flex items-start gap-2 rounded-xl p-2.5" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)" }}>
                      <span className="text-base shrink-0">{GATILHOS[gatilho].icon}</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">{GATILHOS[gatilho].label}</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">{GATILHOS[gatilho].desc}</p>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={handleGerarCopyCaptacao} disabled={generatingCopyCaptacao}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-4 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-40">
                  {generatingCopyCaptacao
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando com IA...</>
                    : <><Sparkles className="h-4 w-4" /> Gerar Copy com IA</>}
                </button>
                {copyCaptacao && (
                  <div className="space-y-2">
                    <textarea value={copyCaptacao} onChange={(e) => setCopyCaptacao(e.target.value)} rows={8}
                      className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(copyCaptacao); setCopiedCaptacao(true); setTimeout(() => setCopiedCaptacao(false), 2500); }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white hover:bg-primary/90">
                        {copiedCaptacao ? <><Check className="h-3.5 w-3.5" /> Copiado!</> : <><Copy className="h-3.5 w-3.5" /> Copiar texto</>}
                      </button>
                      <button onClick={handleGerarCopyCaptacao} disabled={generatingCopyCaptacao}
                        className="flex items-center gap-1 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/70 disabled:opacity-40">
                        <RefreshCw className={`h-3.5 w-3.5 ${generatingCopyCaptacao ? "animate-spin" : ""}`} /> Regerar
                      </button>
                    </div>
                  </div>
                )}
                {!copyCaptacao && !generatingCopyCaptacao && (
                  <div className="flex flex-col items-center justify-center py-4 text-center">
                    <Sparkles className="h-8 w-8 opacity-15 mb-2" />
                    <p className="text-xs text-muted-foreground">Clique em gerar para criar o texto</p>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna direita: preview */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground text-sm">Preview da Arte</p>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground font-medium">
                    {tipoCaptacao === "vendedor" ? "🏪 Vendedor" : "📈 Investidor"}
                  </span>
                </div>
                <div className="flex justify-center">
                  {tipoCaptacao === "vendedor"
                    ? <PostCaptacaoVendedor profile={profile} bairro={bairro} heroUrl={resolveHeroUrl("vendedor")} formato={formato} divRef={captacaoVendedorRef} />
                    : tipoCaptacao === "proprietario"
                      ? <PostCaptacaoProprietario profile={profile} bairro={bairro} heroUrl={resolveHeroUrl("proprietario")} formato={formato} divRef={captacaoProprietarioRef} />
                      : <PostCaptacaoInvestidor profile={profile} bairro={bairro} heroUrl={resolveHeroUrl("investidor")} formato={formato} divRef={captacaoInvestidorRef} />
                  }
                </div>
                <button onClick={handleDownloadCaptacao} disabled={downloadingCaptacao}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm font-bold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50">
                  {downloadingCaptacao
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando PNG...</>
                    : <><Download className="h-4 w-4" /> Baixar Arte em PNG</>}
                </button>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-700 mb-1">🎯 Como usar no WhatsApp</p>
                <ol className="text-xs text-amber-600 space-y-1 list-decimal list-inside">
                  <li>Escolha o tipo: <strong>Vendedor</strong> (dono que quer vender) ou <strong>Investidor</strong> (quem quer comprar)</li>
                  <li>Adicione o bairro para personalizar</li>
                  <li>Gere o copy com IA e ajuste</li>
                  <li>Baixe a arte e poste no grupo de negócios do bairro</li>
                  <li>Cole o texto junto com a imagem</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────────── ABA: NEGÓCIOS À VENDA ──────────────────── */}
        {aba === "negocios" && (
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

              {/* ── Busca global (top-level) ── */}
              {!catSelecionada && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={`Buscar entre ${negocios.length} produto${negocios.length !== 1 ? "s" : ""} do site...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-border bg-muted/30 outline-none focus:ring-1 focus:ring-primary focus:bg-card transition-colors"
                  />
                </div>
              )}

              {/* ── Resultado da busca global (lista flat com thumb + categoria) ── */}
              {!catSelecionada && search.trim() && (
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border bg-muted/20">
                    {buscaGlobal.length} resultado{buscaGlobal.length !== 1 ? "s" : ""} encontrado{buscaGlobal.length !== 1 ? "s" : ""}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
                    {buscaGlobal.length === 0 ? (
                      <p className="text-center py-8 text-xs text-muted-foreground">Nenhum produto encontrado. Tente outro termo.</p>
                    ) : buscaGlobal.map((n) => {
                      const c = getCat(n.categoria);
                      return (
                        <button key={n.id} onClick={() => handleSelectFromGlobal(n)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50 transition-colors">
                          <div className="h-11 w-11 shrink-0 rounded-lg overflow-hidden bg-muted/40">
                            {n.foto_url ? (
                              <img src={n.foto_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-lg" style={{ background: `${c.accent}20` }}>
                                {c.icon}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-xs truncate">{n.titulo}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              <span style={{ color: c.accent }}>{c.icon} {n.categoria}</span>
                              <span className="mx-1">·</span>
                              <span>{n.cidade}</span>
                            </p>
                          </div>
                          {n.preco ? <span className="text-xs font-bold text-primary shrink-0">{formatCurrency(n.preco)}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Seletor de categoria (grid — só quando busca está vazia) ── */}
              {!catSelecionada && !search.trim() && (
                <div className="grid grid-cols-2 gap-2">
                  {TODAS_CATS.map((cat) => {
                    const c = getCat(cat);
                    const count = negocios.filter((n) => n.categoria === cat).length;
                    const mockCount = (MOCK_NEGOCIOS_BY_CAT[cat] || []).length;
                    const hasProducts = count > 0;
                    return (
                      <button key={cat}
                        onClick={() => handleSelectCategoria(cat)}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          hasProducts
                            ? "border-border bg-muted/20 hover:bg-muted/50 hover:border-primary/30"
                            : "border-border/40 bg-muted/10 hover:bg-muted/30 hover:border-border"
                        }`}>
                        <div
                          style={{ background: `${c.accent}20`, border: `1px solid ${c.accent}40` }}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-xl shrink-0">
                          {c.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{cat}</p>
                          <p className="text-xs text-muted-foreground">
                            {hasProducts
                              ? `${count} produto${count !== 1 ? "s" : ""}`
                              : mockCount > 0
                                ? <span className="text-violet-500 dark:text-violet-400 font-medium">{mockCount} exemplo{mockCount !== 1 ? "s" : ""}</span>
                                : "sem produtos"}
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
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{catSelecionada}</p>
                      <p className="text-xs text-muted-foreground">
                        {negociosDaCat.length} negócio{negociosDaCat.length !== 1 ? "s" : ""}
                        {negociosDaCat.length > 0 && isMock(negociosDaCat[0]) && (
                          <span className="ml-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[9px] font-bold tracking-wider uppercase">Exemplo</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {negociosDaCat.length > 0 && isMock(negociosDaCat[0]) && (
                    <div className="rounded-lg bg-violet-500/8 border border-violet-500/20 px-3 py-2 text-[11px] text-violet-700 dark:text-violet-300 leading-relaxed">
                      💡 Esta categoria não tem produtos cadastrados ainda. Estamos mostrando <strong>negócios de exemplo</strong> pra você testar o gerador de arte.
                    </div>
                  )}

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
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-foreground text-xs truncate">{n.titulo}</p>
                                {isMock(n) && <span className="shrink-0 rounded px-1 py-0.5 bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[8px] font-bold tracking-wider uppercase">Exemplo</span>}
                              </div>
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
                <p className="font-semibold text-foreground text-sm">Gatilho Mental + Copy com IA</p>
              </div>

              {/* Gatilho selector */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Escolha o gatilho persuasivo:</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.entries(GATILHOS) as [GatilhoMental, typeof GATILHOS[GatilhoMental]][]).map(([key, g]) => (
                    <button key={key} onClick={() => { setGatilho(key); setCopy(""); }}
                      title={g.desc}
                      className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-all ${gatilho === key ? "border-primary bg-primary/8 ring-1 ring-primary/30" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                      <span className="text-lg leading-none">{g.icon}</span>
                      <span className={`text-[9px] font-semibold leading-tight ${gatilho === key ? "text-primary" : "text-muted-foreground"}`}>{g.label}</span>
                    </button>
                  ))}
                </div>
                {gatilho && (
                  <div className={`flex items-start gap-2 rounded-xl p-2.5 bg-gradient-to-r ${GATILHOS[gatilho].bg} bg-opacity-10`} style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)" }}>
                    <span className="text-base shrink-0">{GATILHOS[gatilho].icon}</span>
                    <div>
                      <p className="text-xs font-bold text-foreground">{GATILHOS[gatilho].label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{GATILHOS[gatilho].desc}</p>
                    </div>
                  </div>
                )}
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
        )} {/* fim aba negocios */}
      </div>
    </CorretorLayout>
  );
};

export default CorretorRedesSociais;
