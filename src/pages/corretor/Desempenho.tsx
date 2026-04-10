import { useEffect, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Target, TrendingUp, DollarSign, Award, Zap, Star, Flame,
  Trophy, CheckCircle2, ChevronRight, Loader2, BarChart3,
  Calendar, ArrowRight, Settings2, SlidersHorizontal,
  TrendingDown, Percent, Calculator, ChevronDown, ChevronUp,
} from "lucide-react";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { getAllCaptacoes, type Captacao } from "@/stores/captacaoStore";
import { getAllLeads, type Lead } from "@/stores/leadStore";
import { supabase } from "@/lib/supabase";

// ─── Funil rates (médias realistas do mercado) ────────────────────────────────
const TAXA_CONTATO = 0.40;
const TAXA_VISITA  = 0.50;
const TAXA_CAPTADO = 0.40;
const TAXA_VENDA   = 0.28;

// ─── LocalStorage helpers ─────────────────────────────────────────────────────
const LS_COMISSAO    = "desempenho_comissao_pct";
const LS_VALOR_MEDIO = "desempenho_valor_medio";
const LS_META        = "desempenho_meta_mes";
const LS_SPLIT       = "desempenho_split_corretor";

function loadNum(key: string, fallback: number) {
  try { const v = localStorage.getItem(key); return v ? parseFloat(v) : fallback; } catch { return fallback; }
}
function saveNum(key: string, val: number) {
  try { localStorage.setItem(key, String(val)); } catch {}
}

