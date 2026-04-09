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

const PRIMARY = "#2563eb";

function getInitials(nome: string) {
  return nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

function formatPhone(phone?: string) {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return phone;
}

function Card1({ corretor, cardRef }: { corretor: Corretor; cardRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div
      ref={cardRef}
      style={{
        width: 400, height: 250, borderRadius: 12, overflow: "hidden",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)",
        position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "24px 20px 20px 24px", fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Barra lateral */}
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 6, background: PRIMARY, borderRadius: "0 12px 12px 0" }} />
      {/* Badge NJ */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ background: PRIMARY, borderRadius: 6, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>NJ</span>
        </div>
        <span style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" }}>NegócioJá</span>
      </div>
      {/* Nome */}
      <div>
        <div style={{ color: "#ffffff", fontWeight: 800, fontSize: 22, lineHeight: 1.2, marginBottom: 4 }}>{corretor.nome}</div>
        <div style={{ color: "#94a3b8", fontSize: 12, letterSpacing: 0.5 }}>Corretor de Negócios</div>
      </div>
      {/* Contatos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {corretor.telefone && (
          <div style={{ color: "#cbd5e1", fontSize: 11 }}>📱 {formatPhone(corretor.telefone)}</div>
        )}
        <div style={{ color: "#cbd5e1", fontSize: 11 }}>✉️ {corretor.email}</div>
        {corretor.creci && (
          <div style={{ color: "#64748b", fontSize: 10 }}>CRECI: {corretor.creci}</div>
        )}
      </div>
    </div>
  );
}

function Card2({ corretor, cardRef }: { corretor: Corretor; cardRef: React.RefObject<HTMLDivElement> }) {
  return (
    <div
      ref={cardRef}
      style={{
        width: 400, height: 250, borderRadius: 12, overflow: "hidden",
        background: "#ffffff", border: "1.5px solid #e2e8f0",
        display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
        padding: "20px 28px", fontFamily: "Arial, sans-serif", gap: 8,
      }}
    >
      <div style={{ color: PRIMARY, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>NegócioJá</div>
      {/* Avatar */}
      <div style={{ width: 56, height: 56, borderRadius: "50%", overflow: "hidden", border: `2.5px solid ${PRIMARY}`, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {corretor.foto_url
          ? <img src={corretor.foto_url} style={{ width: "100%", height: "100%", objectFit: "cover" }} crossOrigin="anonymous" />
          : <span style={{ color: PRIMARY, fontWeight: 800, fontSize: 18 }}>{getInitials(corretor.nome)}</span>
        }
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#0f172a", fontWeight: 800, fontSize: 18, lineHeight: 1.2 }}>{corretor.nome}</div>
        <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>Corretor de Negócios</div>
      </div>
      <div style={{ width: "100%", height: 1, background: "#e2e8f0", margin: "4px 0" }} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {corretor.telefone && <span style={{ color: "#475569", fontSize: 10 }}>📱 {formatPhone(corretor.telefone)}</span>}
        <span style={{ color: "#475569", fontSize: 10 }}>✉️ {corretor.email}</span>
        {corretor.creci && <span style={{ color: "#94a3b8", fontSize: 10 }}>CRECI: {corretor.creci}</span>}
        {corretor.bairro && <span style={{ color: "#94a3b8", fontSize: 10 }}>📍 {corretor.bairro}</span>}
      </div>
    </div>
  );
}

function MateriaisCorretor({ corretor }: { corretor: Corretor }) {
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
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

  const assinatura = `<table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;font-size:13px;color:#333333;max-width:480px">
  <tr>
    ${corretor.foto_url ? `<td style="padding-right:16px;border-right:3px solid ${PRIMARY};vertical-align:middle">
      <img src="${corretor.foto_url}" width="60" height="60" style="border-radius:50%;display:block" />
    </td>` : ""}
    <td style="padding-left:${corretor.foto_url ? "16" : "0"}px;vertical-align:middle">
      <strong style="font-size:15px;color:#0f172a">${corretor.nome}</strong><br/>
      <span style="color:#64748b;font-size:12px">Corretor de Negócios · NegócioJá</span><br/>
      <span style="font-size:12px">${formatPhone(corretor.telefone)} ${corretor.telefone && corretor.email ? "·" : ""} ${corretor.email}</span><br/>
      ${corretor.creci ? `<span style="font-size:11px;color:#94a3b8">CRECI: ${corretor.creci}</span><br/>` : ""}
      <a href="https://brasil-neg-cios-mock.vercel.app" style="color:${PRIMARY};font-size:11px;text-decoration:none">brasil-neg-cios-mock.vercel.app</a>
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
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
      >
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
        <div className="border-t border-border px-5 py-5 space-y-6 bg-muted/10">
          {/* Cartões */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cartões de Visita</p>
            <div className="flex flex-wrap gap-6">
              <div className="space-y-2">
                <Card1 corretor={corretor} cardRef={card1Ref} />
                <button onClick={() => downloadCard(card1Ref, `cartao-moderno-${corretor.nome}.png`)}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors w-full justify-center">
                  <Download className="h-3.5 w-3.5" /> Baixar Moderno
                </button>
              </div>
              <div className="space-y-2">
                <Card2 corretor={corretor} cardRef={card2Ref} />
                <button onClick={() => downloadCard(card2Ref, `cartao-clean-${corretor.nome}.png`)}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors w-full justify-center">
                  <Download className="h-3.5 w-3.5" /> Baixar Clean
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
              {copied ? <><Check className="h-3.5 w-3.5 text-green-600" />Copiado!</> : <><Copy className="h-3.5 w-3.5" />Copiar HTML</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
