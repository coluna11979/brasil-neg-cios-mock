import { useEffect, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Target, TrendingUp, DollarSign, Award, Zap, Star, Flame,
  Trophy, CheckCircle2, ChevronRight, Loader2, BarChart3,
  Calendar, ArrowRight,
} from "lucide-react";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { getAllCaptacoes, type Captacao } from "@/stores/captacaoStore";
import { getAllLeads, type Lead } from "@/stores/leadStore";
import { supabase } from "@/lib/supabase";

// ─── Funil rates (médias realistas do mercado) ────────────────────────────────
const TAXA_CONTATO  = 0.40;   // 40% das prospecções chegam a contato
const TAXA_VISITA   = 0.50;   // 50% dos contatos viram visita
const TAXA_CAPTADO  = 0.40;   // 40% das visitas são captadas
const TAXA_VENDA    = 0.28;   // 28% dos captados viram venda
const COMISSAO_PCT  = 0.02;   // 2% de comissão média
const VALOR_MEDIO   = 250000; // R$ 250k valor médio de negócio em SP

// ─── Conquistas ───────────────────────────────────────────────────────────────
interface Conquista {
  id: string;
  icon: string;
  titulo: string;
  desc: string;
  check: (data: { caps: Captacao[]; leads: Lead[]; comprometido: boolean }) => boolean;
  cor: string;
}

const CONQUISTAS: Conquista[] = [
  {
    id: "primeira-captacao",
    icon: "🎯",
    titulo: "Primeiro Passo",
    desc: "Criou a primeira captação",
    check: ({ caps }) => caps.length >= 1,
    cor: "from-blue-500 to-blue-600",
  },
  {
    id: "cinco-captacoes",
    icon: "🔥",
    titulo: "Em Chamas",
    desc: "5 ou mais captações",
    check: ({ caps }) => caps.length >= 5,
    cor: "from-orange-500 to-red-500",
  },
  {
    id: "dez-captacoes",
    icon: "⚡",
    titulo: "Máquina de Captação",
    desc: "10 ou mais captações",
    check: ({ caps }) => caps.length >= 10,
    cor: "from-yellow-400 to-orange-500",
  },
  {
    id: "captado",
    icon: "🏠",
    titulo: "Captador",
    desc: "Primeiro negócio captado",
    check: ({ caps }) => caps.some((c) => c.status === "captado"),
    cor: "from-green-500 to-emerald-600",
  },
  {
    id: "primeiro-fechamento",
    icon: "💰",
    titulo: "Primeiro Fechamento",
    desc: "Primeiro lead convertido",
    check: ({ leads }) => leads.some((l) => l.status === "convertido"),
    cor: "from-emerald-500 to-green-600",
  },
  {
    id: "comprometido",
    icon: "🤝",
    titulo: "Comprometido",
    desc: "Assumiu meta de 3 captações/30 dias",
    check: ({ comprometido }) => comprometido,
    cor: "from-violet-500 to-purple-600",
  },
  {
    id: "tres-fechamentos",
    icon: "🏆",
    titulo: "Campeão",
    desc: "3 ou mais leads convertidos",
    check: ({ leads }) => leads.filter((l) => l.status === "convertido").length >= 3,
    cor: "from-amber-400 to-yellow-500",
  },
  {
    id: "vinte-captacoes",
    icon: "🚀",
    titulo: "Lenda da Captação",
    desc: "20 ou mais captações",
    check: ({ caps }) => caps.length >= 20,
    cor: "from-pink-500 to-rose-600",
  },
];

