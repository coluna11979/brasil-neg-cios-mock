import { useState, useMemo, useEffect } from "react";
import { X, Copy, Check, Share2, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

const FAIXAS = [
  { label: "Até R$ 50.000", value: "Até R$ 50.000" },
  { label: "R$ 50.000 - R$ 150.000", value: "R$ 50.000 - R$ 150.000" },
  { label: "R$ 150.000 - R$ 300.000", value: "R$ 150.000 - R$ 300.000" },
  { label: "R$ 300.000 - R$ 500.000", value: "R$ 300.000 - R$ 500.000" },
  { label: "Acima de R$ 500.000", value: "Acima de R$ 500.000" },
];

const CATEGORIAS = [
  "Alimentação", "Saúde e Estética", "Serviços", "Varejo",
  "Tecnologia", "Educação", "Automotivo", "Indústria",
  "Imóveis Comerciais",
];

const TIPOS = [
  { value: "negocio", label: "Negócio" },
  { value: "imovel", label: "Imóvel Comercial" },
  { value: "franquia", label: "Franquia" },
  { value: "galeria", label: "Galeria" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Filtros iniciais sugeridos com base no item de origem. */
  defaults?: {
    categoria?: string;
    tipo?: string;
    bairro?: string;
    cidade?: string;
    preco?: string;
  };
  /** Nome do cliente (opcional, vai na mensagem do WhatsApp). */
  clienteNome?: string;
  /** Telefone do cliente (opcional, abre WhatsApp direto se preenchido). */
  clienteTelefone?: string;
}

const CompartilharBuscaModal = ({ open, onClose, defaults, clienteNome, clienteTelefone }: Props) => {
  const [categoria, setCategoria] = useState(defaults?.categoria || "");
  const [tipo, setTipo] = useState(defaults?.tipo || "");
  const [preco, setPreco] = useState(defaults?.preco || "");
  const [bairro, setBairro] = useState(defaults?.bairro || "");
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState(false);
  const [bairrosOpts, setBairrosOpts] = useState<string[]>([]);

  // Busca bairros distintos do sistema (negocios.bairro + galerias.endereco)
  useEffect(() => {
    if (!open) return;
    let cancel = false;
    (async () => {
      const [{ data: negs }, { data: gals }] = await Promise.all([
        supabase.from("negocios").select("bairro").not("bairro", "is", null),
        supabase.from("galerias").select("endereco").not("endereco", "is", null),
      ]);
      const setBr = new Set<string>();
      (negs || []).forEach((n: { bairro: string | null }) => {
        const v = (n.bairro || "").trim();
        if (v) setBr.add(v);
      });
      // Para galerias, pega só a primeira parte do endereço (antes da vírgula)
      (gals || []).forEach((g: { endereco: string | null }) => {
        const first = (g.endereco || "").split(",")[0].trim();
        if (first) setBr.add(first);
      });
      if (!cancel) setBairrosOpts(Array.from(setBr).sort((a, b) => a.localeCompare(b, "pt-BR")));
    })();
    return () => { cancel = true; };
  }, [open]);

  // Origem real (negociaaky.com.br se em prod; senão usa origin atual)
  const origin = useMemo(() => {
    if (typeof window === "undefined") return "https://negociaaky.com.br";
    const o = window.location.origin;
    return o.includes("vercel.app") || o.includes("localhost") ? "https://negociaaky.com.br" : o;
  }, []);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (categoria) params.set("categoria", categoria);
    if (tipo) params.set("tipo", tipo);
    if (preco) params.set("preco", preco);
    if (bairro) params.set("bairro", bairro);
    if (q) params.set("q", q);
    const base = tipo === "galeria" ? "/galerias" : tipo === "imovel" ? "/imoveis" : "/busca";
    const qs = params.toString();
    return `${origin}${base}${qs ? `?${qs}` : ""}`;
  }, [origin, categoria, tipo, preco, bairro, q]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select texto
    }
  };

  const handleWhatsApp = () => {
    const saudacao = clienteNome
      ? `Olá ${clienteNome.split(" ")[0]}! `
      : "Olá! ";
    const msg = `${saudacao}Separei algumas opções que combinam com o seu interesse:\n\n${url}\n\nQualquer dúvida me chama!`;
    const phone = clienteTelefone?.replace(/\D/g, "") || "";
    const wa = phone
      ? `https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(wa, "_blank");
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "NegociaAky — Oportunidades selecionadas",
          text: clienteNome ? `${clienteNome.split(" ")[0]}, veja essas oportunidades:` : "Veja essas oportunidades:",
          url,
        });
      } catch {
        /* user cancelou */
      }
    } else {
      handleCopy();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto py-6 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Compartilhar busca filtrada</h2>
              <p className="text-xs text-muted-foreground">
                Monte um link com filtros pra enviar ao cliente
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v === "_any" ? "" : v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Qualquer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_any">Qualquer</SelectItem>
                  {TIPOS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v === "_any" ? "" : v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Qualquer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_any">Qualquer</SelectItem>
                  {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Faixa de preço</Label>
              <Select value={preco} onValueChange={(v) => setPreco(v === "_any" ? "" : v)}>
                <SelectTrigger className="mt-1.5"><SelectValue placeholder="Qualquer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_any">Qualquer</SelectItem>
                  {FAIXAS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Bairro / Região</Label>
              <Select value={bairro || "_any"} onValueChange={(v) => setBairro(v === "_any" ? "" : v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Qualquer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_any">Qualquer</SelectItem>
                  {bairrosOpts.length === 0 ? (
                    <div className="px-2 py-2 text-xs text-muted-foreground">Nenhum bairro cadastrado ainda</div>
                  ) : (
                    bairrosOpts.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Palavra-chave (opcional)</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Ex: pizzaria, padaria, ponto comercial..."
              className="mt-1.5" />
          </div>

          {/* Preview do link */}
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Link gerado</p>
            <p className="text-xs font-mono text-foreground break-all">{url}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2 px-5 py-4 border-t border-border bg-muted/20">
          <Button variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </Button>
          <Button variant="outline" onClick={() => window.open(url, "_blank")} className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Pré-visualizar
          </Button>
          <Button onClick={handleWhatsApp} className="gap-2 bg-green-600 hover:bg-green-700">
            <MessageCircle className="h-4 w-4" />
            {clienteTelefone ? "Enviar no WhatsApp" : "Abrir WhatsApp"}
          </Button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button variant="ghost" onClick={handleNativeShare} className="gap-2">
              <Share2 className="h-4 w-4" /> Compartilhar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompartilharBuscaModal;
