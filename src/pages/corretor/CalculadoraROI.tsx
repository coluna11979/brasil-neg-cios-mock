import { useState, useEffect } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { callClaude } from "@/lib/anthropic";
import {
  Calculator, TrendingUp, DollarSign, Clock, Sparkles,
  Copy, Check, Loader2, ChevronDown, ChevronUp, Info,
  BarChart3, Percent, AlertCircle, RefreshCw,
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
  const max = Math.max(roiNegocio, 3);
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

  // ── IA ──
  const [argumento,    setArgumento]    = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [copied,       setCopied]       = useState(false);
  const [showDetalhes, setShowDetalhes] = useState(false);

  // ── Valores parsed ──
  const precoTotal   = parseBrl(precoTotalInput);
  const entrada      = parseBrl(entradaInput);
  const faturamento  = parseBrl(faturamentoInput);
  const despesasManuais = parseBrl(despesasInput);
  const despesas     = usarDespesaManual ? despesasManuais : Math.round(faturamento * (despesasPct / 100));
  const lucroLiquido = faturamento - despesas;

  // ── Auto-calcula valor da parcela ──────────────────────────────────────────
  const restanteParcelar = precoTotal > 0 && entrada > 0 ? Math.max(precoTotal - entrada, 0) : 0;
  const parcelaAutoCalc  = numParcelas > 0 && restanteParcelar > 0
    ? Math.ceil(restanteParcelar / numParcelas) : 0;

  // Quando não é manual, sincroniza o campo com o auto-cálculo
  useEffect(() => {
    if (!parcelaManual && parcelaAutoCalc > 0) {
      setValorParcelaInput(parcelaAutoCalc.toLocaleString("pt-BR"));
    }
    if (!parcelaManual && parcelaAutoCalc === 0) {
      setValorParcelaInput("");
    }
  }, [parcelaAutoCalc, parcelaManual]);

  // Quando entra e parcelas mudam, reseta override manual
  useEffect(() => {
    setParcelaManual(false);
  }, [precoTotalInput, entradaInput, numParcelas]);

  const valorParcela   = parseBrl(valorParcelaInput);
  const totalParcelado = numParcelas * valorParcela;
  const totalInvestido = numParcelas > 0 && valorParcela > 0 ? (entrada + totalParcelado) : (entrada || precoTotal);
  const temParcelamento = numParcelas > 0 && valorParcela > 0;

  // ── ROI ──
  const capitalInicial = entrada > 0 ? entrada : precoTotal;
  const fluxoLiquidoPagando = lucroLiquido - (temParcelamento ? valorParcela : 0);
  const fluxoLiquidoQuitado = lucroLiquido;

  const roiEntradaMensal = capitalInicial > 0 && lucroLiquido > 0 ? (fluxoLiquidoPagando / capitalInicial) * 100 : 0;
  const roiEntradaAnual  = roiEntradaMensal * 12;
  const roiTotalMensal   = totalInvestido > 0 && lucroLiquido > 0 ? (lucroLiquido / totalInvestido) * 100 : 0;

  const paybackEntradaMeses = capitalInicial > 0 && fluxoLiquidoPagando > 0
    ? Math.ceil(capitalInicial / fluxoLiquidoPagando) : null;

  const paybackTotalMeses = totalInvestido > 0 && lucroLiquido > 0
    ? (() => {
        if (!temParcelamento) return Math.ceil(totalInvestido / lucroLiquido);
        let acumulado = 0;
        for (let m = 1; m <= 600; m++) {
          acumulado += m <= numParcelas ? fluxoLiquidoPagando : fluxoLiquidoQuitado;
          if (acumulado >= totalInvestido) return m;
        }
        return null;
      })()
    : null;

  const ganho60Meses = temParcelamento
    ? Array.from({ length: 60 }, (_, i) => i < numParcelas ? fluxoLiquidoPagando : fluxoLiquidoQuitado).reduce((a, b) => a + b, 0)
    : lucroLiquido * 60;
  const multiplo5anos = capitalInicial > 0 ? (ganho60Meses / capitalInicial) : 0;

  const pronto = precoTotal > 0 && faturamento > 0 && lucroLiquido > 0;

  // ── Gerar argumento ──
  const handleGerar = async () => {
    if (!pronto) return;
    setGenerating(true);
    setArgumento("");
    const dados = [
      nomeNegocio ? `Negócio: ${nomeNegocio}` : "",
      segmento    ? `Segmento: ${segmento}` : "",
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
      paybackTotalMeses   ? `Payback total: ${paybackTotalMeses} meses` : "",
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

DADOS:
${dados}`
      );
      setArgumento(result.trim());
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

  return (
    <CorretorLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-sm">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Calculadora de ROI</h1>
            <p className="text-sm text-muted-foreground">Convença qualquer investidor com números reais</p>
          </div>
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
              {/* Entrada */}
              <CampoMoeda label="Entrada *"
                value={entradaInput}
                onChange={(v) => setEntradaInput(v)}
                placeholder={precoTotal > 0 ? precoTotal.toLocaleString("pt-BR") : "150.000"}
                hint="Capital inicial do comprador" />

              {/* Nº parcelas */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nº de parcelas</label>
                <input
                  type="number" min={0} max={120}
                  value={numParcelas || ""}
                  onChange={(e) => setNumParcelas(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                <p className="text-xs text-muted-foreground">0 = pagamento à vista</p>
              </div>

              {/* Valor parcela — auto-calculado */}
              <CampoMoeda
                label="Valor da parcela"
                value={valorParcelaInput}
                onChange={(v) => { setValorParcelaInput(v); setParcelaManual(true); }}
                placeholder={parcelaAutoCalc > 0 ? parcelaAutoCalc.toLocaleString("pt-BR") : "—"}
                disabled={numParcelas === 0}
                autoCalc={!parcelaManual && parcelaAutoCalc > 0}
                onReset={() => { setParcelaManual(false); }}
              />
            </div>

            {/* Resumo do deal — sempre visível quando preço preenchido */}
            {precoTotal > 0 && (
              <div className="rounded-xl overflow-hidden border border-border">
                {/* linha de status do parcelamento */}
                {numParcelas > 0 && entrada > 0 && (
                  <div className={`px-4 py-2 text-xs font-medium flex items-center justify-between
                    ${restanteParcelar > 0 ? "bg-amber-50 text-amber-700 border-b border-amber-100" : "bg-green-50 text-green-700 border-b border-green-100"}`}>
                    <span>Restante a parcelar: <strong>{fmt(restanteParcelar)}</strong></span>
                    {parcelaAutoCalc > 0 && <span>{numParcelas}× de <strong>{fmt(parcelaAutoCalc)}</strong></span>}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-0 divide-x divide-border text-center bg-muted/20">
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

        {/* ── STEP 3: Resultados ── */}
        {pronto && (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white text-xs font-bold">3</span>
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" /> Resultados do ROI
                </h2>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="ROI mensal (entrada)" value={fmtPct(roiEntradaMensal)} sub="ao mês"
                  color="bg-gradient-to-br from-green-500 to-emerald-600" textColor="text-white"
                  icon={<Percent className="h-5 w-5 text-white" />} />
                <Stat label="ROI anual (entrada)" value={fmtPct(roiEntradaAnual, 1)} sub="ao ano"
                  color="bg-green-50" textColor="text-green-800"
                  icon={<TrendingUp className="h-5 w-5 text-green-600" />} />
                <Stat label="Payback entrada" value={paybackEntradaMeses ? `${paybackEntradaMeses}m` : "—"} sub="recuperar entrada"
                  color="bg-blue-50" textColor="text-blue-800"
                  icon={<Clock className="h-5 w-5 text-blue-500" />} />
                <Stat label="Payback total" value={paybackTotalMeses ? `${paybackTotalMeses}m` : "—"} sub="recuperar tudo"
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
                    <p className="text-xs font-semibold text-green-700">
                      {temParcelamento ? "Após quitar — fluxo livre" : "Fluxo líquido mensal"}
                    </p>
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

                {/* Expandir detalhes */}
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
              <p className="text-xs text-muted-foreground">
                Gere um texto profissional com todos os números calculados — pronto para apresentar ao investidor
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
                    <textarea value={argumento} onChange={(e) => setArgumento(e.target.value)} rows={10}
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

        {/* Placeholder quando só preço preenchido */}
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