// ─── Funil Visual ─────────────────────────────────────────────────────────────
interface FunilStage {
  label: string;
  valor: number;
  cor: string;
  pct: number;
}

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
              <div
                className={`h-full rounded-lg bg-gradient-to-r ${stage.cor} transition-all duration-500 flex items-center justify-end pr-3`}
                style={{ width: `${Math.max(stage.pct, 4)}%` }}
              >
                <span className="text-xs font-bold text-white drop-shadow">{stage.valor}</span>
              </div>
            </div>
          </div>
          {i < stages.length - 1 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 -mx-1" />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className={`rounded-2xl p-5 ${color}`}>
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

  const [captacoes, setCaptacoes] = useState<Captacao[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [comprometido, setComprometido] = useState(false);
  const [loading, setLoading] = useState(true);

  // Simulador
  const [captSim, setCaptSim] = useState(20);

  // Calculadora
  const [valorNegocio, setValorNegocio] = useState("");

  useEffect(() => {
    Promise.all([
      getAllCaptacoes(),
      getAllLeads(),
      supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user) return false;
        const { data: p } = await supabase
          .from("profiles")
          .select("comprometido")
          .eq("id", data.user.id)
          .single();
        return p?.comprometido ?? false;
      }),
    ]).then(([caps, ls, comp]) => {
      setCaptacoes(caps);
      setLeads(ls);
      setComprometido(comp as boolean);
      setLoading(false);
    });
  }, []);

  // ── Simulador calc ──
  const simContatos  = Math.round(captSim * TAXA_CONTATO);
  const simVisitas   = Math.round(simContatos * TAXA_VISITA);
  const simCaptados  = Math.round(simVisitas * TAXA_CAPTADO);
  const simVendas    = Math.max(Math.round(simCaptados * TAXA_VENDA), captSim >= 10 ? 1 : 0);
  const simComissao  = simVendas * VALOR_MEDIO * COMISSAO_PCT;

  const funilStages: FunilStage[] = [
    { label: "Prospecções",   valor: captSim,    pct: 100, cor: "from-violet-400 to-violet-500" },
    { label: "Contatos",      valor: simContatos,pct: TAXA_CONTATO * 100, cor: "from-blue-400 to-blue-500" },
    { label: "Visitas",       valor: simVisitas, pct: TAXA_CONTATO * TAXA_VISITA * 100, cor: "from-amber-400 to-amber-500" },
    { label: "Captados",      valor: simCaptados,pct: TAXA_CONTATO * TAXA_VISITA * TAXA_CAPTADO * 100, cor: "from-green-400 to-green-500" },
    { label: "Vendas",        valor: simVendas,  pct: TAXA_CONTATO * TAXA_VISITA * TAXA_CAPTADO * TAXA_VENDA * 100, cor: "from-emerald-500 to-emerald-600" },
  ];

  // ── Calculadora ──
  const valorNum = parseFloat(valorNegocio.replace(/\D/g, "")) || 0;
  const comissaoCalc = valorNum * COMISSAO_PCT;

  // ── Stats reais ──
  const captadosReais = captacoes.filter((c) => c.status === "captado").length;
  const convertidosReais = leads.filter((l) => l.status === "convertido").length;
  const comissaoAcumulada = convertidosReais * VALOR_MEDIO * COMISSAO_PCT;

  // ── Meta do mês ──
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const capsMes = captacoes.filter((c) => new Date(c.criado_em) >= inicioMes).length;
  const metaMes = 5; // meta padrão
  const metaPct = Math.min(Math.round((capsMes / metaMes) * 100), 100);
  const diasRestantes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  // ── Conquistas ──
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
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Meu Desempenho</h1>
          <p className="text-sm text-muted-foreground">Simule, calcule e acompanhe sua evolução</p>
        </div>

        {/* Stats reais */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            icon={<Target className="h-6 w-6" />}
            label="Captações"
            value={String(captacoes.length)}
            sub={`${captadosReais} captados`}
            color="bg-violet-50 text-violet-900"
          />
          <StatCard
            icon={<TrendingUp className="h-6 w-6" />}
            label="Fechamentos"
            value={String(convertidosReais)}
            sub="leads convertidos"
            color="bg-green-50 text-green-900"
          />
          <StatCard
            icon={<DollarSign className="h-6 w-6" />}
            label="Comissão Est."
            value={comissaoAcumulada > 0 ? `R$ ${(comissaoAcumulada / 1000).toFixed(0)}k` : "R$ —"}
            sub="estimativa acumulada"
            color="bg-amber-50 text-amber-900"
          />
        </div>

        {/* ── Simulador ── */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-5 w-5 text-violet-600" />
            <h2 className="font-display font-bold text-foreground">Simulador de Captação</h2>
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">Interativo</span>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Arraste o slider e veja o impacto no seu funil e na sua comissão</p>

          {/* Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Captações no mês</span>
              <span className="font-display text-2xl font-bold text-violet-600">{captSim}</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={captSim}
              onChange={(e) => setCaptSim(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-violet-600"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span><span>25</span><span>50</span><span>75</span><span>100</span>
            </div>
          </div>

          {/* Funil visual */}
          <FunilVisual stages={funilStages} />

          {/* Destaque comissão */}
          <div className="mt-5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-100 font-medium">Comissão estimada</p>
              <p className="font-display text-2xl font-bold text-white">
                {simComissao.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-emerald-100 mt-0.5">{simVendas} venda{simVendas !== 1 ? "s" : ""} × R$ 250k × 2%</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-white/20 font-display">💰</div>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground text-center">
            * Baseado nas taxas médias de conversão do mercado de SP. Resultados reais podem variar.
          </p>
        </div>

        {/* ── Meta do Mês + Calculadora ── */}
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Meta */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h2 className="font-display font-bold text-foreground">Meta do Mês</h2>
            </div>

            <div className="text-center mb-4">
              <span className="font-display text-4xl font-bold text-foreground">{capsMes}</span>
              <span className="text-lg text-muted-foreground">/{metaMes}</span>
              <p className="text-xs text-muted-foreground mt-1">captações em {now.toLocaleString("pt-BR", { month: "long" })}</p>
            </div>

            {/* Progress bar */}
            <div className="h-3 rounded-full bg-muted overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  metaPct >= 100 ? "bg-green-500" : metaPct >= 60 ? "bg-amber-400" : "bg-blue-500"
                }`}
                style={{ width: `${metaPct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{metaPct}% da meta</span>
              <span>{diasRestantes} dias restantes</span>
            </div>

            {metaPct >= 100 ? (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 font-semibold">
                <CheckCircle2 className="h-4 w-4" />Meta batida! 🎉
              </div>
            ) : (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <Target className="h-4 w-4 shrink-0" />
                Faltam <strong className="mx-1">{metaMes - capsMes}</strong> captações para bater a meta
              </div>
            )}
          </div>

          {/* Calculadora */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-green-600" />
              <h2 className="font-display font-bold text-foreground">Calculadora de Comissão</h2>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Valor estimado do negócio (R$)</label>
              <input
                type="number"
                placeholder="Ex: 250000"
                value={valorNegocio}
                onChange={(e) => setValorNegocio(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {valorNum > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Valor do negócio</span>
                  <span className="font-medium">{valorNum.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Taxa de comissão</span>
                  <span className="font-medium">2%</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3">
                  <span className="text-white text-sm font-semibold">Sua comissão</span>
                  <span className="font-display text-xl font-bold text-white">
                    {comissaoCalc.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                  </span>
                </div>
                <p className="text-xs text-center text-muted-foreground">Estimativa baseada em 2% sobre valor do negócio</p>
              </div>
            )}

            {valorNum === 0 && (
              <div className="mt-4 flex flex-col items-center justify-center h-24 rounded-xl bg-muted/30 text-muted-foreground">
                <DollarSign className="h-8 w-8 opacity-20 mb-1" />
                <p className="text-xs">Digite o valor para calcular</p>
              </div>
            )}
          </div>
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
          <p className="text-xs text-muted-foreground mb-4">Desbloqueie conquistas evoluindo na plataforma</p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CONQUISTAS.map((c) => {
              const unlocked = c.check(conquistasData);
              return (
                <div
                  key={c.id}
                  className={`relative rounded-xl border-2 p-3 text-center transition-all ${
                    unlocked
                      ? "border-transparent shadow-md"
                      : "border-border bg-muted/20 opacity-50 grayscale"
                  }`}
                >
                  {unlocked && (
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${c.cor} opacity-10`} />
                  )}
                  <div className="relative">
                    <span className="text-3xl">{c.icon}</span>
                    <p className={`mt-1.5 text-xs font-bold ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                      {c.titulo}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{c.desc}</p>
                    {unlocked && (
                      <div className="mt-2 flex items-center justify-center gap-1 text-xs text-green-600 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />Desbloqueada
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Dica final ── */}
        <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-violet-500/10 border border-primary/20 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Dica NegócioJá</p>
              <p className="text-sm text-muted-foreground mt-1">
                Corretores que fazem <strong className="text-foreground">contato em até 2h</strong> têm{" "}
                <strong className="text-foreground">3x mais chance</strong> de conversão. Responda seus leads rapidamente!
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
                Ver meus leads <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </CorretorLayout>
  );
};

export default CorretorDesempenho;
