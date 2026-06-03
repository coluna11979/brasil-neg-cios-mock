import { useState, useMemo, useEffect } from "react";
import { X, Copy, Check, Share2, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";

// ─── Opções por tipo ────────────────────────────────────────────────────────
const TIPOS = [
  { value: "negocio", label: "Negócio" },
  { value: "imovel", label: "Imóvel Comercial" },
  { value: "franquia", label: "Franquia" },
  { value: "galeria", label: "Galeria" },
];

const CATEGORIAS_NEGOCIO = [
  "Alimentação", "Saúde e Estética", "Serviços", "Varejo",
  "Tecnologia", "Educação", "Automotivo", "Indústria",
];

const FAIXAS_VENDA = [
  { value: "Até R$ 50.000", label: "Até R$ 50.000" },
  { value: "R$ 50.000 - R$ 150.000", label: "R$ 50.000 a R$ 150.000" },
  { value: "R$ 150.000 - R$ 300.000", label: "R$ 150.000 a R$ 300.000" },
  { value: "R$ 300.000 - R$ 500.000", label: "R$ 300.000 a R$ 500.000" },
  { value: "Acima de R$ 500.000", label: "Acima de R$ 500.000" },
];

const FAIXAS_ALUGUEL = [
  { value: "Até R$ 1.000", label: "Até R$ 1.000/mês", min: 0, max: 1000 },
  { value: "R$ 1.000 - R$ 3.000", label: "R$ 1.000 a R$ 3.000/mês", min: 1000, max: 3000 },
  { value: "R$ 3.000 - R$ 5.000", label: "R$ 3.000 a R$ 5.000/mês", min: 3000, max: 5000 },
  { value: "R$ 5.000 - R$ 10.000", label: "R$ 5.000 a R$ 10.000/mês", min: 5000, max: 10000 },
  { value: "Acima de R$ 10.000", label: "Acima de R$ 10.000/mês", min: 10000, max: Infinity },
];

const TIPOS_ESPACO = ["Loja", "Sala", "Box", "Quiosque", "Sobreloja", "Outro"];

interface Props {
  open: boolean;
  onClose: () => void;
  defaults?: {
    categoria?: string;
    tipo?: string;
    bairro?: string;
    cidade?: string;
    preco?: string;
    galeria_id?: string;
  };
  clienteNome?: string;
  clienteTelefone?: string;
}

interface GaleriaOpt { id: string; nome: string; cidade: string; }

const CompartilharBuscaModal = ({ open, onClose, defaults, clienteNome, clienteTelefone }: Props) => {
  const [tipo, setTipo] = useState(defaults?.tipo || "negocio");
  // Campos comuns
  const [bairro, setBairro] = useState(defaults?.bairro || "");
  const [q, setQ] = useState("");
  // Negócio
  const [categoria, setCategoria] = useState(defaults?.categoria || "");
  const [precoVenda, setPrecoVenda] = useState(defaults?.preco || "");
  // Imóvel
  const [operacao, setOperacao] = useState<"venda" | "locacao" | "ambos">("venda");
  const [precoAluguel, setPrecoAluguel] = useState("");
  // Galeria
  const [galeriaId, setGaleriaId] = useState(defaults?.galeria_id || "");
  const [tipoEspaco, setTipoEspaco] = useState("");
  const [aluguelFaixa, setAluguelFaixa] = useState("");
  const [apenasDisponiveis, setApenasDisponiveis] = useState(true);
  // Franquia
  const [investimentoFaixa, setInvestimentoFaixa] = useState("");

  const [copied, setCopied] = useState(false);
  const [bairrosOpts, setBairrosOpts] = useState<string[]>([]);
  const [galeriasOpts, setGaleriasOpts] = useState<GaleriaOpt[]>([]);

  // Carrega listas do banco
  useEffect(() => {
    if (!open) return;
    let cancel = false;
    (async () => {
      const [{ data: negs }, { data: gals }] = await Promise.all([
        supabase.from("negocios").select("bairro").not("bairro", "is", null),
        supabase.from("galerias").select("id, nome, cidade, endereco").order("nome"),
      ]);
      const setBr = new Set<string>();
      (negs || []).forEach((n: { bairro: string | null }) => {
        const v = (n.bairro || "").trim();
        if (v) setBr.add(v);
      });
      (gals || []).forEach((g: { endereco?: string | null }) => {
        const first = (g.endereco || "").split(",")[0].trim();
        if (first) setBr.add(first);
      });
      if (!cancel) {
        setBairrosOpts(Array.from(setBr).sort((a, b) => a.localeCompare(b, "pt-BR")));
        setGaleriasOpts((gals || []).map((g: { id: string; nome: string; cidade: string }) => ({ id: g.id, nome: g.nome, cidade: g.cidade })));
      }
    })();
    return () => { cancel = true; };
  }, [open]);

  const origin = useMemo(() => {
    if (typeof window === "undefined") return "https://negociaaky.com.br";
    const o = window.location.origin;
    return o.includes("vercel.app") || o.includes("localhost") ? "https://negociaaky.com.br" : o;
  }, []);

  // Monta URL contextual ao tipo
  const url = useMemo(() => {
    const params = new URLSearchParams();
    let base = "/busca";

    if (tipo === "galeria") {
      base = "/galerias";
      if (galeriaId) params.set("id", galeriaId);
      if (tipoEspaco) params.set("tipo_espaco", tipoEspaco);
      if (aluguelFaixa) {
        const f = FAIXAS_ALUGUEL.find((x) => x.value === aluguelFaixa);
        if (f) {
          if (f.min > 0) params.set("aluguel_min", String(f.min));
          if (Number.isFinite(f.max)) params.set("aluguel_max", String(f.max));
        }
      }
      if (apenasDisponiveis) params.set("disponivel", "1");
      if (bairro) params.set("bairro", bairro);
    } else if (tipo === "imovel") {
      base = "/imoveis";
      params.set("tipo", "imovel");
      if (operacao && operacao !== "ambos") params.set("operacao", operacao);
      if (operacao === "venda" && precoVenda) params.set("preco", precoVenda);
      if ((operacao === "locacao" || operacao === "ambos") && precoAluguel) params.set("aluguel", precoAluguel);
      if (bairro) params.set("bairro", bairro);
      if (q) params.set("q", q);
    } else if (tipo === "franquia") {
      base = "/busca";
      params.set("tipo", "franquia");
      if (categoria) params.set("categoria", categoria);
      if (investimentoFaixa) params.set("preco", investimentoFaixa);
      if (bairro) params.set("bairro", bairro);
      if (q) params.set("q", q);
    } else {
      // negocio
      base = "/busca";
      params.set("tipo", "negocio");
      if (categoria) params.set("categoria", categoria);
      if (precoVenda) params.set("preco", precoVenda);
      if (bairro) params.set("bairro", bairro);
      if (q) params.set("q", q);
    }

    const qs = params.toString();
    return `${origin}${base}${qs ? `?${qs}` : ""}`;
  }, [origin, tipo, galeriaId, tipoEspaco, aluguelFaixa, apenasDisponiveis, bairro, operacao, precoVenda, precoAluguel, categoria, investimentoFaixa, q]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* */ }
  };

  const handleWhatsApp = () => {
    const saudacao = clienteNome ? `Olá ${clienteNome.split(" ")[0]}! ` : "Olá! ";
    let descricao = "";
    if (tipo === "galeria") {
      const g = galeriasOpts.find((gg) => gg.id === galeriaId);
      descricao = g
        ? `separei espaços na ${g.nome}${tipoEspaco ? ` (tipo: ${tipoEspaco})` : ""}${aluguelFaixa ? ` ${aluguelFaixa}` : ""}`
        : `separei opções de espaços em galerias${bairro ? ` no(a) ${bairro}` : ""}`;
    } else if (tipo === "imovel") {
      descricao = `separei imóveis comerciais${operacao === "locacao" ? " para locação" : operacao === "venda" ? " à venda" : ""}${bairro ? ` no(a) ${bairro}` : ""}`;
    } else if (tipo === "franquia") {
      descricao = `separei franquias${categoria ? ` em ${categoria}` : ""}${investimentoFaixa ? ` (${investimentoFaixa})` : ""}`;
    } else {
      descricao = `separei algumas oportunidades${categoria ? ` em ${categoria}` : ""}${bairro ? ` no(a) ${bairro}` : ""}`;
    }
    const msg = `${saudacao}Seguindo a nossa conversa, ${descricao} que combinam com o seu interesse:\n\n${url}\n\nQualquer dúvida me chama!`;
    const phone = clienteTelefone?.replace(/\D/g, "") || "";
    const wa = phone
      ? `https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(wa, "_blank");
  };

  if (!open) return null;

  // ─── Painéis por tipo ─────────────────────────────────────────────────────
  const renderFiltrosNegocio = () => (
    <>
      <FieldSelect label="Categoria" value={categoria} onChange={setCategoria}
        options={CATEGORIAS_NEGOCIO.map((c) => ({ value: c, label: c }))} placeholder="Qualquer" />
      <FieldSelect label="Faixa de preço" value={precoVenda} onChange={setPrecoVenda}
        options={FAIXAS_VENDA} placeholder="Qualquer" />
    </>
  );

  const renderFiltrosImovel = () => (
    <>
      <FieldSelect label="Operação" value={operacao} onChange={(v) => setOperacao(v as "venda" | "locacao" | "ambos")}
        options={[
          { value: "venda", label: "Venda" },
          { value: "locacao", label: "Locação" },
          { value: "ambos", label: "Venda ou Locação" },
        ]} hideEmpty />
      {operacao === "venda" && (
        <FieldSelect label="Faixa de preço (venda)" value={precoVenda} onChange={setPrecoVenda}
          options={FAIXAS_VENDA} placeholder="Qualquer" />
      )}
      {(operacao === "locacao" || operacao === "ambos") && (
        <FieldSelect label="Faixa de aluguel" value={precoAluguel} onChange={setPrecoAluguel}
          options={FAIXAS_ALUGUEL.map((f) => ({ value: f.value, label: f.label }))} placeholder="Qualquer" />
      )}
    </>
  );

  const renderFiltrosGaleria = () => (
    <>
      <FieldSelect label="Galeria específica" value={galeriaId} onChange={setGaleriaId}
        options={galeriasOpts.map((g) => ({ value: g.id, label: `${g.nome} · ${g.cidade}` }))}
        placeholder="Todas as galerias" />
      <FieldSelect label="Tipo de espaço" value={tipoEspaco} onChange={setTipoEspaco}
        options={TIPOS_ESPACO.map((t) => ({ value: t, label: t }))} placeholder="Qualquer" />
      <FieldSelect label="Faixa de aluguel" value={aluguelFaixa} onChange={setAluguelFaixa}
        options={FAIXAS_ALUGUEL.map((f) => ({ value: f.value, label: f.label }))} placeholder="Qualquer" />
      <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2 cursor-pointer">
        <input type="checkbox" checked={apenasDisponiveis} onChange={(e) => setApenasDisponiveis(e.target.checked)} />
        Mostrar apenas espaços <strong>disponíveis</strong>
      </label>
    </>
  );

  const renderFiltrosFranquia = () => (
    <>
      <FieldSelect label="Setor" value={categoria} onChange={setCategoria}
        options={CATEGORIAS_NEGOCIO.map((c) => ({ value: c, label: c }))} placeholder="Qualquer" />
      <FieldSelect label="Investimento inicial" value={investimentoFaixa} onChange={setInvestimentoFaixa}
        options={FAIXAS_VENDA.map((f) => ({ value: f.value, label: f.label.replace("Até", "Até").replace("Acima", "Acima") }))}
        placeholder="Qualquer" />
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-start sm:justify-center bg-black/50 backdrop-blur-sm overflow-y-auto sm:py-6 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg bg-card shadow-2xl min-h-full sm:min-h-0 sm:rounded-2xl sm:border sm:border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Share2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">Compartilhar busca filtrada</h2>
              <p className="text-xs text-muted-foreground">Os filtros mudam conforme o tipo selecionado</p>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Tipo (sempre primeiro) */}
          <FieldSelect label="O que você quer compartilhar?" value={tipo} onChange={setTipo}
            options={TIPOS} hideEmpty />

          {/* Painel contextual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tipo === "negocio" && renderFiltrosNegocio()}
            {tipo === "imovel" && renderFiltrosImovel()}
            {tipo === "galeria" && renderFiltrosGaleria()}
            {tipo === "franquia" && renderFiltrosFranquia()}

            {/* Bairro/Região: comum a todos exceto quando galeria específica */}
            {!(tipo === "galeria" && galeriaId) && (
              <div>
                <Label className="text-xs">Bairro / Região</Label>
                <Select value={bairro || "_any"} onValueChange={(v) => setBairro(v === "_any" ? "" : v)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Qualquer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_any">Qualquer</SelectItem>
                    {bairrosOpts.length === 0 ? (
                      <div className="px-2 py-2 text-xs text-muted-foreground">Nenhum cadastrado</div>
                    ) : (
                      bairrosOpts.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Palavra-chave (opcional, exceto galeria com id) */}
          {!(tipo === "galeria" && galeriaId) && tipo !== "galeria" && (
            <div>
              <Label className="text-xs">Palavra-chave (opcional)</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Ex: padaria, ponto comercial, perto do metrô..."
                className="mt-1.5" />
            </div>
          )}

          {/* Preview do link */}
          <div className="rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Link gerado</p>
            <p className="text-xs font-mono text-foreground break-all">{url}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 px-5 py-4 border-t border-border bg-muted/20">
          <Button variant="outline" onClick={handleCopy} className="gap-2 min-w-0">
            {copied ? <Check className="h-4 w-4 text-green-600 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
            <span className="truncate">{copied ? "Copiado!" : "Copiar"}</span>
          </Button>
          <Button variant="outline" onClick={() => window.open(url, "_blank")} className="gap-2 min-w-0">
            <ExternalLink className="h-4 w-4 shrink-0" />
            <span className="truncate">Pré-visualizar</span>
          </Button>
          <Button onClick={handleWhatsApp} className="gap-2 bg-green-600 hover:bg-green-700 min-w-0 col-span-2 sm:col-span-1">
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">{clienteTelefone ? "Enviar WhatsApp" : "WhatsApp"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Subcomponente reutilizável de Select ────────────────────────────────────
interface FieldSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  hideEmpty?: boolean;
}
const FieldSelect = ({ label, value, onChange, options, placeholder = "Qualquer", hideEmpty }: FieldSelectProps) => (
  <div>
    <Label className="text-xs">{label}</Label>
    <Select value={value || "_any"} onValueChange={(v) => onChange(v === "_any" ? "" : v)}>
      <SelectTrigger className="mt-1.5"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {!hideEmpty && <SelectItem value="_any">{placeholder}</SelectItem>}
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

export default CompartilharBuscaModal;
