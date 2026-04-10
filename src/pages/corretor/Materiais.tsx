import { useEffect, useRef, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { supabase } from "@/lib/supabase";
import { Download, Mail, Copy, Check, Sparkles } from "lucide-react";

interface Profile {
  nome: string;
  email: string;
  telefone: string;
  creci: string;
  bairro: string;
  regiao: string;
  foto_url: string;
}

const GOLD = "#C49A1E";
const NAVY = "#0d1f3c";
const BLUE = "#1d4ed8";

const downloadCard = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
  if (!ref.current) return;
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(ref.current, { scale: 3, useCORS: true, backgroundColor: null });
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

function formatPhone(tel: string) {
  const d = tel.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

/* ─── Card 1: Executivo Noir ─────────────────────────────────────────────── */
function CardNoir({ profile, cardRef }: { profile: Profile; cardRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div
      ref={cardRef}
      style={{
        width: 400, height: 240,
        borderRadius: 14,
        overflow: "hidden",
        background: NAVY,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "26px 28px 22px 30px",
        fontFamily: "Arial, Helvetica, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Gold left accent bar */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
        background: `linear-gradient(180deg, ${GOLD} 0%, #e8c84a 50%, ${GOLD} 100%)`,
      }} />

      {/* Background large NJ watermark */}
      <div style={{
        position: "absolute", right: -12, bottom: -20,
        fontSize: 160, fontWeight: 900,
        color: "rgba(255,255,255,0.025)",
        fontFamily: "Arial Black, Arial, sans-serif",
        userSelect: "none",
        lineHeight: 1,
      }}>NJ</div>

      {/* Decorative arc */}
      <div style={{
        position: "absolute", right: -50, top: -50,
        width: 180, height: 180,
        borderRadius: "50%",
        border: `1px solid rgba(196,154,30,0.12)`,
      }} />
      <div style={{
        position: "absolute", right: -30, top: -30,
        width: 120, height: 120,
        borderRadius: "50%",
        border: `1px solid rgba(196,154,30,0.08)`,
      }} />

      {/* Top row: logo + CRECI */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: GOLD,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 900, color: "#000",
          }}>NJ</div>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 9.5, letterSpacing: 2, textTransform: "uppercase" }}>
            NegócioJá
          </span>
        </div>
        {profile.creci && (
          <div style={{
            border: `1px solid rgba(196,154,30,0.4)`,
            borderRadius: 20, padding: "3px 10px",
            fontSize: 9, color: GOLD, letterSpacing: 1,
          }}>
            CRECI {profile.creci}
          </div>
        )}
      </div>

      {/* Name + role */}
      <div>
        <div style={{
          fontSize: 26, fontWeight: 800, color: "#ffffff",
          lineHeight: 1.1, marginBottom: 6,
          letterSpacing: -0.5,
        }}>{profile.nome || "Seu Nome"}</div>
        <div style={{
          fontSize: 11, color: GOLD,
          letterSpacing: 2, textTransform: "uppercase", fontWeight: 600,
        }}>Corretor de Negócios</div>
      </div>

      {/* Bottom separator + contacts */}
      <div style={{
        borderTop: `1px solid rgba(196,154,30,0.2)`,
        paddingTop: 12,
        display: "flex",
        gap: 18,
        flexWrap: "wrap",
      }}>
        {profile.telefone && (
          <span style={{ fontSize: 10, color: "#94a3b8" }}>
            📱 {formatPhone(profile.telefone)}
          </span>
        )}
        <span style={{ fontSize: 10, color: "#94a3b8" }}>✉️ {profile.email}</span>
      </div>
    </div>
  );
}