// ─── Conquistas ───────────────────────────────────────────────────────────────
interface Conquista {
  id: string; icon: string; titulo: string; desc: string;
  check: (d: { caps: Captacao[]; leads: Lead[]; comprometido: boolean }) => boolean;
  cor: string;
}
const CONQUISTAS: Conquista[] = [
  { id: "primeira-captacao", icon: "🎯", titulo: "Primeiro Passo", desc: "Criou a primeira captação", check: ({ caps }) => caps.length >= 1, cor: "from-blue-500 to-blue-600" },
  { id: "cinco-captacoes",   icon: "🔥", titulo: "Em Chamas",       desc: "5 ou mais captações",      check: ({ caps }) => caps.length >= 5, cor: "from-orange-500 to-red-500" },
  { id: "dez-captacoes",     icon: "⚡", titulo: "Máquina",         desc: "10 ou mais captações",     check: ({ caps }) => caps.length >= 10, cor: "from-yellow-400 to-orange-500" },
  { id: "captado",           icon: "🏠", titulo: "Captador",        desc: "Primeiro negócio captado",  check: ({ caps }) => caps.some((c) => c.status === "captado"), cor: "from-green-500 to-emerald-600" },
  { id: "primeiro-fechamento", icon: "💰", titulo: "Fechamento",    desc: "Primeiro lead convertido",  check: ({ leads }) => leads.some((l) => l.status === "convertido"), cor: "from-emerald-500 to-green-600" },
  { id: "comprometido",      icon: "🤝", titulo: "Comprometido",    desc: "Assumiu meta de 3 captações/30 dias", check: ({ comprometido }) => comprometido, cor: "from-violet-500 to-purple-600" },
  { id: "tres-fechamentos",  icon: "🏆", titulo: "Campeão",         desc: "3 ou mais leads convertidos", check: ({ leads }) => leads.filter((l) => l.status === "convertido").length >= 3, cor: "from-amber-400 to-yellow-500" },
  { id: "vinte-captacoes",   icon: "🚀", titulo: "Lenda",           desc: "20 ou mais captações",     check: ({ caps }) => caps.length >= 20, cor: "from-pink-500 to-rose-600" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
function fmtK(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
}
function fmtValorInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  const num = parseInt(digits, 10);
  return num.toLocaleString("pt-BR");
}
function parseValorInput(v: string): number {
  return parseInt(v.replace(/\D/g, "") || "0", 10);
}

// ─── FunilVisual ──────────────────────────────────────────────────────────────
interface FunilStage { label: string; valor: number; cor: string; pct: number; }
function FunilVisual({ stages }: { stages: FunilStage[] }) {
  return (
    <div className="space-y-2 mt-4">
      {stages.map((stage, i) => (
        <div key={stage.label} className="flex items-center gap-3">
          <div className="w-28 shrink-0 text-right">
            <span className="text-xs text-muted-foreground">{stage.label}</span>
          </div>
          <div className="flex-1 relative">
            <div className="h-8 rounded-lg bg-muted overflow-hidden">
              <div className={`h-full rounded-lg bg-gradient-to-r ${stage.cor} transition-all duration-500 flex items-center justify-end pr-3`}
                style={{ width: `${Math.max(stage.pct, 4)}%` }}>
                <span className="text-xs font-bold text-white drop-shadow">{stage.valor}</span>
              </div>
            </div>
          </div>
          {i < stages.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 -mx-1" />}
        </div>
      ))}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl p-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-75">{label}</p>
          <p className="font-display text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
        </div>
        <div className="opacity-80">{icon}</div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const CorretorDesempenho = () => {
  usePageTitle("Meu Desempenho");

  const [captacoes, setCaptacoes]   = useState<Captacao[]>([]);
  const [leads, setLeads]           = useState<Lead[]>([]);
  const [comprometido, setComprometido] = useState(false);
  const [loading, setLoading]       = useState(true);

  // ── Configurações personalizáveis (salvas no localStorage) ──
  const [comissaoPct, setComissaoPct]   = useState(() => loadNum(LS_COMISSAO, 2));
  const [valorMedio,  setValorMedio]    = useState(() => loadNum(LS_VALOR_MEDIO, 250000));
  const [valorMedioInput, setValorMedioInput] = useState(() => loadNum(LS_VALOR_MEDIO, 250000).toLocaleString("pt-BR"));
  const [splitCorretor, setSplitCorretor] = useState(() => loadNum(LS_SPLIT, 100)); // % que fica com o corretor
  const [metaMes, setMetaMes]           = useState(() => loadNum(LS_META, 5));
  const [configOpen, setConfigOpen]     = useState(false);

  // ── Simulador ──
  const [captSim, setCaptSim] = useState(20);

  // ── Calculadora ──
  const [calcValorInput, setCalcValorInput]   = useState("");
  const [calcComissao, setCalcComissao]       = useState(() => loadNum(LS_COMISSAO, 2));
  const [calcSplit, setCalcSplit]             = useState(() => loadNum(LS_SPLIT, 100));

  useEffect(() => {
    Promise.all([
      getAllCaptacoes(),
      getAllLeads(),
      supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user) return false;
        const { data: p } = await supabase.from("profiles").select("comprometido").eq("id", data.user.id).single();
        return p?.comprometido ?? false;
      }),
    ]).then(([caps, ls, comp]) => {
      setCaptacoes(caps);
      setLeads(ls);
      setComprometido(comp as boolean);
      setLoading(false);
    });
  }, []);

  // ── Salva configs no localStorage ──
  const handleComissaoChange = (v: number) => { setComissaoPct(v); setCalcComissao(v); saveNum(LS_COMISSAO, v); };
  const handleValorMedioChange = (raw: string) => {
    setValorMedioInput(fmtValorInput(raw));
    const num = parseValorInput(raw);
    if (num > 0) { setValorMedio(num); saveNum(LS_VALOR_MEDIO, num); }
  };
  const handleSplitChange = (v: number) => { setSplitCorretor(v); setCalcSplit(v); saveNum(LS_SPLIT, v); };
  const handleMetaChange  = (v: number) => { setMetaMes(v); saveNum(LS_META, v); };

  // ── Stats reais ──
  const captadosReais     = captacoes.filter((c) => c.status === "captado").length;
  const convertidosReais  = leads.filter((l) => l.status === "convertido").length;
  const comissaoBruta     = convertidosReais * valorMedio * (comissaoPct / 100);
  const comissaoLiquida   = comissaoBruta * (splitCorretor / 100);
  const taxaConversaoReal = leads.length > 0 ? Math.round((convertidosReais / leads.length) * 100) : 0;

  // ── Meta do mês ──
  const now        = new Date();
  const inicioMes  = new Date(now.getFullYear(), now.getMonth(), 1);
  const capsMes    = captacoes.filter((c) => new Date(c.criado_em) >= inicioMes).length;
  const metaPct    = Math.min(Math.round((capsMes / Math.max(metaMes, 1)) * 100), 100);
  const diasRestantes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  // ── Projeção anual ──
  const mesAtual        = now.getMonth() + 1;
  const comissaoMensal  = comissaoLiquida / Math.max(mesAtual, 1);
  const projecaoAnual   = comissaoMensal * 12;

  // ── Simulador ──
  const simContatos = Math.round(captSim * TAXA_CONTATO);
  const simVisitas  = Math.round(simContatos * TAXA_VISITA);
  const simCaptados = Math.round(simVisitas * TAXA_CAPTADO);
  const simVendas   = Math.max(Math.round(simCaptados * TAXA_VENDA), captSim >= 10 ? 1 : 0);
  const simComissaoBruta = simVendas * valorMedio * (comissaoPct / 100);
  const simComissao      = simComissaoBruta * (splitCorretor / 100);

  const funilStages: FunilStage[] = [
    { label: "Prospecções", valor: captSim,    pct: 100, cor: "from-violet-400 to-violet-500" },
    { label: "Contatos",    valor: simContatos, pct: TAXA_CONTATO * 100, cor: "from-blue-400 to-blue-500" },
    { label: "Visitas",     valor: simVisitas,  pct: TAXA_CONTATO * TAXA_VISITA * 100, cor: "from-amber-400 to-amber-500" },
    { label: "Captados",    valor: simCaptados, pct: TAXA_CONTATO * TAXA_VISITA * TAXA_CAPTADO * 100, cor: "from-green-400 to-green-500" },
    { label: "Vendas",      valor: simVendas,   pct: TAXA_CONTATO * TAXA_VISITA * TAXA_CAPTADO * TAXA_VENDA * 100, cor: "from-emerald-500 to-emerald-600" },
  ];

  // ── Calculadora ──
  const calcValorNum    = parseValorInput(calcValorInput);
  const calcComissaoBruta = calcValorNum * (calcComissao / 100);
  const calcLiquido     = calcComissaoBruta * (calcSplit / 100);
  const calcAgencia     = calcComissaoBruta - calcLiquido;

  const conquistasData = { caps: captacoes, leads, comprometido };

  if (loading) {
    return (
      <CorretorLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </CorretorLayout>
    );
  }

  return (
    <CorretorLayout>
      <div className="space-y-6 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Meu Desempenho</h1>
            <p className="text-sm text-muted-foreground">Simule, calcule e acompanhe sua evolução</p>
          </div>
          <button
            onClick={() => setConfigOpen(!configOpen)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${configOpen ? "bg-primary/10 border-primary/30 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Configurar
            {configOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* ── Painel de Configurações ── */}
        {configOpen && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <p className="font-semibold text-foreground text-sm">Suas Configurações Pessoais</p>
              <span className="text-xs text-muted-foreground ml-auto">Salvo automaticamente</span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Comissão % */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Minha comissão</label>
                  <span className="font-display text-xl font-bold text-primary">{comissaoPct.toFixed(1)}%</span>
                </div>
                <input type="range" min={0.5} max={15} step={0.5} value={comissaoPct}
                  onChange={(e) => handleComissaoChange(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0,5%</span><span>5%</span><span>10%</span><span>15%</span>
                </div>
                <p className="text-xs text-muted-foreground">Percentual que você negocia com o cliente</p>
              </div>

              {/* Split com imobiliária */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Minha parte da comissão</label>
                  <span className="font-display text-xl font-bold text-green-600">{splitCorretor}%</span>
                </div>
                <input type="range" min={30} max={100} step={5} value={splitCorretor}
                  onChange={(e) => handleSplitChange(parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-green-600" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>30%</span><span>50%</span><span>70%</span><span>100%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {splitCorretor < 100
                    ? `Você fica com ${splitCorretor}%, ${100 - splitCorretor}% vai para a empresa`
                    : "Você fica com 100% da comissão"}
                </p>
              </div>

              {/* Valor médio */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Valor médio dos negócios (R$)</label>
                <input type="text" value={valorMedioInput}
                  onChange={(e) => handleValorMedioChange(e.target.value)}
                  className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="250.000" />
                <p className="text-xs text-muted-foreground">Usado nos cálculos e simulações</p>
              </div>

              {/* Meta mensal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Meta mensal de captações</label>
                  <span className="font-display text-xl font-bold text-amber-600">{metaMes}</span>
                </div>
                <input type="range" min={1} max={50} step={1} value={metaMes}
                  onChange={(e) => handleMetaChange(parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-amber-500" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1</span><span>12</span><span>25</span><span>50</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats reais ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<Target className="h-5 w-5" />}    label="Captações"    value={String(captacoes.length)} sub={`${captadosReais} captados`}          color="bg-violet-50 text-violet-900" />
          <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Leads"        value={String(leads.length)}     sub={`${taxaConversaoReal}% conversão`}       color="bg-blue-50 text-blue-900" />
          <StatCard icon={<Star className="h-5 w-5" />}       label="Fechamentos"  value={String(convertidosReais)} sub="leads convertidos"                       color="bg-green-50 text-green-900" />
          <StatCard icon={<DollarSign className="h-5 w-5" />} label="Ganhos Est."  value={comissaoLiquida > 0 ? fmtK(comissaoLiquida) : "R$ —"} sub={`${comissaoPct}% × ${splitCorretor}% seu`} color="bg-amber-50 text-amber-900" />
        </div>

        {/* ── Meta do mês + Projeção ── */}
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Meta */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h2 className="font-display font-bold text-foreground">Meta do Mês</h2>
              <span className="ml-auto text-xs text-muted-foreground">{now.toLocaleString("pt-BR", { month: "long" })}</span>
            </div>
            <div className="text-center mb-4">
              <span className="font-display text-4xl font-bold text-foreground">{capsMes}</span>
              <span className="text-lg text-muted-foreground">/{metaMes}</span>
              <p className="text-xs text-muted-foreground mt-1">captações realizadas</p>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden mb-2">
              <div className={`h-full rounded-full transition-all duration-700 ${metaPct >= 100 ? "bg-green-500" : metaPct >= 60 ? "bg-amber-400" : "bg-blue-500"}`}
                style={{ width: `${metaPct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
              <span>{metaPct}% da meta</span>
              <span>{diasRestantes} dias restantes</span>
            </div>
            {metaPct >= 100 ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 font-semibold">
                <CheckCircle2 className="h-4 w-4" />Meta batida! 🎉
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <Target className="h-4 w-4 shrink-0" />
                Faltam <strong className="mx-1">{metaMes - capsMes}</strong> captações para bater a meta
              </div>
            )}
          </div>

          {/* Projeção anual */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <h2 className="font-display font-bold text-foreground">Projeção Anual</h2>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 p-4 text-center">
                <p className="text-xs text-emerald-100 font-medium">Ganho projetado em 2025</p>
                <p className="font-display text-3xl font-bold text-white mt-1">
                  {projecaoAnual > 0 ? fmtK(projecaoAnual) : "—"}
                </p>
                <p className="text-xs text-emerald-100 mt-1">
                  {comissaoMensal > 0 ? `~${fmtK(comissaoMensal)}/mês` : "Feche seu primeiro negócio!"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <p className="text-muted-foreground">Comissão bruta</p>
                  <p className="font-semibold text-foreground">{comissaoBruta > 0 ? fmtK(comissaoBruta) : "—"}</p>
                </div>
                <div className="rounded-lg bg-muted/50 px-3 py-2">
                  <p className="text-muted-foreground">Seu percentual</p>
                  <p className="font-semibold text-foreground">{splitCorretor}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Calculadora Premium ── */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="h-5 w-5 text-green-600" />
            <h2 className="font-display font-bold text-foreground">Calculadora de Comissão</h2>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">Com split</span>
          </div>
          <p className="text-xs text-muted-foreground mb-5">Calcule quanto você vai receber em cada negócio</p>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-4">
              {/* Valor do negócio */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Valor do negócio (R$)</label>
                <input type="text" placeholder="Ex: 450.000"
                  value={calcValorInput}
                  onChange={(e) => setCalcValorInput(fmtValorInput(e.target.value))}
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              </div>

              {/* Atalhos de valor */}
              <div className="flex flex-wrap gap-1.5">
                {[100000, 250000, 500000, 1000000].map((v) => (
                  <button key={v} onClick={() => setCalcValorInput(v.toLocaleString("pt-BR"))}
                    className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/70 transition-colors">
                    {fmtK(v)}
                  </button>
                ))}
              </div>

              {/* % Comissão */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">% da comissão</label>
                  <div className="flex items-center gap-1">
                    <span className="font-display text-xl font-bold text-primary">{calcComissao.toFixed(1)}</span>
                    <span className="text-primary font-bold">%</span>
                  </div>
                </div>
                <input type="range" min={0.5} max={15} step={0.5} value={calcComissao}
                  onChange={(e) => setCalcComissao(parseFloat(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary" />
                <div className="flex flex-wrap gap-1.5">
                  {[2, 3, 4, 5, 6, 8, 10].map((p) => (
                    <button key={p} onClick={() => setCalcComissao(p)}
                      className={`rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${calcComissao === p ? "bg-primary text-white" : "border border-border bg-muted text-foreground hover:bg-muted/70"}`}>
                      {p}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Split */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Minha parte</label>
                  <span className="font-display text-xl font-bold text-green-600">{calcSplit}%</span>
                </div>
                <input type="range" min={30} max={100} step={5} value={calcSplit}
                  onChange={(e) => setCalcSplit(parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer accent-green-600" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>30%</span><span>50%</span><span>70%</span><span>100%</span>
                </div>
              </div>
            </div>

            {/* Resultado */}
            <div className="flex flex-col justify-center gap-3">
              {calcValorNum > 0 ? (
                <>
                  <div className="rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-5 text-center">
                    <p className="text-sm text-emerald-100 font-medium">Você recebe</p>
                    <p className="font-display text-4xl font-bold text-white mt-1">{fmt(calcLiquido)}</p>
                    {calcSplit < 100 && (
                      <p className="text-xs text-emerald-100 mt-1">{calcSplit}% de {fmt(calcComissaoBruta)}</p>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-muted-foreground">Valor do negócio</span>
                      <span className="font-semibold">{fmt(calcValorNum)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                      <span className="text-muted-foreground">Comissão total ({calcComissao.toFixed(1)}%)</span>
                      <span className="font-semibold">{fmt(calcComissaoBruta)}</span>
                    </div>
                    {calcSplit < 100 && (
                      <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
                        <span className="text-red-600">Parte da empresa ({100 - calcSplit}%)</span>
                        <span className="font-semibold text-red-600">- {fmt(calcAgencia)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                      <span className="text-green-700 font-semibold">Seu ganho líquido</span>
                      <span className="font-display font-bold text-green-700">{fmt(calcLiquido)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full rounded-2xl bg-muted/30 p-8 text-center">
                  <Calculator className="h-12 w-12 opacity-15 mb-3" />
                  <p className="text-sm text-muted-foreground">Digite o valor do negócio para ver o resultado</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Simulador de Funil ── */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-5 w-5 text-violet-600" />
            <h2 className="font-display font-bold text-foreground">Simulador de Captação</h2>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">Interativo</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Simule com suas taxas reais — valor médio: {fmtK(valorMedio)} · comissão: {comissaoPct}% · sua parte: {splitCorretor}%
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Captações no mês</span>
              <span className="font-display text-2xl font-bold text-violet-600">{captSim}</span>
            </div>
            <input type="range" min={1} max={100} value={captSim}
              onChange={(e) => setCaptSim(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-violet-600" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>

          <FunilVisual stages={funilStages} />

          <div className="mt-5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-100 font-medium">Seu ganho estimado</p>
              <p className="font-display text-2xl font-bold text-white">
                {fmt(simComissao)}
              </p>
              <p className="text-xs text-emerald-100 mt-0.5">
                {simVendas} venda{simVendas !== 1 ? "s" : ""} × {fmtK(valorMedio)} × {comissaoPct}% × {splitCorretor}%
              </p>
            </div>
            <div className="text-right opacity-30 font-display text-5xl font-bold text-white">💰</div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            * Baseado nas taxas médias de conversão do mercado. Resultados reais variam.
          </p>
        </div>

        {/* ── Conquistas ── */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="font-display font-bold text-foreground">Conquistas</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              {CONQUISTAS.filter((c) => c.check(conquistasData)).length}/{CONQUISTAS.length} desbloqueadas
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Evolua na plataforma e desbloqueie todas as conquistas</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CONQUISTAS.map((c) => {
              const unlocked = c.check(conquistasData);
              return (
                <div key={c.id} className={`relative rounded-xl border-2 p-3 text-center transition-all ${unlocked ? "border-transparent shadow-md" : "border-border bg-muted/20 opacity-50 grayscale"}`}>
                  {unlocked && <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${c.cor} opacity-10`} />}
                  <div className="relative">
                    <span className="text-3xl">{c.icon}</span>
                    <p className={`mt-1.5 text-xs font-bold ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>{c.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{c.desc}</p>
                    {unlocked && <div className="mt-2 flex items-center justify-center gap-1 text-xs text-green-600 font-semibold"><CheckCircle2 className="h-3 w-3" />Desbloqueada</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Dica ── */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Dica NegociaAky</p>
              <p className="text-sm text-muted-foreground mt-1">
                Corretores que fazem <strong className="text-foreground">contato em até 2h</strong> têm{" "}
                <strong className="text-foreground">3x mais chance</strong> de conversão. Responda seus leads rapidamente!
              </p>
            </div>
          </div>
        </div>

      </div>
    </CorretorLayout>
  );
};

export default CorretorDesempenho;
