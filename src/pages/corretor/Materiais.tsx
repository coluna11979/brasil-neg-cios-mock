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

const PRIMARY = "#2563eb";

const downloadCard = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
  if (!ref.current) return;
  const { default: html2canvas } = await import("html2canvas");
  const canvas = await html2canvas(ref.current, { scale: 3, useCORS: true, backgroundColor: null });
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
};

const Materiais = () => {
  usePageTitle("Materiais | Área do Corretor");
  const [profile, setProfile] = useState<Profile>({
    nome: "",
    email: "",
    telefone: "",
    creci: "",
    bairro: "",
    regiao: "",
    foto_url: "",
  });
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
          nome: data.nome || session.user.user_metadata?.nome || session.user.email?.split("@")[0] || "",
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

  const getInitials = (name: string) =>
    name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  const formatPhone = (tel: string) => {
    const d = tel.replace(/\D/g, "");
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return tel;
  };

  const emailSignatureHtml = `<table style="font-family:Arial,sans-serif;font-size:13px;color:#333;border-collapse:collapse">
  <tr>
    <td style="padding-right:16px;border-right:3px solid ${PRIMARY};vertical-align:middle">
      ${profile.foto_url
        ? `<img src="${profile.foto_url}" width="60" height="60" style="border-radius:50%;display:block" />`
        : `<div style="width:60px;height:60px;border-radius:50%;background:${PRIMARY};display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold;color:#fff">${getInitials(profile.nome)}</div>`
      }
    </td>
    <td style="padding-left:16px;vertical-align:middle">
      <strong style="font-size:15px;display:block;margin-bottom:2px">${profile.nome}</strong>
      <span style="color:#666;display:block;margin-bottom:4px">Corretor de Negócios · NegócioJá</span>
      <span style="display:block;margin-bottom:2px">${formatPhone(profile.telefone)}${profile.email ? ` | ${profile.email}` : ""}</span>
      ${profile.creci ? `<span style="display:block;margin-bottom:2px;color:#666">CRECI: ${profile.creci}</span>` : ""}
      <a href="https://brasil-neg-cios-mock.vercel.app" style="color:${PRIMARY}">brasil-neg-cios-mock.vercel.app</a>
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
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Materiais</h1>
            <p className="text-sm text-muted-foreground">Cartões de visita, assinatura de e-mail e stories</p>
          </div>
        </div>

        {/* ─── Section 1: Cartões de Visita ───────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Cartões de Visita</h2>
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Layout 1 — Moderno */}
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground font-medium">Layout 1 — Moderno</p>
              <div
                ref={cardRef1}
                style={{
                  width: 400,
                  height: 250,
                  background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
                  borderRadius: 12,
                  position: "relative",
                  overflow: "hidden",
                  padding: "28px 32px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxSizing: "border-box",
                }}
              >
                {/* Vertical accent bar */}
                <div style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  width: 5,
                  height: "100%",
                  background: PRIMARY,
                  borderRadius: "0 12px 12px 0",
                }} />

                {/* Top */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    {/* NJ badge */}
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: PRIMARY,
                      borderRadius: 8,
                      width: 32,
                      height: 32,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#fff",
                      marginBottom: 12,
                      fontFamily: "Arial, sans-serif",
                    }}>NJ</div>
                    <div style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#fff",
                      fontFamily: "Arial, sans-serif",
                      lineHeight: 1.2,
                      maxWidth: 280,
                    }}>{profile.nome || "Seu Nome"}</div>
                    <div style={{
                      fontSize: 12,
                      color: "#d1d5db",
                      fontFamily: "Arial, sans-serif",
                      marginTop: 4,
                    }}>Corretor de Negócios</div>
                  </div>
                </div>

                {/* Bottom */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {profile.telefone && (
                      <div style={{ fontSize: 11, color: "#e5e7eb", fontFamily: "Arial, sans-serif" }}>
                        📱 {formatPhone(profile.telefone)}
                      </div>
                    )}
                    {profile.email && (
                      <div style={{ fontSize: 11, color: "#e5e7eb", fontFamily: "Arial, sans-serif" }}>
                        ✉️ {profile.email}
                      </div>
                    )}
                  </div>
                  {profile.creci && (
                    <div style={{
                      fontSize: 10,
                      color: "#9ca3af",
                      fontFamily: "Arial, sans-serif",
                      textAlign: "right",
                    }}>
                      CRECI: {profile.creci}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => downloadCard(cardRef1, "cartao-moderno.png")}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors w-fit"
              >
                <Download className="h-4 w-4" />
                Baixar PNG
              </button>
            </div>

            {/* Layout 2 — Clean */}
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground font-medium">Layout 2 — Clean</p>
              <div
                ref={cardRef2}
                style={{
                  width: 400,
                  height: 250,
                  background: "#ffffff",
                  borderRadius: 12,
                  border: "1.5px solid #e5e7eb",
                  padding: "24px 28px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                {/* Brand */}
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: PRIMARY,
                  fontFamily: "Arial, sans-serif",
                  letterSpacing: 1,
                }}>NegócioJá</div>

                {/* Center: photo + name */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  {profile.foto_url ? (
                    <img
                      src={profile.foto_url}
                      alt={profile.nome}
                      style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover", border: `2px solid ${PRIMARY}` }}
                    />
                  ) : (
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      background: PRIMARY,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#fff",
                      fontFamily: "Arial, sans-serif",
                    }}>{getInitials(profile.nome)}</div>
                  )}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", fontFamily: "Arial, sans-serif" }}>
                      {profile.nome || "Seu Nome"}
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280", fontFamily: "Arial, sans-serif" }}>Corretor de Negócios</div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: "#e5e7eb", margin: "0 0 4px" }} />

                {/* Bottom info */}
                <div style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  fontSize: 10,
                  color: "#6b7280",
                  fontFamily: "Arial, sans-serif",
                  flexWrap: "wrap",
                }}>
                  {profile.telefone && <span>{formatPhone(profile.telefone)}</span>}
                  {profile.email && <span>{profile.email}</span>}
                  {profile.creci && <span>CRECI: {profile.creci}</span>}
                  {profile.bairro && <span>{profile.bairro}</span>}
                </div>
              </div>
              <button
                onClick={() => downloadCard(cardRef2, "cartao-clean.png")}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors w-fit"
              >
                <Download className="h-4 w-4" />
                Baixar PNG
              </button>
            </div>
          </div>
        </section>

        {/* ─── Section 2: Assinatura de E-mail ────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Assinatura de E-mail
          </h2>
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            {/* Preview */}
            <div className="rounded-lg border border-border bg-white p-4 overflow-x-auto">
              <div dangerouslySetInnerHTML={{ __html: emailSignatureHtml }} />
            </div>
            <button
              onClick={handleCopySignature}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado!" : "Copiar HTML"}
            </button>
            <p className="text-xs text-muted-foreground">
              Cole o HTML copiado no campo de assinatura do seu cliente de e-mail (Gmail, Outlook, etc.)
            </p>
          </div>
        </section>

        {/* ─── Section 3: Story Instagram ─────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Story Instagram</h2>
          <div className="flex flex-col gap-3">
            <div
              ref={storyRef}
              style={{
                width: 270,
                height: 480,
                background: "linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                borderRadius: 16,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "36px 24px 32px",
                boxSizing: "border-box",
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Decorative circles */}
              <div style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: "50%",
                background: `${PRIMARY}22`,
              }} />
              <div style={{
                position: "absolute",
                bottom: 60,
                left: -30,
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: `${PRIMARY}15`,
              }} />

              {/* Top: Logo */}
              <div style={{ textAlign: "center", zIndex: 1 }}>
                <div style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: PRIMARY,
                  borderRadius: 10,
                  width: 44,
                  height: 44,
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 8,
                  fontFamily: "Arial, sans-serif",
                }}>NJ</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "Arial, sans-serif" }}>
                  NegócioJá
                </div>
              </div>

              {/* Center: headline */}
              <div style={{ textAlign: "center", zIndex: 1, padding: "0 8px" }}>
                <div style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#fff",
                  fontFamily: "Arial, sans-serif",
                  lineHeight: 1.3,
                  marginBottom: 20,
                }}>
                  Seu negócio em boas mãos
                </div>

                {/* Photo / initials */}
                {profile.foto_url ? (
                  <img
                    src={profile.foto_url}
                    alt={profile.nome}
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      objectFit: "cover",
                      border: `3px solid ${PRIMARY}`,
                      margin: "0 auto 10px",
                      display: "block",
                    }}
                  />
                ) : (
                  <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: "50%",
                    background: PRIMARY,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "#fff",
                    margin: "0 auto 10px",
                    fontFamily: "Arial, sans-serif",
                  }}>{getInitials(profile.nome)}</div>
                )}

                <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", fontFamily: "Arial, sans-serif" }}>
                  {profile.nome || "Seu Nome"}
                </div>
                {(profile.bairro || profile.regiao) && (
                  <div style={{ fontSize: 11, color: "#d1d5db", fontFamily: "Arial, sans-serif", marginTop: 2 }}>
                    {[profile.bairro, profile.regiao].filter(Boolean).join(" · ")}
                  </div>
                )}
              </div>

              {/* CTA button */}
              <div style={{ zIndex: 1, width: "100%" }}>
                <div style={{
                  background: PRIMARY,
                  borderRadius: 50,
                  padding: "12px 24px",
                  textAlign: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#fff",
                  fontFamily: "Arial, sans-serif",
                  marginBottom: 10,
                }}>
                  Consulte-me!
                </div>
                {profile.telefone && (
                  <div style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", fontFamily: "Arial, sans-serif" }}>
                    {formatPhone(profile.telefone)}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => downloadCard(storyRef, "story-instagram.png")}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors w-fit"
            >
              <Download className="h-4 w-4" />
              Baixar PNG
            </button>
          </div>
        </section>
      </div>
    </CorretorLayout>
  );
};

export default Materiais;
