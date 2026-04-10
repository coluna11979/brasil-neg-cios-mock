import { useState, useEffect, useRef } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { callClaude } from "@/lib/anthropic";
import { supabase } from "@/lib/supabase";
import { getEmpresaConfig, type EmpresaConfig } from "@/lib/empresaConfig";
import { getAllNegocios, type Negocio } from "@/stores/negocioStore";
import {
  FileText, ChevronRight, ChevronLeft, Loader2, Sparkles,
  FileDown, Building2, MapPin, DollarSign, TrendingUp, CheckCircle2,
  RefreshCw,
} from "lucide-react";

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

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ["Negócio", "Financeiro", "Intermediação", "Proposta"];
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const idx = i + 1;
        const done = idx < current;
        const active = idx === current;
        return (
          <div key={idx} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors
              ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {done ? <CheckCircle2 className="h-4 w-4" /> : idx}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${active ? "text-foreground" : "text-muted-foreground"}`}>
              {labels[i]}
            </span>
            {i < total - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground mx-1" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Campo Moeda ──────────────────────────────────────────────────────────────
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

// ─── PDF Section Header (inline styles) ──────────────────────────────────────
function PdfSectionHeader({ title }: { title: string }) {
  return (
    <div style={{ borderLeft: "4px solid #0f172a", paddingLeft: 12, marginBottom: 12, marginTop: 24 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</p>
    </div>
  );
}

function PdfCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 10, color: "#64748b", margin: "0 0 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: "#94a3b8", margin: "2px 0 0" }}>{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const Proposta = () => {
  usePageTitle("Gerador de Proposta | Área do Corretor");

  // ── Perfil + empresa ──
  const [corretor, setCorretor] = useState<{ nome: string; creci: string }>({ nome: "", creci: "" });
  const [empresa, setEmpresa] = useState<EmpresaConfig | null>(null);

  // ── Negócios ──
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loadingNegocios, setLoadingNegocios] = useState(true);
  const [negocioSelecionado, setNegocioSelecionado] = useState<Negocio | null>(null);

  // ── Steps ──
  const [step, setStep] = useState(1);

  // ── Step 1 — Dados do negócio ──
  const [negocioId, setNegocioId] = useState("");

  // ── Step 2 — Dados financeiros ──
  const [faturamentoInput, setFaturamentoInput] = useState("");
  const [despesasPct, setDespesasPct] = useState(50);
  const [usarDespesaManual, setUsarDespesaManual] = useState(false);
  const [despesasInput, setDespesasInput] = useState("");
  const [precoInput, setPrecoInput] = useState("");
  const [entradaInput, setEntradaInput] = useState("");
  const [numParcelas, setNumParcelas] = useState(0);
  const [valorParcelaInput, setValorParcelaInput] = useState("");
  const [parcelaManual, setParcelaManual] = useState(false);

  // ── Step 3 — Termos ──
  const [comissaoPct, setComissaoPct] = useState(5);
  const [prazoProtecao, setPrazoProtecao] = useState<90 | 180 | 365>(180);
  const [exclusividade, setExclusividade] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  // ── Step 4 — IA / PDF ──
  const [argumento, setArgumento] = useState("");
  const [generating, setGenerating] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("nome, creci")
        .eq("id", data.session.user.id)
        .single();
      if (profile) setCorretor({ nome: profile.nome || "", creci: profile.creci || "" });
    });
    getEmpresaConfig().then(setEmpresa);
    getAllNegocios().then((all) => {
      setNegocios(all.filter((n) => n.status === "ativo"));
      setLoadingNegocios(false);
    });
  }, []);

  // ── Auto-fill ao selecionar negócio ──
  const handleSelecionarNegocio = (id: string) => {
    setNegocioId(id);
    const neg = negocios.find((n) => n.id === id) || null;
    setNegocioSelecionado(neg);
    if (neg) {
      if (neg.faturamento_mensal) setFaturamentoInput(neg.faturamento_mensal.toLocaleString("pt-BR"));
      if (neg.preco) setPrecoInput(neg.preco.toLocaleString("pt-BR"));
    }
  };

  // ── Cálculos financeiros ──
  const faturamento = parseBrl(faturamentoInput);
  const despesasManuais = parseBrl(despesasInput);
  const despesas = usarDespesaManual ? despesasManuais : Math.round(faturamento * (despesasPct / 100));
  const lucroLiquido = faturamento - despesas;
  const preco = parseBrl(precoInput);
  const entrada = parseBrl(entradaInput);

  const restanteParcelar = preco > 0 && entrada > 0 ? Math.max(preco - entrada, 0) : 0;
  const parcelaAutoCalc = numParcelas > 0 && restanteParcelar > 0 ? Math.ceil(restanteParcelar / numParcelas) : 0;

  useEffect(() => {
    if (!parcelaManual && parcelaAutoCalc > 0) setValorParcelaInput(parcelaAutoCalc.toLocaleString("pt-BR"));
    if (!parcelaManual && parcelaAutoCalc === 0) setValorParcelaInput("");
  }, [parcelaAutoCalc, parcelaManual]);

  useEffect(() => { setParcelaManual(false); }, [precoInput, entradaInput, numParcelas]);

  const valorParcela = parseBrl(valorParcelaInput);
  const temParcelamento = numParcelas > 0 && valorParcela > 0;
  const totalParcelado = numParcelas * valorParcela;
  const totalInvestido = temParcelamento ? entrada + totalParcelado : (entrada || preco);

  // ── ROI ──
  const capitalInicial = entrada > 0 ? entrada : preco;
  const fluxoLiquidoPagando = lucroLiquido - (temParcelamento ? valorParcela : 0);
  const fluxoLiquidoQuitado = lucroLiquido;

  const roiEntradaMensal = capitalInicial > 0 && lucroLiquido > 0 ? (fluxoLiquidoPagando / capitalInicial) * 100 : 0;
  const roiEntradaAnual = roiEntradaMensal * 12;

  const paybackEntradaMeses = capitalInicial > 0 && lucroLiquido > 0
    ? (() => {
        if (!temParcelamento) return Math.ceil(capitalInicial / lucroLiquido);
        let acc = 0;
        for (let m = 1; m <= 600; m++) {
          acc += m <= numParcelas ? fluxoLiquidoPagando : fluxoLiquidoQuitado;
          if (acc >= capitalInicial) return m;
        }
        return null;
      })()
    : null;

  const paybackTotalMeses = totalInvestido > 0 && lucroLiquido > 0
    ? (() => {
        if (!temParcelamento) return Math.ceil(totalInvestido / lucroLiquido);
        let acc = 0;
        for (let m = 1; m <= 600; m++) {
          acc += m <= numParcelas ? fluxoLiquidoPagando : fluxoLiquidoQuitado;
          if (acc >= totalInvestido) return m;
        }
        return null;
      })()
    : null;

  // ── Comissão ──
  const valorComissao = preco > 0 ? preco * (comissaoPct / 100) : 0;

  const prontoParaIa = preco > 0 && faturamento > 0 && lucroLiquido > 0;

  // ── Gerar argumento IA ──
  const handleGerar = async () => {
    if (!prontoParaIa) return;
    setGenerating(true);
    setArgumento("");

    const dados = [
      negocioSelecionado?.titulo ? `Negócio: ${negocioSelecionado.titulo}` : "",
      negocioSelecionado?.categoria ? `Categoria: ${negocioSelecionado.categoria}` : "",
      negocioSelecionado?.cidade ? `Localização: ${negocioSelecionado.cidade} — ${negocioSelecionado.estado}` : "",
      negocioSelecionado?.descricao ? `Descrição: ${negocioSelecionado.descricao}` : "",
      `Preço pedido: ${fmt(preco)}`,
      temParcelamento
        ? `Estrutura: Entrada ${fmt(entrada)} + ${numParcelas}x de ${fmt(valorParcela)} = Total ${fmt(totalInvestido)}`
        : `Pagamento à vista: ${fmt(preco)}`,
      `Faturamento mensal: ${fmt(faturamento)}`,
      `Despesas mensais: ${fmt(despesas)} (${fmtPct((despesas / faturamento) * 100, 0)})`,
      `Lucro líquido mensal: ${fmt(lucroLiquido)}`,
      temParcelamento ? `Fluxo durante parcelas: ${fmt(fluxoLiquidoPagando)}/mês` : "",
      `ROI sobre capital inicial: ${fmtPct(roiEntradaMensal)}/mês (${fmtPct(roiEntradaAnual)}/ano)`,
      paybackEntradaMeses ? `Payback da entrada: ${paybackEntradaMeses} meses` : "",
      paybackTotalMeses ? `Payback total: ${paybackTotalMeses} meses` : "",
      corretor.nome ? `Corretor responsável: ${corretor.nome}` : "",
      corretor.creci ? `CRECI: ${corretor.creci}` : "",
    ].filter(Boolean).join("\n");

    try {
      const result = await callClaude(
        `Você é especialista em M&A de pequenos negócios no Brasil.
Escreva um ARGUMENTO DE INVESTIMENTO para uma proposta formal de aquisição.
Tom: profissional, confiante, persuasivo.
Sem markdown. Parágrafos corridos. Máx 250 palavras. Português brasileiro.
Finalize com chamada para ação convidando o investidor a agendar uma visita.
Não inclua assinatura.

DADOS:
${dados}`
      );
      setArgumento(result.trim());
    } catch {
      setArgumento("Erro ao gerar argumento. Verifique sua conexão e tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  // ── Gerar PDF ──
  const handleGerarPdf = async () => {
    if (!pdfRef.current) return;
    setGerandoPdf(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");

      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      const marginX = 10;
      let posY = 10;

      if (imgH <= pageH - 20) {
        pdf.addImage(imgData, "PNG", marginX, posY, imgW, imgH);
      } else {
        let remaining = imgH;
        let srcY = 0;
        while (remaining > 0) {
          const sliceH = Math.min(pageH - 20, remaining);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = (sliceH / imgH) * canvas.height;
          const ctx = sliceCanvas.getContext("2d")!;
          ctx.drawImage(canvas, 0, srcY * (canvas.height / imgH), canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height);
          pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", marginX, posY, imgW, sliceH);
          remaining -= sliceH;
          srcY += sliceH;
          if (remaining > 0) { pdf.addPage(); posY = 10; }
        }
      }

      const tituloArquivo = negocioSelecionado?.titulo || "Proposta";
      pdf.save(`Proposta_${tituloArquivo.replace(/\s+/g, "_")}.pdf`);
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
    } finally {
      setGerandoPdf(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <CorretorLayout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-sm">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Gerador de Proposta</h1>
              <p className="text-sm text-muted-foreground">Proposta de aquisição profissional em PDF</p>
            </div>
          </div>
          {step === 4 && (
            <button
              onClick={handleGerarPdf}
              disabled={gerandoPdf}
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 shadow-sm"
            >
              {gerandoPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {gerandoPdf ? "Gerando..." : "Baixar Proposta PDF"}
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="rounded-2xl border border-border bg-card px-5 py-4">
          <StepIndicator current={step} total={4} />
        </div>

        {/* ── STEP 1 — Selecionar Negócio ── */}
        {step === 1 && (
          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/30">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">1</span>
              <h2 className="font-semibold text-foreground text-sm">Selecionar Negócio</h2>
            </div>
            <div className="p-5 space-y-4">
              {loadingNegocios ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : negocios.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum negócio ativo encontrado.</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Negócio</label>
                    <select
                      value={negocioId}
                      onChange={(e) => handleSelecionarNegocio(e.target.value)}
                      className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Selecione um negócio...</option>
                      {negocios.map((n) => (
                        <option key={n.id} value={n.id}>{n.titulo} — {n.cidade}/{n.estado}</option>
                      ))}
                    </select>
                  </div>

                  {negocioSelecionado && (
                    <div className="rounded-xl border border-border overflow-hidden">
                      {negocioSelecionado.foto_url && (
                        <img
                          src={negocioSelecionado.foto_url}
                          alt={negocioSelecionado.titulo}
                          className="w-full h-40 object-cover"
                        />
                      )}
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-foreground text-base">{negocioSelecionado.titulo}</h3>
                          <span className="shrink-0 rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5">
                            {negocioSelecionado.categoria}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {negocioSelecionado.cidade}, {negocioSelecionado.estado}
                          {negocioSelecionado.area_m2 && (
                            <span className="ml-2 flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> {negocioSelecionado.area_m2} m²
                            </span>
                          )}
                        </div>
                        {negocioSelecionado.preco && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            <DollarSign className="h-3 w-3 text-green-600" />
                            {fmt(negocioSelecionado.preco)}
                          </div>
                        )}
                        {negocioSelecionado.descricao && (
                          <p className="text-xs text-muted-foreground line-clamp-3">{negocioSelecionado.descricao}</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex justify-end px-5 pb-5">
              <button
                onClick={() => setStep(2)}
                disabled={!negocioSelecionado}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* ── STEP 2 — Dados Financeiros ── */}
        {step === 2 && (
          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/30">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">2</span>
              <h2 className="font-semibold text-foreground text-sm">Dados Financeiros</h2>
            </div>
            <div className="p-5 space-y-5">

              {/* Faturamento */}
              <CampoMoeda
                label="Faturamento mensal"
                value={faturamentoInput}
                onChange={setFaturamentoInput}
                placeholder="Ex: 50.000"
              />

              {/* Despesas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Despesas</label>
                  <button
                    onClick={() => setUsarDespesaManual(!usarDespesaManual)}
                    className="text-xs text-primary hover:underline"
                  >
                    {usarDespesaManual ? "Usar slider" : "Inserir valor manual"}
                  </button>
                </div>
                {usarDespesaManual ? (
                  <CampoMoeda
                    label=""
                    value={despesasInput}
                    onChange={setDespesasInput}
                    placeholder="Despesas mensais totais"
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>20%</span>
                      <span className="font-semibold text-foreground">{despesasPct}%{faturamento > 0 ? ` — ${fmt(despesas)}` : ""}</span>
                      <span>85%</span>
                    </div>
                    <input
                      type="range" min={20} max={85} step={1}
                      value={despesasPct}
                      onChange={(e) => setDespesasPct(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <div className="flex gap-2 flex-wrap">
                      {[35, 45, 55, 65, 70].map((p) => (
                        <button
                          key={p}
                          onClick={() => setDespesasPct(p)}
                          className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors
                            ${despesasPct === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        >
                          {p}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Lucro líquido */}
              {faturamento > 0 && (
                <div className={`rounded-xl p-3 flex items-center justify-between ${lucroLiquido > 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                  <div className="flex items-center gap-2">
                    <TrendingUp className={`h-4 w-4 ${lucroLiquido > 0 ? "text-green-600" : "text-red-600"}`} />
                    <span className="text-xs font-medium text-foreground">Lucro líquido mensal</span>
                  </div>
                  <span className={`font-bold text-sm ${lucroLiquido > 0 ? "text-green-700" : "text-red-700"}`}>
                    {fmt(lucroLiquido)}
                  </span>
                </div>
              )}

              {/* Preço + Estrutura */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CampoMoeda label="Preço pedido" value={precoInput} onChange={setPrecoInput} placeholder="Ex: 300.000" />
                <CampoMoeda label="Entrada sugerida" value={entradaInput} onChange={setEntradaInput} placeholder="Ex: 100.000" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Nº de parcelas</label>
                  <input
                    type="number" min={0} max={120}
                    value={numParcelas || ""}
                    onChange={(e) => setNumParcelas(Number(e.target.value))}
                    placeholder="Ex: 12"
                    className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <CampoMoeda
                  label="Valor da parcela"
                  value={valorParcelaInput}
                  onChange={(v) => { setValorParcelaInput(v); setParcelaManual(true); }}
                  placeholder="Auto"
                  autoCalc={!parcelaManual && parcelaAutoCalc > 0}
                  onReset={() => { setParcelaManual(false); setValorParcelaInput(parcelaAutoCalc.toLocaleString("pt-BR")); }}
                />
              </div>
            </div>
            <div className="flex justify-between px-5 pb-5">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={preco === 0 || faturamento === 0}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* ── STEP 3 — Termos de Intermediação ── */}
        {step === 3 && (
          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/30">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">3</span>
              <h2 className="font-semibold text-foreground text-sm">Termos de Intermediação</h2>
            </div>
            <div className="p-5 space-y-5">

              {/* Comissão */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Comissão (%)</label>
                  <span className="text-xs font-bold text-foreground">
                    {fmtPct(comissaoPct, 0)} — {fmt(valorComissao)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>2%</span>
                  <span>10%</span>
                </div>
                <input
                  type="range" min={2} max={10} step={0.5}
                  value={comissaoPct}
                  onChange={(e) => setComissaoPct(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex gap-2 flex-wrap">
                  {[3, 4, 5, 6, 8].map((p) => (
                    <button
                      key={p}
                      onClick={() => setComissaoPct(p)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors
                        ${comissaoPct === p ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Prazo de proteção */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Prazo de proteção</label>
                <div className="flex gap-3 flex-wrap">
                  {([90, 180, 365] as const).map((dias) => (
                    <label key={dias} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="prazo"
                        value={dias}
                        checked={prazoProtecao === dias}
                        onChange={() => setPrazoProtecao(dias)}
                        className="accent-primary"
                      />
                      <span className="text-sm text-foreground">{dias} dias</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Exclusividade */}
              <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Exclusividade</p>
                  <p className="text-xs text-muted-foreground">Captação exclusiva deste negócio</p>
                </div>
                <button
                  onClick={() => setExclusividade(!exclusividade)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${exclusividade ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${exclusividade ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Observações adicionais (opcional)</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  placeholder="Condições especiais, negociações, etc."
                  className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-between px-5 pb-5">
              <button onClick={() => setStep(2)} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Gerar Proposta <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {/* ── STEP 4 — Gerar Proposta ── */}
        {step === 4 && (
          <section className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-muted/30">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">4</span>
              <h2 className="font-semibold text-foreground text-sm">Gerar Proposta</h2>
            </div>
            <div className="p-5 space-y-4">
              <button
                onClick={handleGerar}
                disabled={generating || !prontoParaIa}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Gerando argumento..." : "Gerar Argumento IA"}
              </button>

              {argumento && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Argumento de investimento</label>
                  <textarea
                    value={argumento}
                    onChange={(e) => setArgumento(e.target.value)}
                    rows={10}
                    className="w-full rounded-xl border border-border bg-muted px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none font-mono"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setStep(3)} className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                  <ChevronLeft className="h-4 w-4" /> Voltar
                </button>
                <button
                  onClick={handleGerarPdf}
                  disabled={gerandoPdf}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {gerandoPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  {gerandoPdf ? "Gerando..." : "Baixar Proposta PDF"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── PDF DIV (hidden) ─────────────────────────────────────────────────── */}
        <div
          ref={pdfRef}
          style={{
            position: "fixed",
            top: 9999,
            left: 9999,
            width: 794,
            fontFamily: "'Segoe UI', Arial, sans-serif",
            background: "#ffffff",
            color: "#0f172a",
          }}
        >
          {/* ── CAPA ── */}
          {/* Top bar */}
          <div style={{ background: "#0f172a", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px" }}>
            <p style={{ color: "#ffffff", fontWeight: 700, fontSize: 18, margin: 0, letterSpacing: "0.05em" }}>PROPOSTA DE AQUISIÇÃO</p>
            <span style={{ background: "#d4a017", color: "#0f172a", borderRadius: 4, padding: "2px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em" }}>CONFIDENCIAL</span>
          </div>

          {/* Hero image / gradient */}
          <div style={{
            height: 200,
            background: negocioSelecionado?.foto_url
              ? `linear-gradient(to bottom, rgba(15,23,42,0.3), rgba(15,23,42,0.7)), url(${negocioSelecionado.foto_url}) center/cover no-repeat`
              : "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "0 32px 24px",
          }}>
            <p style={{ color: "#ffffff", fontWeight: 700, fontSize: 24, margin: "0 0 8px" }}>
              {negocioSelecionado?.titulo || "—"}
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ background: "#3b82f6", color: "#fff", borderRadius: 4, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
                {negocioSelecionado?.categoria}
              </span>
              <span style={{ color: "#cbd5e1", fontSize: 12 }}>
                {negocioSelecionado?.cidade} — {negocioSelecionado?.estado}
              </span>
            </div>
          </div>

          {/* Meta */}
          <div style={{ padding: "16px 32px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Data de emissão</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{hoje()}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 11, color: "#64748b" }}>Preparado por</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                {corretor.nome || "Corretor"}{corretor.creci ? ` — CRECI: ${corretor.creci}` : ""}
              </p>
            </div>
          </div>

          {/* Empresa */}
          {empresa && (
            <div style={{ padding: "10px 32px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 11, color: "#64748b" }}>
              {empresa.nome && <span style={{ fontWeight: 600, color: "#0f172a", marginRight: 12 }}>{empresa.nome}</span>}
              {empresa.whatsapp && <span style={{ marginRight: 12 }}>WhatsApp: {empresa.whatsapp}</span>}
              {empresa.email && <span style={{ marginRight: 12 }}>{empresa.email}</span>}
              {empresa.site && <span>{empresa.site}</span>}
            </div>
          )}

          <div style={{ padding: "0 32px 24px" }}>

            {/* ── Sobre o Negócio ── */}
            <PdfSectionHeader title="Sobre o Negócio" />
            {(negocioSelecionado?.descricao) && (
              <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: "0 0 12px" }}>
                {negocioSelecionado.descricao}
              </p>
            )}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {negocioSelecionado?.categoria && (
                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 16px" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "#64748b", fontWeight: 600 }}>SEGMENTO</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{negocioSelecionado.categoria}</p>
                </div>
              )}
              {negocioSelecionado?.cidade && (
                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 16px" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "#64748b", fontWeight: 600 }}>LOCALIZAÇÃO</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{negocioSelecionado.cidade}, {negocioSelecionado.estado}</p>
                </div>
              )}
              {negocioSelecionado?.area_m2 && (
                <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, padding: "8px 16px" }}>
                  <p style={{ margin: 0, fontSize: 10, color: "#64748b", fontWeight: 600 }}>ÁREA</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{negocioSelecionado.area_m2} m²</p>
                </div>
              )}
            </div>

            {/* ── Dados Financeiros ── */}
            <PdfSectionHeader title="Dados Financeiros" />
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <PdfCard label="Faturamento Mensal" value={fmt(faturamento)} />
              <PdfCard label="Despesas Mensais" value={fmt(despesas)} sub={`${fmtPct((faturamento > 0 ? despesas / faturamento : 0) * 100, 0)} do faturamento`} />
              <PdfCard label="Lucro Líquido" value={fmt(lucroLiquido)} sub="mensal estimado" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <PdfCard label="Preço Pedido" value={fmt(preco)} />
              <PdfCard label="Entrada Sugerida" value={entrada > 0 ? fmt(entrada) : "À vista"} />
              <PdfCard
                label="Parcelamento"
                value={temParcelamento ? `${numParcelas}x ${fmt(valorParcela)}` : "—"}
                sub={temParcelamento ? `Total: ${fmt(totalInvestido)}` : undefined}
              />
            </div>

            {/* ── ROI do Investidor ── */}
            <PdfSectionHeader title="ROI do Investidor" />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "12px 16px", flex: 1 }}>
                <p style={{ margin: 0, fontSize: 10, color: "#16a34a", fontWeight: 600 }}>ROI MENSAL SOBRE ENTRADA</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#15803d" }}>{fmtPct(roiEntradaMensal)}</p>
              </div>
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "12px 16px", flex: 1 }}>
                <p style={{ margin: 0, fontSize: 10, color: "#16a34a", fontWeight: 600 }}>ROI ANUAL</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#15803d" }}>{fmtPct(roiEntradaAnual, 1)}</p>
              </div>
              <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 8, padding: "12px 16px", flex: 1 }}>
                <p style={{ margin: 0, fontSize: 10, color: "#2563eb", fontWeight: 600 }}>PAYBACK ENTRADA</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1d4ed8" }}>
                  {paybackEntradaMeses ? `${paybackEntradaMeses} meses` : "—"}
                </p>
              </div>
              <div style={{ background: "#eff6ff", border: "1px solid #93c5fd", borderRadius: 8, padding: "12px 16px", flex: 1 }}>
                <p style={{ margin: 0, fontSize: 10, color: "#2563eb", fontWeight: 600 }}>PAYBACK TOTAL</p>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#1d4ed8" }}>
                  {paybackTotalMeses ? `${paybackTotalMeses} meses` : "—"}
                </p>
              </div>
            </div>

            {/* ── Termos de Intermediação ── */}
            <PdfSectionHeader title="Termos de Intermediação" />
            <div style={{ border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", background: "#fafafa" }}>
              <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
                Corretor Responsável: {corretor.nome || "—"}{corretor.creci ? ` — CRECI: ${corretor.creci}` : ""}
              </p>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "#334155" }}>
                <strong>Comissão:</strong> {fmtPct(comissaoPct, 0)} sobre o valor total da transação = {fmt(valorComissao)}
              </p>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "#334155" }}>
                <strong>Prazo de Proteção:</strong> {prazoProtecao} dias — qualquer negociação entre as partes apresentadas neste documento, realizada dentro deste prazo, gera direito integral à comissão.
              </p>
              <p style={{ margin: "0 0 6px", fontSize: 13, color: "#334155" }}>
                <strong>Exclusividade:</strong> {exclusividade ? "Sim" : "Não"}
              </p>
              {observacoes && (
                <p style={{ margin: "0 0 6px", fontSize: 13, color: "#334155" }}>
                  <strong>Observações:</strong> {observacoes}
                </p>
              )}
              <p style={{ margin: "12px 0 0", fontSize: 10, color: "#94a3b8", fontStyle: "italic" }}>
                Intermediação regida pela Lei 6.530/78 e regulamentação COFECI.
              </p>
            </div>

            {/* ── Argumento de Investimento ── */}
            {argumento && (
              <>
                <PdfSectionHeader title="Argumento de Investimento" />
                <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>
                  {argumento}
                </p>
              </>
            )}

            {/* Footer */}
            <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: "#64748b" }}>
                {empresa?.nome || "Brasil Negócios"}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                {[empresa?.whatsapp, empresa?.email, empresa?.site].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        </div>

      </div>
    </CorretorLayout>
  );
};

export default Proposta;