/* ─── Card 2: Corporate Split ────────────────────────────────────────────── */
function CardCorporate({ profile, cardRef }: { profile: Profile; cardRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div
      ref={cardRef}
      style={{
        width: 400, height: 240,
        borderRadius: 14,
        overflow: "hidden",
        display: "flex",
        fontFamily: "Arial, Helvetica, sans-serif",
        boxSizing: "border-box",
        border: "1px solid #e2e8f0",
      }}
    >
      {/* Left column */}
      <div style={{
        width: 88,
        background: `linear-gradient(180deg, #1e3a8a 0%, ${BLUE} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "22px 10px 18px",
      }}>
        {/* Logo */}
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 900, color: "#fff",
        }}>NJ</div>

        {/* Vertical brand name */}
        <div style={{
          color: "rgba(255,255,255,0.45)",
          fontSize: 8.5, letterSpacing: 2.5,
          transform: "rotate(-90deg)",
          whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}>NegócioJá</div>

        {/* CRECI */}
        {profile.creci ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 8 }}>
            CRECI<br />{profile.creci}
          </div>
        ) : <div />}
      </div>

      {/* Right column */}
      <div style={{
        flex: 1,
        background: "#ffffff",
        padding: "22px 22px 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}>
        {/* Photo + Name */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            border: `2.5px solid ${BLUE}`,
            overflow: "hidden", flexShrink: 0,
            background: "#eff6ff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {profile.foto_url
              ? <img src={profile.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
              : <span style={{ fontSize: 18, fontWeight: 800, color: BLUE }}>{getInitials(profile.nome)}</span>
            }
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
              {profile.nome || "Seu Nome"}
            </div>
            <div style={{
              fontSize: 10, color: BLUE,
              letterSpacing: 1.5, textTransform: "uppercase",
              fontWeight: 700, marginTop: 3,
            }}>Corretor de Negócios</div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "#e2e8f0" }} />

        {/* Contacts */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {profile.telefone && (
            <div style={{ fontSize: 10.5, color: "#334155" }}>
              <span style={{ color: "#94a3b8", marginRight: 6 }}>📱</span>
              {formatPhone(profile.telefone)}
            </div>
          )}
          <div style={{ fontSize: 10.5, color: "#334155" }}>
            <span style={{ color: "#94a3b8", marginRight: 6 }}>✉️</span>
            {profile.email}
          </div>
          {(profile.bairro || profile.regiao) && (
            <div style={{ fontSize: 10, color: "#94a3b8" }}>
              <span style={{ marginRight: 6 }}>📍</span>
              {[profile.bairro, profile.regiao].filter(Boolean).join(" · ")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Story Instagram ─────────────────────────────────────────────────────── */
function StoryIG({ profile, storyRef }: { profile: Profile; storyRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div
      ref={storyRef}
      style={{
        width: 270, height: 480,
        borderRadius: 18,
        overflow: "hidden",
        background: `linear-gradient(160deg, ${NAVY} 0%, #0f2952 55%, #0d1f3c 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "36px 24px 32px",
        boxSizing: "border-box",
        position: "relative",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", background: `rgba(196,154,30,0.06)`, border: `1px solid rgba(196,154,30,0.1)` }} />
      <div style={{ position: "absolute", bottom: 80, left: -40, width: 130, height: 130, borderRadius: "50%", background: "rgba(29,78,216,0.08)" }} />

      {/* Top: Logo */}
      <div style={{ textAlign: "center", zIndex: 1 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: GOLD, borderRadius: 12,
          width: 48, height: 48,
          fontSize: 16, fontWeight: 900, color: "#000",
          marginBottom: 8,
        }}>NJ</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 2, textTransform: "uppercase" }}>
          NegócioJá
        </div>
      </div>

      {/* Center: headline + avatar */}
      <div style={{ textAlign: "center", zIndex: 1, padding: "0 8px" }}>
        <div style={{
          fontSize: 10, color: GOLD, letterSpacing: 2, textTransform: "uppercase",
          fontWeight: 700, marginBottom: 10,
        }}>Especialista em</div>
        <div style={{
          fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.25, marginBottom: 22,
        }}>
          Compra e Venda<br />de Negócios
        </div>

        {profile.foto_url ? (
          <img src={profile.foto_url} alt={profile.nome} crossOrigin="anonymous"
            style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: `3px solid ${GOLD}`, margin: "0 auto 12px", display: "block" }} />
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: `linear-gradient(135deg, ${BLUE}, #1e3a8a)`,
            border: `3px solid ${GOLD}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, fontWeight: 900, color: "#fff",
            margin: "0 auto 12px",
          }}>{getInitials(profile.nome)}</div>
        )}

        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{profile.nome || "Seu Nome"}</div>
        {(profile.bairro || profile.regiao) && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 3 }}>
            {[profile.bairro, profile.regiao].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div style={{ zIndex: 1, width: "100%" }}>
        <div style={{
          background: GOLD,
          borderRadius: 50,
          padding: "13px 24px",
          textAlign: "center",
          fontSize: 13, fontWeight: 800,
          color: "#000",
          marginBottom: 10,
          letterSpacing: 0.5,
        }}>
          Fale comigo agora!
        </div>
        {profile.telefone && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", textAlign: "center" }}>
            {formatPhone(profile.telefone)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */
const Materiais = () => {
  usePageTitle("Materiais | Área do Corretor");
  const [profile, setProfile] = useState<Profile>({ nome: "", email: "", telefone: "", creci: "", bairro: "", regiao: "", foto_url: "" });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const cardRef1 = useRef<HTMLDivElement>(null);
  const cardRef2 = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from("profiles")
        .select("nome, email, telefone, creci, bairro, regiao, foto_url")
        .eq("id", session.user.id)
        .single();
      if (data) {
        setProfile({
          nome: data.nome || session.user.user_metadata?.nome || "",
          email: data.email || session.user.email || "",
          telefone: data.telefone || "",
          creci: data.creci || "",
          bairro: data.bairro || "",
          regiao: data.regiao || "",
          foto_url: data.foto_url || "",
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const emailSignatureHtml = `<table cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#0f172a;border-collapse:collapse;max-width:520px">
  <tr>
    <td style="padding-right:0;vertical-align:top">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:18px;vertical-align:middle">
            ${profile.foto_url
              ? `<img src="${profile.foto_url}" width="64" height="64" style="border-radius:50%;display:block;border:2px solid ${BLUE}" />`
              : `<div style="width:64px;height:64px;border-radius:50%;background:${BLUE};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#fff;text-align:center;line-height:64px">${getInitials(profile.nome)}</div>`
            }
          </td>
          <td style="border-left:3px solid ${GOLD};padding-left:18px;vertical-align:middle">
            <p style="margin:0 0 2px;font-size:16px;font-weight:800;color:#0f172a">${profile.nome}</p>
            <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:${BLUE};letter-spacing:1px;text-transform:uppercase">Corretor de Negócios · NegócioJá</p>
            <p style="margin:0 0 2px;font-size:12px;color:#475569">${profile.telefone ? formatPhone(profile.telefone) : ""}${profile.telefone && profile.email ? " &nbsp;|&nbsp; " : ""}${profile.email}</p>
            ${profile.creci ? `<p style="margin:0 0 4px;font-size:11px;color:#94a3b8">CRECI: ${profile.creci}</p>` : ""}
            <a href="https://negocioja.com.br" style="font-size:11px;color:${BLUE};text-decoration:none;font-weight:600">negocioja.com.br</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const handleCopySignature = async () => {
    await navigator.clipboard.writeText(emailSignatureHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <CorretorLayout>
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Materiais</h1>
            <p className="text-sm text-muted-foreground">Cartões de visita, assinatura de e-mail e story para Instagram</p>
          </div>
        </div>

        {/* Cartões de Visita */}
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Cartões de Visita</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Arte em alta resolução (3×) pronta para gráfica</p>
          </div>
          <div className="flex flex-col lg:flex-row gap-10">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Layout Executivo Noir</p>
              <CardNoir profile={profile} cardRef={cardRef1} />
              <button onClick={() => downloadCard(cardRef1, `cartao-noir-${profile.nome}.png`)}
                className="flex items-center gap-2 rounded-xl bg-[#0d1f3c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d1f3c]/90 transition-colors w-fit">
                <Download className="h-4 w-4" /> Baixar PNG
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Layout Corporate</p>
              <CardCorporate profile={profile} cardRef={cardRef2} />
              <button onClick={() => downloadCard(cardRef2, `cartao-corporate-${profile.nome}.png`)}
                className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors w-fit">
                <Download className="h-4 w-4" /> Baixar PNG
              </button>
            </div>
          </div>
        </section>

        {/* Assinatura de E-mail */}
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" /> Assinatura de E-mail
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Cole no Gmail, Outlook ou qualquer cliente de e-mail</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="rounded-xl border border-border bg-white p-5 overflow-x-auto">
              <div dangerouslySetInnerHTML={{ __html: emailSignatureHtml }} />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleCopySignature}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                {copied ? <><Check className="h-4 w-4" /> Copiado!</> : <><Copy className="h-4 w-4" /> Copiar HTML</>}
              </button>
              <p className="text-xs text-muted-foreground">Cole em: Gmail → Configurações → Assinatura</p>
            </div>
          </div>
        </section>

        {/* Story Instagram */}
        <section>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-foreground">Story Instagram</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Arte 9:16 otimizada para stories e reels</p>
          </div>
          <div className="flex flex-col gap-3 w-fit">
            <StoryIG profile={profile} storyRef={storyRef} />
            <button onClick={() => downloadCard(storyRef, `story-instagram-${profile.nome}.png`)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity w-fit">
              <Download className="h-4 w-4" /> Baixar Story PNG
            </button>
          </div>
        </section>
      </div>
    </CorretorLayout>
  );
};

export default Materiais;
