import { useEffect, useRef, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { supabase } from "@/lib/supabase";
import { callClaude } from "@/lib/anthropic";
import { getAllNegocios, formatCurrency, type Negocio } from "@/stores/negocioStore";
import {
  Instagram, MessageCircle, Download, Copy, Check, Loader2,
  Sparkles, Search, Megaphone, RefreshCw, ChevronLeft,
  Store, TrendingUp, Target, Package,
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

// ─── Captação: Vendedor (360×360) ────────────────────────────────────────────
function PostCaptacaoVendedor({ profile, bairro, divRef }: {
  profile: Profile; bairro: string; divRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={divRef} style={{
      width: 360, height: 360, borderRadius: 14, overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: "Arial, Helvetica, sans-serif",
      background: "linear-gradient(145deg, #05140a 0%, #082010 40%, #0a2e18 100%)",
      position: "relative", boxSizing: "border-box",
    }}>
      {/* Background decorations */}
      <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, #22c55e18 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, #16a34a12 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translate(-50%,-50%)", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, #22c55e08 0%, transparent 65%)" }} />

      {/* Top bar */}
      <div style={{ position: "relative", zIndex: 2, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#000" }}>NA</div>
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 8, letterSpacing: 2, textTransform: "uppercase" }}>NegociaAky</span>
        </div>
        <div style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.4)", borderRadius: 20, padding: "3px 10px", fontSize: 8, color: "#86efac", fontWeight: 700, letterSpacing: 0.5 }}>
          CAPTAÇÃO
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, position: "relative", zIndex: 2, padding: "8px 20px 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Big icon */}
        <div style={{ fontSize: 42, marginBottom: 10, filter: "drop-shadow(0 4px 12px rgba(34,197,94,0.4))" }}>🏪</div>

        {/* Headline */}
        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 6 }}>
          Quer vender<br /><span style={{ color: "#4ade80" }}>seu negócio?</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginBottom: 14, lineHeight: 1.5 }}>
          Intermediamos com segurança e sigilo total
        </div>

        {/* Value props */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            "✅ Avaliação gratuita do negócio",
            "✅ Base de compradores qualificados",
            "✅ Processo 100% discreto",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "7px 10px" }}>
              <span style={{ fontSize: 9.5, color: "#d1fae5", fontWeight: 600 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Bairro badge */}
        {bairro && (
          <div style={{ marginTop: 10, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "5px 10px", display: "inline-block" }}>
            <span style={{ fontSize: 9, color: "#86efac", fontWeight: 700 }}>📍 Atendendo: {bairro}</span>
          </div>
        )}
      </div>

      {/* Bottom: corretor */}
      <div style={{ position: "relative", zIndex: 2, padding: "10px 16px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", border: "2px solid #22c55e", flexShrink: 0, background: "#14532d", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {profile.foto_url
            ? <img src={profile.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
            : <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{getInitials(profile.nome)}</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{profile.nome}</div>
          {profile.creci && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)" }}>CRECI {profile.creci}</div>}
        </div>
        <div style={{ background: "#22c55e", borderRadius: 20, padding: "5px 12px", fontSize: 9, fontWeight: 800, color: "#000" }}>
          💬 Fale comigo
        </div>
      </div>
    </div>
  );
}

// ─── Captação: Investidor (360×360) ─────────────────────────────────────────
function PostCaptacaoInvestidor({ profile, bairro, divRef }: {
  profile: Profile; bairro: string; divRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={divRef} style={{
      width: 360, height: 360, borderRadius: 14, overflow: "hidden",
      display: "flex", flexDirection: "column",
      fontFamily: "Arial, Helvetica, sans-serif",
      background: "linear-gradient(145deg, #030b1a 0%, #060f2a 40%, #091535 100%)",
      position: "relative", boxSizing: "border-box",
    }}>
      {/* Background decorations */}
      <div style={{ position: "absolute", top: -50, right: -50, width: 210, height: 210, borderRadius: "50%", background: "radial-gradient(circle, #3b82f618 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -40, left: -30, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle, #1d4ed810 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", top: "35%", left: "50%", transform: "translate(-50%,-50%)", width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, #6366f108 0%, transparent 65%)" }} />

      {/* Top bar */}
      <div style={{ position: "relative", zIndex: 2, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "#C49A1E", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#000" }}>NA</div>
          <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 8, letterSpacing: 2, textTransform: "uppercase" }}>NegociaAky</span>
        </div>
        <div style={{ background: "rgba(196,154,30,0.15)", border: "1px solid rgba(196,154,30,0.4)", borderRadius: 20, padding: "3px 10px", fontSize: 8, color: "#fde68a", fontWeight: 700, letterSpacing: 0.5 }}>
          OPORTUNIDADE
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, position: "relative", zIndex: 2, padding: "8px 20px 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {/* Big icon */}
        <div style={{ fontSize: 42, marginBottom: 10, filter: "drop-shadow(0 4px 12px rgba(196,154,30,0.4))" }}>📈</div>

        {/* Headline */}
        <div style={{ fontSize: 21, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 6 }}>
          Quer investir em<br /><span style={{ color: "#C49A1E" }}>um negócio lucrativo?</span>
        </div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 14, lineHeight: 1.5 }}>
          Negócios com ROI comprovado disponíveis agora
        </div>

        {/* Value props */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {[
            "🏆 Vários segmentos e ticket de entrada",
            "📊 Dados financeiros verificados",
            "🤝 Suporte completo na transação",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "7px 10px" }}>
              <span style={{ fontSize: 9.5, color: "#fef9c3", fontWeight: 600 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Bairro badge */}
        {bairro && (
          <div style={{ marginTop: 10, background: "rgba(196,154,30,0.12)", border: "1px solid rgba(196,154,30,0.3)", borderRadius: 8, padding: "5px 10px", display: "inline-block" }}>
            <span style={{ fontSize: 9, color: "#fde68a", fontWeight: 700 }}>📍 Região: {bairro}</span>
          </div>
        )}
      </div>

      {/* Bottom: corretor */}
      <div style={{ position: "relative", zIndex: 2, padding: "10px 16px 14px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", border: "2px solid #C49A1E", flexShrink: 0, background: "#1c1208", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {profile.foto_url
            ? <img src={profile.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
            : <span style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{getInitials(profile.nome)}</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>{profile.nome}</div>
          {profile.creci && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)" }}>CRECI {profile.creci}</div>}
        </div>
        <div style={{ background: "#C49A1E", borderRadius: 20, padding: "5px 12px", fontSize: 9, fontWeight: 800, color: "#000" }}>
          💬 Fale comigo
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
type Aba = "negocios" | "captacao";
type TipoCaptacao = "vendedor" | "investidor";
type Formato = "post" | "story" | "status";
type GatilhoMental = "urgencia" | "escassez" | "fomo" | "ganancia" | "prova_social" | "curiosidade" | "autoridade" | "transformacao";

const FORMATO_CONFIG: Record<Formato, { label: string; icon: React.ReactNode; desc: string; color: string }> = {
  post:   { label: "Post Instagram",  icon: <Instagram className="h-4 w-4" />,     desc: "1080×1080",     color: "from-pink-500 to-purple-600" },
  story:  { label: "Story Instagram", icon: <Instagram className="h-4 w-4" />,     desc: "1080×1920",     color: "from-violet-500 to-pink-500" },
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
  contexto: "negocio_venda" | "captacao_vendedor" | "captacao_investidor";
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
    negocio_venda:       "PÚBLICO-ALVO: Compradores e investidores que buscam adquirir um negócio lucrativo.",
    captacao_vendedor:   "PÚBLICO-ALVO: Donos de negócio do bairro que podem estar pensando em vender seu estabelecimento.",
    captacao_investidor: "PÚBLICO-ALVO: Investidores e empreendedores que querem comprar um negócio pronto e lucrativo.",
  };

  const contextoCopy: Record<typeof contexto, string> = {
    negocio_venda:       "OBJETIVO: Anunciar este negócio À VENDA e atrair compradores qualificados para entrar em contato com o corretor.",
    captacao_vendedor:   "OBJETIVO: Fazer donos de negócio do bairro entrarem em contato com o corretor para AVALIAR e LISTAR seu negócio para venda.",
    captacao_investidor: "OBJETIVO: Fazer investidores entrarem em contato com o corretor para CONHECER as oportunidades de negócios disponíveis.",
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
  const [bairro, setBairro]           = useState("");
  const [copyCaptacao, setCopyCaptacao] = useState("");
  const [generatingCopyCaptacao, setGeneratingCopyCaptacao] = useState(false);
  const [copiedCaptacao, setCopiedCaptacao] = useState(false);
  const [downloadingCaptacao, setDownloadingCaptacao] = useState(false);
  const captacaoVendedorRef = useRef<HTMLDivElement>(null);
  const captacaoInvestidorRef = useRef<HTMLDivElement>(null);

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

  const handleGerarCopyCaptacao = async () => {
    setGeneratingCopyCaptacao(true);
    setCopyCaptacao("");
    const corretorInfo = `Corretor: ${profile.nome}${profile.creci ? " · CRECI " + profile.creci : ""}${profile.telefone ? " · " + formatPhone(profile.telefone) : ""}`;
    const prompt = buildCopyPrompt({
      contexto: tipoCaptacao === "vendedor" ? "captacao_vendedor" : "captacao_investidor",
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
    const ref = tipoCaptacao === "vendedor" ? captacaoVendedorRef : captacaoInvestidorRef;
    if (!ref.current) return;
    setDownloadingCaptacao(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(ref.current, { scale: 3, useCORS: true, backgroundColor: null });
      const link = document.createElement("a");
      link.download = `captacao-${tipoCaptacao}-${Date.now()}.png`;
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
    const dadosNegocio = [
      `Nome: ${selected.titulo}`,
      `Categoria: ${selected.categoria}`,
      `Local: ${selected.cidade}, ${selected.estado}`,
      selected.preco              ? `Valor de venda: ${formatCurrency(selected.preco)}` : "",
      selected.faturamento_mensal ? `Faturamento mensal: ${formatCurrency(selected.faturamento_mensal)}` : "",
      selected.area_m2            ? `Área: ${selected.area_m2}m²` : "",
      selected.descricao          ? `Descrição: ${selected.descricao}` : "",
    ].filter(Boolean).join("\n");
    const corretorInfo = `Corretor: ${profile.nome}${profile.telefone ? " · " + formatPhone(profile.telefone) : ""}${profile.creci ? " · CRECI " + profile.creci : ""}`;
    const prompt = buildCopyPrompt({ contexto: "negocio_venda", formato, gatilho, dadosNegocio, corretorInfo });
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
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setTipoCaptacao("vendedor"); setCopyCaptacao(""); }}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${tipoCaptacao === "vendedor" ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-xl">🏪</div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Captação Vendedor</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">Para donos de negócio que querem vender</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setTipoCaptacao("investidor"); setCopyCaptacao(""); }}
                    className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all ${tipoCaptacao === "investidor" ? "border-primary bg-primary/5" : "border-border bg-muted/20 hover:bg-muted/40"}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-700 text-xl">📈</div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Captação Investidor</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">Para quem quer comprar um negócio</p>
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

              {/* STEP 3: Formato */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">3</div>
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

              {/* STEP 4: Copy com IA */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shrink-0">4</div>
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
                    ? <PostCaptacaoVendedor profile={profile} bairro={bairro} divRef={captacaoVendedorRef} />
                    : <PostCaptacaoInvestidor profile={profile} bairro={bairro} divRef={captacaoInvestidorRef} />
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
