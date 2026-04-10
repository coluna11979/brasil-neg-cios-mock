import { useState, useEffect, useRef } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { callClaude } from "@/lib/anthropic";
import { supabase } from "@/lib/supabase";
import {
  Calculator, TrendingUp, DollarSign, Clock, Sparkles,
  Copy, Check, Loader2, ChevronDown, ChevronUp, Info,
  BarChart3, Percent, AlertCircle, RefreshCw, FileDown,
} from "lucide-react";

// ─── Benchmarks ───────────────────────────────────────────────────────────────
const BENCHMARKS = [
  { nome: "Poupança",   pct_mensal: 0.60, cor: "#94a3b8", emoji: "🏦" },
  { nome: "CDB 100%",  pct_mensal: 0.88, cor: "#60a5fa", emoji: "📄" },
  { nome: "Tesouro",   pct_mensal: 0.95, cor: "#818cf8", emoji: "🏛️" },
  { nome: "FII médio", pct_mensal: 0.80, cor: "#f97316", emoji: "🏢" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtPct(v: number, decimals = 2) {
  return `${v.toFixed(decimals).replace(".", ",")}%`;
}
function parseBrl(v: string): number {
  return parseInt(v.replace(/\D/g, "") || "0", 10);
}
function maskBrl(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("pt-BR");
}
function hoje() {
  return new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function Stat({ label, value, sub, color = "bg-card border border-border", textColor = "text-foreground", icon }: {
  label: string; value: string; sub?: string; color?: string; textColor?: string; icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
          <p className={`font-display text-2xl font-bold ${textColor}`}>{value}</p>
          {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
        </div>
        {icon && <div className="opacity-70 mt-0.5">{icon}</div>}
      </div>
    </div>
  );
}

// ─── Benchmark bar ────────────────────────────────────────────────────────────
function BenchmarkBar({ nome, pct, roiNegocio, cor, emoji }: {
  nome: string; pct: number; roiNegocio: number; cor: string; emoji: string;
}) {
  const max    = Math.max(roiNegocio, 3);
  const width    = Math.min((pct / max) * 100, 100);
  const widthNeg = Math.min((roiNegocio / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{emoji} {nome}</span>
        <span className="font-semibold text-foreground">{fmtPct(pct)}/mês</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${width}%`, background: cor }} />
      </div>
      {nome === BENCHMARKS[0].nome && (
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-green-600">🏪 Este Negócio</span>
            <span className="font-bold text-green-600">{fmtPct(roiNegocio)}/mês</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500" style={{ width: `${widthNeg}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Campo moeda ──────────────────────────────────────────────────────────────
function CampoMoeda({ label, value, onChange, placeholder, hint, autoCalc, onReset, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string;
  autoCalc?: boolean; onReset?: () => void; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground">{label}</label>
        {autoCalc && onReset && (
          <button onClick={onReset} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <RefreshCw className="h-3 w-3" /> auto
          </button>
        )}
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
        <input
          value={value}
          onChange={(e) => onChange(maskBrl(e.target.value))}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full rounded-xl border pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-40 transition-colors
            ${autoCalc ? "border-primary/40 bg-primary/5 text-foreground" : "border-border bg-muted"}`}
        />
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {autoCalc && <p className="text-xs text-primary/70">✦ Calculado automaticamente</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const CalculadoraROI = () => {
  usePageTitle("Calculadora ROI | Área do Corretor");

  // ── Perfil do corretor ──
  const [corretor, setCorretor] = useState<{
    nome: string; creci: string; telefone: string; email: string;
  }>({ nome: "", creci: "", telefone: "", email: "" });

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome, creci, telefone, email")
        .eq("id", data.session.user.id)
        .single();
      if (profile) setCorretor({
        nome:     profile.nome     || data.session.user.user_metadata?.nome || "",
        creci:    profile.creci    || "",
        telefone: profile.telefone || "",
        email:    profile.email    || data.session.user.email || "",
      });
    });
  }, []);

  // ── Inputs ──
  const [precoTotalInput,   setPrecoTotalInput]   = useState("");
  const [entradaInput,      setEntradaInput]       = useState("");
  const [numParcelas,       setNumParcelas]        = useState(0);
  const [valorParcelaInput, setValorParcelaInput]  = useState("");
  const [parcelaManual,     setParcelaManual]      = useState(false);
  const [faturamentoInput,  setFaturamentoInput]   = useState("");
  const [despesasPct,       setDespesasPct]        = useState(50);
  const [despesasInput,     setDespesasInput]      = useState("");
  const [usarDespesaManual, setUsarDespesaManual]  = useState(false);
  const [nomeNegocio,       setNomeNegocio]        = useState("");
  const [segmento,          setSegmento]           = useState("");
  const [descricao,         setDescricao]          = useState("");

  // ── IA / PDF ──
  const [argumento,     setArgumento]    = useState("");
  const [generating,    setGenerating]   = useState(false);
  const [gerandoPdf,    setGerandoPdf]   = useState(false);
  const [copied,        setCopied]       = useState(false);
  const [showDetalhes,  setShowDetalhes] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  // ── Valores parsed ──
  const precoTotal      = parseBrl(precoTotalInput);
  const entrada         = parseBrl(entradaInput);
  const faturamento     = parseBrl(faturamentoInput);
  const despesasManuais = parseBrl(despesasInput);
  const despesas        = usarDespesaManual ? despesasManuais : Math.round(faturamento * (despesasPct / 100));
  const lucroLiquido    = faturamento - despesas;

  // ── Auto-calcula parcela ──────────────────────────────────────────────────
  const restanteParcelar = precoTotal > 0 && entrada > 0 ? Math.max(precoTotal - entrada, 0) : 0;
  const parcelaAutoCalc  = numParcelas > 0 && restanteParcelar > 0
    ? Math.ceil(restanteParcelar / numParcelas) : 0;

  useEffect(() => {
    if (!parcelaManual && parcelaAutoCalc > 0) setValorParcelaInput(parcelaAutoCalc.toLocaleString("pt-BR"));
    if (!parcelaManual && parcelaAutoCalc === 0) setValorParcelaInput("");
  }, [parcelaAutoCalc, parcelaManual]);

  useEffect(() => { setParcelaManual(false); }, [precoTotalInput, entradaInput, numParcelas]);

  const valorParcela    = parseBrl(valorParcelaInput);
  const totalParcelado  = numParcelas * valorParcela;
  const totalInvestido  = numParcelas > 0 && valorParcela > 0 ? (entrada + totalParcelado) : (entrada || precoTotal);
  const temParcelamento = numParcelas > 0 && valorParcela > 0;

  // ── ROI ──────────────────────────────────────────────────────────────────
  const capitalInicial       = entrada > 0 ? entrada : precoTotal;
  const fluxoLiquidoPagando  = lucroLiquido - (temParcelamento ? valorParcela : 0);
  const fluxoLiquidoQuitado  = lucroLiquido;

  const roiEntradaMensal = capitalInicial > 0 && lucroLiquido > 0 ? (fluxoLiquidoPagando / capitalInicial) * 100 : 0;
  const roiEntradaAnual  = roiEntradaMensal * 12;
  const roiTotalMensal   = totalInvestido > 0 && lucroLiquido > 0 ? (lucroLiquido / totalInvestido) * 100 : 0;

  const paybackEntradaMeses = capitalInicial > 0 && lucroLiquido > 0
    ? (() => {
        if (!temParcelamento) return Math.ceil(capitalInicial / lucroLiquido);
        let acc = 0;
        for (let m = 1; m <= 600; m++) {
          acc += m <= numParcelas ? fluxoLiquidoPagando : fluxoLiquidoQuitado;
          if (acc >= capitalInicial) return m;
        }
        return null;
      })() : null;

  const paybackTotalMeses = totalInvestido > 0 && lucroLiquido > 0
    ? (() => {
        if (!temParcelamento) return Math.ceil(totalInvestido / lucroLiquido);
        let acc = 0;
        for (let m = 1; m <= 600; m++) {
          acc += m <= numParcelas ? fluxoLiquidoPagando : fluxoLiquidoQuitado;
          if (acc >= totalInvestido) return m;
        }
        return null;
      })() : null;

  const ganho60Meses = temParcelamento
    ? Array.from({ length: 60 }, (_, i) => i < numParcelas ? fluxoLiquidoPagando : fluxoLiquidoQuitado).reduce((a, b) => a + b, 0)
    : lucroLiquido * 60;
  const multiplo5anos = capitalInicial > 0 ? (ganho60Meses / capitalInicial) : 0;

  const pronto = precoTotal > 0 && faturamento > 0 && lucroLiquido > 0;

  // ── Credenciais para assinatura ───────────────────────────────────────────
  const assinatura = [
    corretor.nome  ? `${corretor.nome}`              : "",
    corretor.creci ? `CRECI: ${corretor.creci}`      : "",
    corretor.telefone ? `WhatsApp: ${corretor.telefone}` : "",
    corretor.email ? corretor.email                  : "",
  ].filter(Boolean).join(" | ");

  // ── Gerar argumento IA ───────────────────────────────────────────────────
  const handleGerar = async () => {
    if (!pronto) return;
    setGenerating(true);
    setArgumento("");

    const dados = [
      nomeNegocio ? `Negócio: ${nomeNegocio}` : "",
      segmento    ? `Segmento: ${segmento}`    : "",
      descricao   ? `Descrição e diferenciais: ${descricao}` : "",
      `Preço total: ${fmt(precoTotal)}`,
      temParcelamento
        ? `Estrutura: Entrada ${fmt(capitalInicial)} + ${numParcelas}x de ${fmt(valorParcela)} = Total ${fmt(totalInvestido)}`
        : `Investimento: ${fmt(precoTotal)} (à vista)`,
      `Faturamento mensal: ${fmt(faturamento)}`,
      `Despesas mensais: ${fmt(despesas)} (${fmtPct((despesas / faturamento) * 100, 0)})`,
      `Lucro líquido mensal: ${fmt(lucroLiquido)}`,
      temParcelamento ? `Fluxo durante parcelas: ${fmt(fluxoLiquidoPagando)}/mês` : "",
      `ROI sobre capital inicial: ${fmtPct(roiEntradaMensal)}/mês (${fmtPct(roiEntradaAnual)}/ano)`,
      paybackEntradaMeses ? `Payback da entrada: ${paybackEntradaMeses} meses` : "",
      paybackTotalMeses   ? `Payback total: ${paybackTotalMeses} meses`        : "",
      `Ganho em 5 anos: ${fmt(ganho60Meses)} (${multiplo5anos.toFixed(1)}× o capital)`,
      `Vs Poupança: rende ${(roiEntradaMensal / 0.6).toFixed(1)}× mais`,
      `Vs CDB: rende ${(roiEntradaMensal / 0.88).toFixed(1)}× mais`,
    ].filter(Boolean).join("\n");

    try {
      const result = await callClaude(
        `Você é especialista em M&A e valuation de pequenos negócios no Brasil.
Com os dados abaixo, escreva um ARGUMENTO DE INVESTIMENTO convincente e profissional.

REGRAS:
- Tom profissional, direto e confiante
- Destaque ROI e payback
- Compare com poupança, CDB e Tesouro
- Mencione segurança do ativo real vs especulação
- Finalize com chamada para ação
- Máximo 300 palavras
- Sem markdown, asteriscos ou bullet points — texto corrido em parágrafos
- Português brasileiro
- NÃO inclua assinatura — ela será adicionada automaticamente

DADOS:
${dados}`
      );
      const corpo = result.trim();
      // Monta texto final com assinatura do corretor
      const textoFinal = assinatura
        ? `${corpo}\n\n—\nApresentado por: ${assinatura}`
        : corpo;
      setArgumento(textoFinal);
    } catch {
      setArgumento("Erro ao gerar argumento. Verifique sua conexão.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(argumento);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // ── Gerar PDF ────────────────────────────────────────────────────────────
  const handleGerarPdf = async () => {
    if (!pronto || !pdfRef.current) return;
    setGerandoPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF }   = await import("jspdf");

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData  = canvas.toDataURL("image/png");
      const pdf      = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW    = pdf.internal.pageSize.getWidth();
      const pageH    = pdf.internal.pageSize.getHeight();
      const imgW     = pageW - 20; // margens 10mm cada lado
      const imgH     = (canvas.height * imgW) / canvas.width;
      const marginX  = 10;
      let   posY     = 10;

      if (imgH <= pageH - 20) {
        pdf.addImage(imgData, "PNG", marginX, posY, imgW, imgH);
      } else {
        // quebra em múltiplas páginas
        let remaining = imgH;
        let srcY = 0;
        while (remaining > 0) {
          const sliceH = Math.min(pageH - 20, remaining);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width  = canvas.width;
          sliceCanvas.height = (sliceH / imgH) * canvas.height;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.drawImage(canvas, 0, srcY * (canvas.height / imgH), canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
          pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", marginX, posY, imgW, sliceH);
          remaining -= sliceH;
          srcY      += sliceH;
          if (remaining > 0) { pdf.addPage(); posY = 10; }
        }
      }

      const fileName = nomeNegocio
        ? `ROI_${nomeNegocio.replace(/\s+/g, "_")}.pdf`
        : "Relatorio_ROI.pdf";
      pdf.save(fileName);
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
    } finally {
      setGerandoPdf(false);
    }
  };

  // ── JSX ──────────────────────────────────────────────────────────────────
  return (
    <CorretorLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm">
              <Calculator className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Calculadora de ROI</h1>
              <p className="text-sm text-muted-foreground">Convença qualquer investidor com números reais</p>
            </div>
          </div>
          {pronto && (
            <button onClick={handleGerarPdf} disabled={gerandoPdf}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 shadow-sm">
              {gerandoPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {gerandoPdf ? "Gerando..." : "Baixar PDF"}
            </button>
          )}
        </div>

        {/* ── STEP 1: Dados do negócio ── */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/30">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">1</span>
            <h2 className="font-semibold text-foreground text-sm">Dados do Negócio</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nome do negócio (opcional)</label>
                <input value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)}
                  placeholder="Ex: Restaurante Italiano Centro"
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Segmento (opcional)</label>
                <input value={segmento} onChange={(e) => setSegmento(e.target.value)}
                  placeholder="Ex: Alimentação, Varejo, Serviços..."
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>

            {/* Descrição / diferenciais */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                Descrição e diferenciais do negócio
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Enriquece a IA</span>
              </label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
                placeholder="Ex: Restaurante consolidado há 12 anos no mesmo ponto, clientela fiel, localização privilegiada em avenida de alto fluxo. Potencial de expansão com delivery ainda não explorado. Equipe treinada, operação independente do dono..."
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
              />
              <p className="text-xs text-muted-foreground">Cole a descrição do site, anúncio ou descreva os pontos fortes — a IA usa tudo isso para criar um argumento muito mais persuasivo.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CampoMoeda label="Preço total do negócio *" value={precoTotalInput}
                onChange={setPrecoTotalInput} placeholder="450.000" />
              <CampoMoeda label="Faturamento mensal *" value={faturamentoInput}
                onChange={setFaturamentoInput} placeholder="80.000" />
            </div>

            {/* Despesas */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Despesas mensais</label>
                <button onClick={() => setUsarDespesaManual(!usarDespesaManual)}
                  className="text-xs text-primary font-medium hover:underline">
                  {usarDespesaManual ? "Usar % do faturamento" : "Valor manual"}
                </button>
              </div>
              {usarDespesaManual ? (
                <CampoMoeda label="" value={despesasInput} onChange={setDespesasInput} placeholder="40.000" />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">% do faturamento em despesas</span>
                    <span className="font-display text-xl font-bold text-foreground">{despesasPct}%</span>
                  </div>
                  <input type="range" min={20} max={85} step={5} value={despesasPct}
                    onChange={(e) => setDespesasPct(parseInt(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>20% eficiente</span><span>85% margem baixa</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[35, 45, 55, 65, 70].map((p) => (
                      <button key={p} onClick={() => setDespesasPct(p)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${despesasPct === p ? "bg-primary text-white" : "border border-border bg-card text-foreground hover:bg-muted"}`}>
                        {p}%
                      </button>
                    ))}
                  </div>
                </>
              )}
              {faturamento > 0 && (
                <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm
                  ${lucroLiquido > 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <span className="text-muted-foreground text-xs">Lucro líquido mensal</span>
                  <span className={`font-bold text-base ${lucroLiquido > 0 ? "text-green-700" : "text-red-600"}`}>
                    {fmt(lucroLiquido)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── STEP 2: Condições de pagamento ── */}
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/30">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">2</span>
            <h2 className="font-semibold text-foreground text-sm">Condições de Pagamento</h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CampoMoeda label="Entrada (parte inicial) *"
                value={entradaInput}
                onChange={(v) => setEntradaInput(v)}
                placeholder="150.000"
                hint={precoTotal > 0 ? `Preço total: ${fmt(precoTotal)}` : "Capital inicial do comprador"} />

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nº de parcelas</label>
                <input type="number" min={0} max={120}
                  value={numParcelas || ""}
                  onChange={(e) => setNumParcelas(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                <p className="text-xs text-muted-foreground">0 = pagamento à vista</p>
              </div>

              <CampoMoeda
                label="Valor da parcela"
                value={valorParcelaInput}
                onChange={(v) => { setValorParcelaInput(v); setParcelaManual(true); }}
                placeholder={parcelaAutoCalc > 0 ? parcelaAutoCalc.toLocaleString("pt-BR") : "10.000"}
                disabled={numParcelas === 0}
                autoCalc={!parcelaManual && parcelaAutoCalc > 0}
                onReset={() => setParcelaManual(false)}
              />
            </div>

            {/* Alerta: entrada >= preço total */}
            {numParcelas > 0 && entrada > 0 && precoTotal > 0 && entrada >= precoTotal && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700">
                  <strong>A entrada ({fmt(entrada)}) cobre o valor total.</strong> Para calcular as parcelas automaticamente, informe uma entrada <em>menor</em> que o preço total ({fmt(precoTotal)}).
                </div>
              </div>
            )}

            {/* Resumo do deal */}
            {precoTotal > 0 && (
              <div className="rounded-xl overflow-hidden border border-border">
                {numParcelas > 0 && entrada > 0 && restanteParcelar > 0 && (
                  <div className="px-4 py-2 text-xs font-medium flex items-center justify-between bg-amber-50 text-amber-700 border-b border-amber-100">
                    <span>Restante a parcelar: <strong>{fmt(restanteParcelar)}</strong></span>
                    {parcelaAutoCalc > 0 && <span>{numParcelas}× de <strong>{fmt(parcelaAutoCalc)}</strong></span>}
                  </div>
                )}
                <div className="grid grid-cols-3 divide-x divide-border text-center bg-muted/20">
                  <div className="px-3 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Entrada</p>
                    <p className="font-bold text-foreground text-sm">{entrada > 0 ? fmt(entrada) : "—"}</p>
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-xs text-muted-foreground mb-0.5">Parcelado</p>
                    <p className="font-bold text-foreground text-sm">{temParcelamento ? fmt(totalParcelado) : "—"}</p>
                    {temParcelamento && <p className="text-xs text-muted-foreground">{numParcelas}× {fmt(valorParcela)}</p>}
                  </div>
                  <div className="px-3 py-3 bg-primary/5">
                    <p className="text-xs text-muted-foreground mb-0.5">Total</p>
                    <p className="font-bold text-primary text-sm">{fmt(totalInvestido)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── STEP 3: Resultados + área do PDF ── */}
        {pronto && (
          <>
            {/* DIV capturada pelo html2canvas para o PDF */}
            <div ref={pdfRef} style={{ background: "#fff", padding: "32px", fontFamily: "system-ui, sans-serif" }}>

              {/* Cabeçalho do relatório */}
              <div style={{ borderBottom: "3px solid #1d4ed8", paddingBottom: 16, marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1d4ed8" }}>Relatório de ROI</div>
                    <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                      {nomeNegocio || "Análise de Investimento"}{segmento ? ` · ${segmento}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>Gerado em {hoje()}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", marginTop: 2 }}>NegócioJá</div>
                  </div>
                </div>
              </div>

              {/* Dados do negócio */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Dados do Negócio</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "Preço Total",        val: fmt(precoTotal) },
                    { label: "Faturamento Mensal",  val: fmt(faturamento) },
                    { label: "Despesas Mensais",    val: `${fmt(despesas)} (${fmtPct((despesas/faturamento)*100, 0)})` },
                    { label: "Lucro Líquido",       val: fmt(lucroLiquido) },
                    { label: "Capital Inicial",     val: fmt(capitalInicial) },
                    temParcelamento
                      ? { label: "Parcelamento", val: `${numParcelas}× ${fmt(valorParcela)}` }
                      : { label: "Forma de Pagamento", val: "À vista" },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b" }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indicadores ROI */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Indicadores de ROI</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                  {[
                    { label: "ROI Mensal (entrada)", val: fmtPct(roiEntradaMensal), bg: "#16a34a", color: "#fff" },
                    { label: "ROI Anual (entrada)",  val: fmtPct(roiEntradaAnual, 1), bg: "#dcfce7", color: "#166534" },
                    { label: "Payback Entrada",      val: paybackEntradaMeses ? `${paybackEntradaMeses} meses` : "—", bg: "#dbeafe", color: "#1e40af" },
                    { label: "Payback Total",        val: paybackTotalMeses   ? `${paybackTotalMeses} meses`   : "—", bg: "#ede9fe", color: "#4c1d95" },
                  ].map(({ label, val, bg, color }) => (
                    <div key={label} style={{ background: bg, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 10, color, opacity: 0.75, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color }}>{val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fluxo de caixa */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Fluxo de Caixa</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {temParcelamento && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "12px 16px" }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#92400e" }}>Durante as {numParcelas} parcelas</div>
                        <div style={{ fontSize: 11, color: "#b45309", marginTop: 2 }}>Lucro {fmt(lucroLiquido)} − parcela {fmt(valorParcela)}</div>
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: fluxoLiquidoPagando >= 0 ? "#92400e" : "#dc2626" }}>{fmt(fluxoLiquidoPagando)}/mês</div>
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "12px 16px" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>{temParcelamento ? "Após quitar — fluxo livre" : "Fluxo líquido mensal"}</div>
                      <div style={{ fontSize: 11, color: "#16a34a", marginTop: 2 }}>100% do lucro do negócio</div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#16a34a" }}>{fmt(fluxoLiquidoQuitado)}/mês</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "12px 16px" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#1d4ed8" }}>Ganho acumulado em 5 anos</div>
                      <div style={{ fontSize: 11, color: "#3b82f6", marginTop: 2 }}>{multiplo5anos.toFixed(1)}× o capital inicial</div>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#1d4ed8" }}>{fmt(ganho60Meses)}</div>
                  </div>
                </div>
              </div>

              {/* Comparativo */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Comparativo — Mercado Financeiro</div>
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: 16, border: "1px solid #e2e8f0" }}>
                  {[...BENCHMARKS, { nome: "Este Negócio", pct_mensal: roiEntradaMensal, cor: "#16a34a", emoji: "🏪" }].map(b => {
                    const max = Math.max(roiEntradaMensal, 3);
                    const w   = Math.min((b.pct_mensal / max) * 100, 100);
                    return (
                      <div key={b.nome} style={{ marginBottom: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                          <span style={{ color: "#64748b" }}>{b.emoji} {b.nome}</span>
                          <span style={{ fontWeight: 700, color: b.nome === "Este Negócio" ? "#16a34a" : "#374151" }}>{fmtPct(b.pct_mensal)}/mês</span>
                        </div>
                        <div style={{ background: "#e2e8f0", borderRadius: 4, height: 8, overflow: "hidden" }}>
                          <div style={{ width: `${w}%`, height: "100%", background: b.cor, borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Argumento IA */}
              {argumento && (
                <div style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Argumento de Investimento</div>
                  <div style={{ background: "#fafafa", border: "1px solid #e2e8f0", borderRadius: 10, padding: 16, fontSize: 12, lineHeight: 1.7, color: "#374151", whiteSpace: "pre-wrap" }}>
                    {argumento}
                  </div>
                </div>
              )}

              {/* Rodapé com credenciais do corretor */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>
                  Os valores são baseados nos dados informados. Valide com documentação real.
                </div>
                {assinatura && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8" }}>{corretor.nome}</div>
                    {corretor.creci    && <div style={{ fontSize: 10, color: "#64748b" }}>CRECI: {corretor.creci}</div>}
                    {corretor.telefone && <div style={{ fontSize: 10, color: "#64748b" }}>📱 {corretor.telefone}</div>}
                    {corretor.email    && <div style={{ fontSize: 10, color: "#64748b" }}>{corretor.email}</div>}
                  </div>
                )}
              </div>
            </div>

            {/* Resultados visíveis na tela (fora do pdfRef) */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold">3</span>
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" /> Resultados do ROI
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="ROI mensal (entrada)" value={fmtPct(roiEntradaMensal)} sub="ao mês"
                  color="bg-gradient-to-br from-green-500 to-emerald-600" textColor="text-white"
                  icon={<Percent className="h-5 w-5 text-white" />} />
                <Stat label="ROI anual (entrada)" value={fmtPct(roiEntradaAnual, 1)} sub="ao ano"
                  color="bg-green-50" textColor="text-green-800"
                  icon={<TrendingUp className="h-5 w-5 text-green-600" />} />
                <Stat label="Payback entrada" value={paybackEntradaMeses != null ? `${paybackEntradaMeses}m` : "—"} sub="recuperar entrada"
                  color="bg-blue-50" textColor="text-blue-800"
                  icon={<Clock className="h-5 w-5 text-blue-500" />} />
                <Stat label="Payback total" value={paybackTotalMeses != null ? `${paybackTotalMeses}m` : "—"} sub="recuperar tudo"
                  color="bg-violet-50" textColor="text-violet-800"
                  icon={<Clock className="h-5 w-5 text-violet-500" />} />
              </div>

              {/* Fluxo de caixa */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" /> Fluxo de Caixa Mensal
                </h3>
                {temParcelamento && (
                  <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-amber-700">Durante as {numParcelas} parcelas</p>
                      <p className="text-xs text-amber-600 mt-0.5">Lucro {fmt(lucroLiquido)} − parcela {fmt(valorParcela)}</p>
                    </div>
                    <p className={`font-display text-xl font-bold ${fluxoLiquidoPagando >= 0 ? "text-amber-700" : "text-red-600"}`}>
                      {fmt(fluxoLiquidoPagando)}/mês
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold text-green-700">{temParcelamento ? "Após quitar — fluxo livre" : "Fluxo líquido mensal"}</p>
                    <p className="text-xs text-green-600 mt-0.5">100% do lucro do negócio</p>
                  </div>
                  <p className="font-display text-xl font-bold text-green-700">{fmt(fluxoLiquidoQuitado)}/mês</p>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold text-primary">Ganho acumulado em 5 anos</p>
                    <p className="text-xs text-muted-foreground">{multiplo5anos.toFixed(1)}× o capital de {fmt(capitalInicial)}</p>
                  </div>
                  <p className="font-display text-xl font-bold text-primary">{fmt(ganho60Meses)}</p>
                </div>

                <button onClick={() => setShowDetalhes(!showDetalhes)}
                  className="flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-1">
                  {showDetalhes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showDetalhes ? "Ocultar detalhes" : "Ver detalhes do cálculo"}
                </button>
                {showDetalhes && (
                  <div className="rounded-xl bg-muted/30 p-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>Faturamento</span><span className="font-semibold text-foreground">{fmt(faturamento)}</span></div>
                    <div className="flex justify-between"><span>Despesas ({fmtPct((despesas/faturamento)*100, 0)})</span><span className="font-semibold text-foreground">− {fmt(despesas)}</span></div>
                    <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold">Lucro líquido</span><span className="font-bold text-green-600">{fmt(lucroLiquido)}</span></div>
                    {temParcelamento && <>
                      <div className="flex justify-between"><span>Parcela mensal</span><span className="font-semibold text-foreground">− {fmt(valorParcela)}</span></div>
                      <div className="flex justify-between border-t border-border pt-2"><span>Saldo no bolso (pagando)</span><span className={`font-bold ${fluxoLiquidoPagando >= 0 ? "text-amber-600" : "text-red-500"}`}>{fmt(fluxoLiquidoPagando)}</span></div>
                    </>}
                    <div className="flex justify-between mt-1"><span>ROI total investido</span><span className="font-bold">{fmtPct(roiTotalMensal)}/mês</span></div>
                    <div className="flex justify-between"><span>ROI capital inicial</span><span className="font-bold text-green-600">{fmtPct(roiEntradaMensal)}/mês</span></div>
                  </div>
                )}
              </div>

              {/* Comparativo */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Comparativo com o Mercado Financeiro
                </h3>
                <div className="space-y-3">
                  {BENCHMARKS.map((b) => (
                    <BenchmarkBar key={b.nome} nome={b.nome} pct={b.pct_mensal}
                      roiNegocio={roiEntradaMensal} cor={b.cor} emoji={b.emoji} />
                  ))}
                </div>
                {roiEntradaMensal > 0.6 && (
                  <div className="flex items-start gap-2 rounded-xl bg-green-50 border border-green-200 p-3">
                    <Info className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-green-700">
                      <strong>Este negócio rende {(roiEntradaMensal / 0.6).toFixed(1)}× mais que a Poupança</strong> e {(roiEntradaMensal / 0.88).toFixed(1)}× mais que o CDB — com o benefício de ser um ativo real e produtivo.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* ── IA: Argumento ── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                <h2 className="font-semibold text-foreground text-sm">Argumento de Investimento com IA</h2>
              </div>
              {corretor.nome && (
                <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <p className="text-xs text-primary">
                    O argumento será assinado com suas credenciais: <strong>{assinatura}</strong>
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Gere um texto profissional com todos os números — pronto para apresentar ao investidor
              </p>
              <button onClick={handleGerar} disabled={generating}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-primary px-4 py-3 text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                {generating
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando argumento...</>
                  : <><Sparkles className="h-4 w-4" /> Gerar Argumento de Investimento</>}
              </button>
              {argumento && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <textarea value={argumento} onChange={(e) => setArgumento(e.target.value)} rows={12}
                      className="w-full bg-transparent text-sm text-foreground leading-relaxed outline-none resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleCopy}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
                      {copied ? <><Check className="h-4 w-4" /> Copiado!</> : <><Copy className="h-4 w-4" /> Copiar texto</>}
                    </button>
                    <button onClick={handleGerar} disabled={generating}
                      className="flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/70 disabled:opacity-40">
                      <Sparkles className={`h-4 w-4 ${generating ? "animate-pulse" : ""}`} /> Regerar
                    </button>
                    <button onClick={handleGerarPdf} disabled={gerandoPdf}
                      className="flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/70 disabled:opacity-40">
                      {gerandoPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                      PDF
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Aviso */}
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>Importante:</strong> Os cálculos são baseados nos dados informados. Valide faturamento e despesas com documentação real antes de apresentar ao investidor.
              </p>
            </div>
          </>
        )}

        {!pronto && precoTotal > 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border-2 border-dashed border-border">
            <Calculator className="h-12 w-12 opacity-15 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Preencha o faturamento mensal</p>
            <p className="text-xs text-muted-foreground">para calcular o ROI automaticamente</p>
          </div>
        )}

      </div>
    </CorretorLayout>
  );
};

export default CalculadoraROI;
