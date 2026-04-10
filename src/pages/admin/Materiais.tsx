import { useEffect, useRef, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/lib/supabase";
import { Download, Mail, Copy, Check, ChevronDown, ChevronUp, UserCircle } from "lucide-react";
import { Loader2 } from "lucide-react";

interface Corretor {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  creci?: string;
  bairro?: string;
  regiao?: string;
  foto_url?: string;
}

const GOLD = "#C49A1E";
const NAVY = "#0d1f3c";
const BLUE = "#1d4ed8";

function getInitials(nome: string) {
  return nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatPhone(phone?: string) {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

/* ─── Card Noir ────────────────────────────────────────────────────────────── */
function CardNoir({ corretor, cardRef }: { corretor: Corretor; cardRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div ref={cardRef} style={{
      width: 400, height: 240, borderRadius: 14, overflow: "hidden",
      background: NAVY, position: "relative",
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      padding: "26px 28px 22px 30px",
      fontFamily: "Arial, Helvetica, sans-serif", boxSizing: "border-box",
    }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: `linear-gradient(180deg, ${GOLD} 0%, #e8c84a 50%, ${GOLD} 100%)` }} />
      <div style={{ position: "absolute", right: -12, bottom: -20, fontSize: 160, fontWeight: 900, color: "rgba(255,255,255,0.025)", fontFamily: "Arial Black, Arial, sans-serif", userSelect: "none", lineHeight: 1 }}>NJ</div>
      <div style={{ position: "absolute", right: -50, top: -50, width: 180, height: 180, borderRadius: "50%", border: `1px solid rgba(196,154,30,0.12)` }} />
      <div style={{ position: "absolute", right: -30, top: -30, width: 120, height: 120, borderRadius: "50%", border: `1px solid rgba(196,154,30,0.08)` }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: "#000" }}>NJ</div>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 9.5, letterSpacing: 2, textTransform: "uppercase" }}>NegócioJá</span>
        </div>
        {corretor.creci && (
          <div style={{ border: `1px solid rgba(196,154,30,0.4)`, borderRadius: 20, padding: "3px 10px", fontSize: 9, color: GOLD, letterSpacing: 1 }}>
            CRECI {corretor.creci}
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#ffffff", lineHeight: 1.1, marginBottom: 6, letterSpacing: -0.5 }}>{corretor.nome}</div>
        <div style={{ fontSize: 11, color: GOLD, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Corretor de Negócios</div>
      </div>

      <div style={{ borderTop: `1px solid rgba(196,154,30,0.2)`, paddingTop: 12, display: "flex", gap: 18, flexWrap: "wrap" }}>
        {corretor.telefone && <span style={{ fontSize: 10, color: "#94a3b8" }}>📱 {formatPhone(corretor.telefone)}</span>}
        <span style={{ fontSize: 10, color: "#94a3b8" }}>✉️ {corretor.email}</span>
      </div>
    </div>
  );
}

/* ─── Card Corporate ───────────────────────────────────────────────────────── */
function CardCorporate({ corretor, cardRef }: { corretor: Corretor; cardRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div ref={cardRef} style={{
      width: 400, height: 240, borderRadius: 14, overflow: "hidden",
      display: "flex", fontFamily: "Arial, Helvetica, sans-serif",
      boxSizing: "border-box", border: "1px solid #e2e8f0",
    }}>
      <div style={{ width: 88, background: `linear-gradient(180deg, #1e3a8a 0%, ${BLUE} 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "22px 10px 18px" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff" }}>NJ</div>
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 8.5, letterSpacing: 2.5, transform: "rotate(-90deg)", whiteSpace: "nowrap", textTransform: "uppercase" }}>NegócioJá</div>
        {corretor.creci ? <div style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 8 }}>CRECI<br />{corretor.creci}</div> : <div />}
      </div>

      <div style={{ flex: 1, background: "#ffffff", padding: "22px 22px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2.5px solid ${BLUE}`, overflow: "hidden", flexShrink: 0, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {corretor.foto_url
              ? <img src={corretor.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
              : <span style={{ fontSize: 18, fontWeight: 800, color: BLUE }}>{getInitials(corretor.nome)}</span>
            }
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>{corretor.nome}</div>
            <div style={{ fontSize: 10, color: BLUE, letterSpacing: 1.5, textTransform: "uppercase", fontWeight: 700, marginTop: 3 }}>Corretor de Negócios</div>
          </div>
        </div>

        <div style={{ height: 1, background: "#e2e8f0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {corretor.telefone && <div style={{ fontSize: 10.5, color: "#334155" }}><span style={{ color: "#94a3b8", marginRight: 6 }}>📱</span>{formatPhone(corretor.telefone)}</div>}
          <div style={{ fontSize: 10.5, color: "#334155" }}><span style={{ color: "#94a3b8", marginRight: 6 }}>✉️</span>{corretor.email}</div>
          {(corretor.bairro || corretor.regiao) && (
            <div style={{ fontSize: 10, color: "#94a3b8" }}><span style={{ marginRight: 6 }}>📍</span>{[corretor.bairro, corretor.regiao].filter(Boolean).join(" · ")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── MateriaisCorretor accordion ─────────────────────────────────────────── */
function MateriaisCorretor({ corretor }: { corretor: Corretor }) {
  const cardRef1 = useRef<HTMLDivElement>(null);
  const cardRef2 = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const downloadCard = async (ref: React.RefObject<HTMLDivElement>, filename: string) => {
    if (!ref.current) return;
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(ref.current, { scale: 3, useCORS: true, backgroundColor: null });
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const assinatura = `<table cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#0f172a;border-collapse:collapse;max-width:520px">
  <tr>
    <td style="padding-right:0;vertical-align:top">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:18px;vertical-align:middle">
            ${corretor.foto_url
              ? `<img src="${corretor.foto_url}" width="64" height="64" style="border-radius:50%;display:block;border:2px solid ${BLUE}" />`
              : `<div style="width:64px;height:64px;border-radius:50%;background:${BLUE};text-align:center;line-height:64px;font-size:22px;font-weight:800;color:#fff">${getInitials(corretor.nome)}</div>`
            }
          </td>
          <td style="border-left:3px solid ${GOLD};padding-left:18px;vertical-align:middle">
            <p style="margin:0 0 2px;font-size:16px;font-weight:800;color:#0f172a">${corretor.nome}</p>
            <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:${BLUE};letter-spacing:1px;text-transform:uppercase">Corretor de Negócios · NegócioJá</p>
            <p style="margin:0 0 2px;font-size:12px;color:#475569">${corretor.telefone ? formatPhone(corretor.telefone) : ""}${corretor.telefone && corretor.email ? " &nbsp;|&nbsp; " : ""}${corretor.email}</p>
            ${corretor.creci ? `<p style="margin:0 0 4px;font-size:11px;color:#94a3b8">CRECI: ${corretor.creci}</p>` : ""}
            <a href="https://negocioja.com.br" style="font-size:11px;color:${BLUE};text-decoration:none;font-weight:600">negocioja.com.br</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

  const copyAssinatura = () => {
    navigator.clipboard.writeText(assinatura);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-sm text-primary shrink-0 overflow-hidden">
            {corretor.foto_url
              ? <img src={corretor.foto_url} className="w-full h-full object-cover" />
              : getInitials(corretor.nome)
            }
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">{corretor.nome}</p>
            <p className="text-xs text-muted-foreground">{corretor.email}</p>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-5 py-5 space-y-8 bg-muted/10">
          {/* Cartões */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Cartões de Visita</p>
            <div className="flex flex-wrap gap-8">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Executivo Noir</p>
                <CardNoir corretor={corretor} cardRef={cardRef1} />
                <button onClick={() => downloadCard(cardRef1, `noir-${corretor.nome}.png`)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0d1f3c] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0d1f3c]/80 transition-colors w-full justify-center">
                  <Download className="h-3.5 w-3.5" /> Baixar Noir
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Corporate</p>
                <CardCorporate corretor={corretor} cardRef={cardRef2} />
                <button onClick={() => downloadCard(cardRef2, `corporate-${corretor.nome}.png`)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors w-full justify-center">
                  <Download className="h-3.5 w-3.5" /> Baixar Corporate
                </button>
              </div>
            </div>
          </div>

          {/* Assinatura */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Assinatura de E-mail
            </p>
            <div className="rounded-lg border border-border bg-white p-4 mb-2 overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: assinatura }} />
            <button onClick={copyAssinatura}
              className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors">
              {copied ? <><Check className="h-3.5 w-3.5 text-green-600" /> Copiado!</> : <><Copy className="h-3.5 w-3.5" /> Copiar HTML</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */
const AdminMateriais = () => {
  usePageTitle("Admin - Materiais");
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, nome, email, telefone, creci, bairro, regiao, foto_url")
      .eq("role", "corretor")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => {
        setCorretores((data as Corretor[]) || []);
        setLoading(false);
      });
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Materiais</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cartões de visita e assinatura de e-mail para cada corretor ativo
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : corretores.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <UserCircle className="h-12 w-12 mb-3 opacity-20" />
            <p className="font-medium">Nenhum corretor ativo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {corretores.map((c) => (
              <MateriaisCorretor key={c.id} corretor={c} />
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminMateriais;
