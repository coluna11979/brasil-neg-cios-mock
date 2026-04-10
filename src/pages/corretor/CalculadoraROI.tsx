import { useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { callClaude } from "@/lib/anthropic";
import {
  Calculator, TrendingUp, DollarSign, Clock, Sparkles,
  Copy, Check, Loader2, ChevronDown, ChevronUp, Info,
  BarChart3, Percent, AlertCircle,
} from "lucide-react";

// ─── Benchmarks de mercado ────────────────────────────────────────────────────
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
        {icon && <div className="opacity-60 mt-0.5">{icon}</div>}
      </div>
    </div>
  );
}

// ─── Barra de comparação ──────────────────────────────────────────────────────
function BenchmarkBar({ nome, pct, roiNegocio, cor, emoji }: {
  nome: string; pct: number; roiNegocio: number; cor: string; emoji: string;
}) {
  const max = Math.max(roiNegocio, 3);
  const width = Math.min((pct / max) * 100, 100);
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

// ─── Page ─────────────────────────────────────────────────────────────────────
const CalculadoraROI = () => {
  usePageTitle("Calculadora ROI | Área do Corretor");

  // ── Inputs ──
  const [precoTotalInput,    setPrecoTotalInput]    = useState("");
  const [entradaInput,       setEntradaInput]       = useState("");
  const [numParcelas,        setNumParcelas]        = useState(0);
  const [valorParcelaInput,  setValorParcelaInput]  = useState("");
  const [faturamentoInput,   setFaturamentoInput]   = useState("");
  const [despesasPct,        setDespesasPct]        = useState(50);
  const [despesasInput,      setDespesasInput]      = useState("");
  const [usarDespesaManual,  setUsarDespesaManual]  = useState(false);
  const [nomeNegocio,        setNomeNegocio]        = useState("");
  const [segmento,           setSegmento]           = useState("");

  // ── Copy/IA ──
  const [argumento,     setArgumento]    = useState("");
  const [generating,    setGenerating]   = useState(false);
  const [copied,        setCopied]       = useState(false);
  const [showDetalhes,  setShowDetalhes] = useState(false);

  // ── Parsed numbers ──
  const precoTotal   = parseBrl(precoTotalInput);
  const entrada      = parseBrl(entradaInput) || precoTotal;
  const valorParcela = parseBrl(valorParcelaInput);
  const faturamento  = parseBrl(faturamentoInput);
  const despesasManuais = parseBrl(despesasInput);
  const despesas     = usarDespesaManual ? despesasManuais : Math.round(faturamento * (despesasPct / 100));
  const lucroLiquido = faturamento - despesas;
  const totalParcelado = entrada + (numParcelas * valorParcela);
  const totalInvestido  = numParcelas > 0 ? totalParcelado : precoTotal;
  const temParcelamento = numParcelas > 0 && valorParcela > 0;

  // ── Cálculos ROI ──
  const fluxoLiquidoPagando  = lucroLiquido - (temParcelamento ? valorParcela : 0); // durante parcelas
  const fluxoLiquidoQuitado  = lucroLiquido; // após quitar

  // ROI sobre entrada (capital inicial)
  const roiEntradaMensal = entrada > 0 && lucroLiquido > 0 ? (fluxoLiquidoPagando / entrada) * 100 : 0;
  const roiEntradaAnual  = roiEntradaMensal * 12;

  // ROI sobre investimento total
  const roiTotalMensal = totalInvestido > 0 && lucroLiquido > 0 ? (lucroLiquido / totalInvestido) * 100 : 0;
  const roiTotalAnual  = roiTotalMensal * 12;

  // Payback
  const paybackEntradaMeses = entrada > 0 && fluxoLiquidoPagando > 0
    ? Math.ceil(entrada / fluxoLiquidoPagando)
    : null;
  const paybackTotalMeses = totalInvestido > 0 && lucroLiquido > 0
    ? (() => {
        if (!temParcelamento) return Math.ceil(totalInvestido / lucroLiquido);
        // Com parcelamento: acumula fluxo durante parcelas, depois fluxo pleno
        let acumulado = 0;
        for (let m = 1; m <= 600; m++) {
          acumulado += m <= numParcelas ? fluxoLiquidoPagando : fluxoLiquidoQuitado;
          if (acumulado >= totalInvestido) return m;
        }
        return null;
      })()
    : null;

  // Múltiplo do capital em 5 anos (60 meses)
  const ganho60Meses = temParcelamento
    ? Array.from({ length: 60 }, (_, i) => i < numParcelas ? fluxoLiquidoPagando : fluxoLiquidoQuitado).reduce((a, b) => a + b, 0)
    : lucroLiquido * 60;
  const multiplo5anos = entrada > 0 ? (ganho60Meses / entrada) : 0;

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
        ? `Entrada: ${fmt(entrada)} + ${numParcelas}x de ${fmt(valorParcela)} = Total ${fmt(totalInvestido)}`
        : `Investimento à vista: ${fmt(precoTotal)}`,
      `Faturamento mensal: ${fmt(faturamento)}`,
      `Despesas mensais: ${fmt(despesas)} (${fmtPct((despesas/faturamento)*100, 0)} do fat.)`,
      `Lucro líquido mensal: ${fmt(lucroLiquido)}`,
      temParcelamento ? `Fluxo líquido durante parcelas: ${fmt(fluxoLiquidoPagando)}/mês` : "",
      `ROI sobre capital inicial: ${fmtPct(roiEntradaMensal)}/mês (${fmtPct(roiEntradaAnual)}/ano)`,
      `ROI sobre investimento total: ${fmtPct(roiTotalMensal)}/mês (${fmtPct(roiTotalAnual)}/ano)`,
      paybackEntradaMeses ? `Payback da entrada: ${paybackEntradaMeses} meses` : "",
      paybackTotalMeses   ? `Payback total: ${paybackTotalMeses} meses` : "",
      `Ganho em 5 anos: ${fmt(ganho60Meses)} (${multiplo5anos.toFixed(1)}× o capital inicial)`,
      `Vs Poupança (0,6%/mês): o negócio rende ${fmtPct(roiEntradaMensal / 0.6, 1)}× mais`,
      `Vs CDB (0,88%/mês): o negócio rende ${fmtPct(roiEntradaMensal / 0.88, 1)}× mais`,
    ].filter(Boolean).join("\n");

    try {
      const result = await callClaude(
        `Você é um especialista em valuation e fusões & aquisições de pequenos negócios no Brasil.
Com base nos dados abaixo, elabore um ARGUMENTO DE INVESTIMENTO convincente e profissional para apresentar a um potencial comprador/investidor.

REGRAS:
- Tom: profissional, direto, confiante
- Destaque os principais pontos de retorno financeiro
- Compare com investimentos tradicionais (poupança, CDB, Tesouro)
- Mencione o payback e o ROI de forma clara
- Inclua um parágrafo sobre segurança do investimento em negócio físico vs especulativo
- Finalize com uma chamada para ação
- Máximo 300 palavras
- Não use markdown, asteriscos nem bullet points — texto corrido em parágrafos
- Escreva em português brasileiro

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
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Calculadora de ROI</h1>
            <p className="text-sm text-muted-foreground">Argumente com números — convença qualquer investidor</p>
          </div>
        </div>

        {/* ── Dados do negócio ── */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Dados do Negócio
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Nome do negócio (opcional)</label>
              <input value={nomeNegocio} onChange={(e) => setNomeNegocio(e.target.value)}
                placeholder="Ex: Restaurante Italiano Vila Madalena"
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            {/* Segmento */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Segmento (opcional)</label>
              <input value={segmento} onChange={(e) => setSegmento(e.target.value)}
                placeholder="Ex: Alimentação, Serviços, Varejo..."
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Preço total */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Preço total do negócio (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                <input value={precoTotalInput} onChange={(e) => setPrecoTotalInput(maskBrl(e.target.value))}
                  placeholder="450.000"
                  className="w-full rounded-xl border border-border bg-muted pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
            {/* Faturamento */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Faturamento mensal (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                <input value={faturamentoInput} onChange={(e) => setFaturamentoInput(maskBrl(e.target.value))}
                  placeholder="80.000"
                  className="w-full rounded-xl border border-border bg-muted pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
            </div>
          </div>

          {/* Despesas */}
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Despesas mensais</label>
              <button onClick={() => setUsarDespesaManual(!usarDespesaManual)}
                className="text-xs text-primary font-medium hover:underline">
                {usarDespesaManual ? "Usar % do faturamento" : "Inserir valor manual"}
              </button>
            </div>

            {usarDespesaManual ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                <input value={despesasInput} onChange={(e) => setDespesasInput(maskBrl(e.target.value))}
                  placeholder="40.000"
                  className="w-full rounded-xl border border-border bg-card pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
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
                  <span>20% (muito eficiente)</span><span>85% (margem baixa)</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[35, 45, 55, 65, 70].map((p) => (
                    <button key={p} onClick={() => setDespesasPct(p)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${despesasPct === p ? "bg-primary text-white" : "border border-border bg-muted text-foreground hover:bg-muted/70"}`}>
                      {p}%
                    </button>
                  ))}
                </div>
              </>
            )}

            {faturamento > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-card border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Lucro líquido mensal</span>
                <span className={`font-bold ${lucroLiquido > 0 ? "text-green-600" : "text-red-500"}`}>
                  {fmt(lucroLiquido)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Condições de Pagamento ── */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" /> Condições de Pagamento
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Entrada */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Entrada (R$) *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                <input value={entradaInput} onChange={(e) => setEntradaInput(maskBrl(e.target.value))}
                  placeholder={precoTotal > 0 ? precoTotal.toLocaleString("pt-BR") : "150.000"}
                  className="w-full rounded-xl border border-border bg-muted pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <p className="text-xs text-muted-foreground">Capital inicial do comprador</p>
            </div>

            {/* Parcelas */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Nº de parcelas</label>
              <input type="number" min={0} max={120} value={numParcelas || ""}
                onChange={(e) => setNumParcelas(parseInt(e.target.value) || 0)}
                placeholder="0 = à vista"
                className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
              <p className="text-xs text-muted-foreground">0 = pagamento à vista</p>
            </div>

            {/* Valor parcela */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Valor da parcela (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">R$</span>
                <input value={valorParcelaInput} onChange={(e) => setValorParcelaInput(maskBrl(e.target.value))}
                  placeholder="10.000"
                  disabled={numParcelas === 0}
                  className="w-full rounded-xl border border-border bg-muted pl-8 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-40" />
              </div>
            </div>
          </div>

          {/* Resumo do deal */}
          {precoTotal > 0 && (
            <div className="rounded-xl bg-muted/30 border border-border p-4 grid grid-cols-3 gap-3 text-center text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Entrada</p>
                <p className="font-bold text-foreground">{fmt(entrada)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Parcelado</p>
                <p className="font-bold text-foreground">{temParcelamento ? fmt(numParcelas * valorParcela) : "—"}</p>
                {temParcelamento && <p className="text-xs text-muted-foreground">{numParcelas}× {fmt(valorParcela)}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-bold text-primary">{fmt(totalInvestido)}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Resultados ROI ── */}
        {pronto && (
          <>
            <div className="space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" /> Resultados do ROI
              </h2>

              {/* Cards principais */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="ROI sobre entrada" value={fmtPct(roiEntradaMensal)} sub="ao mês"
                  color="bg-gradient-to-br from-green-500 to-emerald-600" textColor="text-white"
                  icon={<Percent className="h-5 w-5 text-white" />} />
                <Stat label="ROI anual (entrada)" value={fmtPct(roiEntradaAnual, 1)} sub="ao ano"
                  color="bg-green-50" textColor="text-green-800"
                  icon={<TrendingUp className="h-5 w-5 text-green-600" />} />
                <Stat label="Payback entrada" value={paybackEntradaMeses ? `${paybackEntradaMeses} meses` : "—"} sub="recuperar entrada"
                  color="bg-blue-50" textColor="text-blue-800"
                  icon={<Clock className="h-5 w-5 text-blue-500" />} />
                <Stat label="Payback total" value={paybackTotalMeses ? `${paybackTotalMeses} meses` : "—"} sub="recuperar tudo"
                  color="bg-violet-50" textColor="text-violet-800"
                  icon={<Clock className="h-5 w-5 text-violet-500" />} />
              </div>

              {/* Fluxo de caixa */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600" /> Fluxo de Caixa Mensal
                </h3>
                <div className="space-y-3">
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
                        {temParcelamento ? "Após quitar as parcelas" : "Fluxo líquido mensal"}
                      </p>
                      <p className="text-xs text-green-600 mt-0.5">Lucro livre, 100% do negócio</p>
                    </div>
                    <p className="font-display text-xl font-bold text-green-700">{fmt(fluxoLiquidoQuitado)}/mês</p>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold text-primary">Ganho em 5 anos</p>
                      <p className="text-xs text-muted-foreground">{multiplo5anos.toFixed(1)}× o capital inicial de {fmt(entrada)}</p>
                    </div>
                    <p className="font-display text-xl font-bold text-primary">{fmt(ganho60Meses)}</p>
                  </div>
                </div>

                {/* Detalhe expandível */}
                <button onClick={() => setShowDetalhes(!showDetalhes)}
                  className="flex items-center gap-1 text-xs text-primary font-medium hover:underline">
                  {showDetalhes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {showDetalhes ? "Ocultar detalhes" : "Ver detalhes do cálculo"}
                </button>
                {showDetalhes && (
                  <div className="rounded-xl bg-muted/30 p-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between"><span>Faturamento mensal</span><span className="font-semibold text-foreground">{fmt(faturamento)}</span></div>
                    <div className="flex justify-between"><span>Despesas mensais ({fmtPct((despesas/faturamento)*100, 0)})</span><span className="font-semibold text-foreground">− {fmt(despesas)}</span></div>
                    <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold">Lucro líquido</span><span className="font-bold text-green-600">{fmt(lucroLiquido)}</span></div>
                    {temParcelamento && <>
                      <div className="flex justify-between"><span>Parcela mensal</span><span className="font-semibold text-foreground">− {fmt(valorParcela)}</span></div>
                      <div className="flex justify-between border-t border-border pt-2"><span className="font-semibold">Saldo no bolso (pagando)</span><span className={`font-bold ${fluxoLiquidoPagando >= 0 ? "text-amber-600" : "text-red-500"}`}>{fmt(fluxoLiquidoPagando)}</span></div>
                    </>}
                    <div className="flex justify-between mt-1"><span>ROI sobre investimento total</span><span className="font-bold">{fmtPct(roiTotalMensal)}/mês</span></div>
                    <div className="flex justify-between"><span>ROI sobre entrada</span><span className="font-bold text-green-600">{fmtPct(roiEntradaMensal)}/mês</span></div>
                  </div>
                )}
              </div>

              {/* Comparativo com outras aplicações */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Comparativo com o Mercado Financeiro
                </h3>
                <p className="text-xs text-muted-foreground">ROI mensal do negócio vs aplicações tradicionais</p>
                <div className="space-y-3">
                  {BENCHMARKS.map((b, i) => (
                    <BenchmarkBar key={b.nome} nome={b.nome} pct={b.pct_mensal} roiNegocio={roiEntradaMensal} cor={b.cor} emoji={b.emoji}
                    />
                  ))}
                </div>
                {roiEntradaMensal > 0.6 && (
                  <div className="flex items-start gap-2 rounded-xl bg-green-50 border border-green-200 p-3">
                    <Info className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-green-700">
                      <strong>Este negócio rende {(roiEntradaMensal / 0.6).toFixed(1)}× mais que a Poupança</strong> e {(roiEntradaMensal / 0.88).toFixed(1)}× mais que o CDB, com o benefício adicional de ser um ativo real gerido pelo próprio comprador.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Argumento com IA ── */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-600" />
                <h2 className="font-semibold text-foreground text-sm">Argumento de Investimento com IA</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                Gere um texto profissional para apresentar ao investidor, com os números calculados acima
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
                <strong>Importante:</strong> Os cálculos são baseados nos dados informados. Certifique-se de validar o faturamento real e as despesas com documentos antes de apresentar ao investidor.
              </p>
            </div>
          </>
        )}

        {!pronto && precoTotal > 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center rounded-2xl border-2 border-dashed border-border">
            <Calculator className="h-12 w-12 opacity-15 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Preencha o faturamento mensal</p>
            <p className="text-xs text-muted-foreground">para ver os resultados do ROI</p>
          </div>
        )}

      </div>
    </CorretorLayout>
  );
};

export default CalculadoraROI;
