import { useEffect, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import {
  UserCheck, UserX, Loader2, Phone, Mail, Clock, CheckCircle,
  MessageCircle, TrendingUp, Trophy, Star, Award, MapPin,
  ChevronDown, ChevronUp, Briefcase, Target, Lightbulb,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/uazapi";

interface Corretor {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  creci?: string;
  bairro?: string;
  regiao?: string;
  experiencia?: string;
  atuacao?: string;
  sobre?: string;
  motivacao?: string;
  objetivo?: string;
  comprometido?: boolean;
  ativo: boolean;
  criado_em: string;
  foto_url?: string;
}

interface CorretorStats {
  corretor_id: string;
  msgs_enviadas: number;
  leads_contactados: number;
  leads_convertidos: number;
  leads_em_andamento: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  return `${days} dias atrás`;
}

const EXPERIENCIA_LABEL: Record<string, string> = {
  iniciante: "Iniciante (menos de 1 ano)",
  "1-3": "1 a 3 anos",
  "3-5": "3 a 5 anos",
  "5+": "Mais de 5 anos",
};

const ATUACAO_LABEL: Record<string, string> = {
  negocios: "Negócios / Empresas",
  imoveis: "Imóveis Comerciais",
  franquias: "Franquias",
  galerias: "Galerias Comerciais",
  todos: "Todos os segmentos",
};

const AdminCorretores = () => {
  usePageTitle("Corretores");
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [stats, setStats] = useState<Record<string, CorretorStats>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [tab, setTab] = useState<"pendentes" | "ativos">("pendentes");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchCorretores = async () => {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "corretor")
      .order("criado_em", { ascending: false });

    const corretoresList = (profilesData as Corretor[]) || [];
    setCorretores(corretoresList);

    const { data: msgs } = await supabase
      .from("lead_messages")
      .select("sender_id, lead_id")
      .eq("sender_type", "corretor");

    const { data: leads } = await supabase
      .from("leads")
      .select("id, status, corretor_id");

    const statsMap: Record<string, CorretorStats> = {};
    for (const c of corretoresList) {
      const msgsDoCorretor = (msgs || []).filter((m) => m.sender_id === c.id);
      const leadsUnicos = new Set(msgsDoCorretor.map((m) => m.lead_id));
      const leadsConvertidos = (leads || []).filter((l) => l.corretor_id === c.id && l.status === "convertido").length;
      const leadsEmAndamento = (leads || []).filter((l) => l.corretor_id === c.id && l.status === "em-andamento").length;
      statsMap[c.id] = {
        corretor_id: c.id,
        msgs_enviadas: msgsDoCorretor.length,
        leads_contactados: leadsUnicos.size,
        leads_convertidos: leadsConvertidos,
        leads_em_andamento: leadsEmAndamento,
      };
    }
    setStats(statsMap);
    setLoading(false);
  };

  useEffect(() => { fetchCorretores(); }, []);

  const toggleAtivo = async (corretor: Corretor) => {
    setUpdating(corretor.id);
    const novoAtivo = !corretor.ativo;
    const { error } = await supabase
      .from("profiles")
      .update({ ativo: novoAtivo })
      .eq("id", corretor.id);

    if (!error) {
      setCorretores((prev) =>
        prev.map((c) => c.id === corretor.id ? { ...c, ativo: novoAtivo } : c)
      );

      // Notifica o corretor via WhatsApp quando aprovado
      if (novoAtivo) {
        // Dispara email de redefinição de senha pelo Supabase
        await supabase.auth.resetPasswordForEmail(corretor.email, {
          redirectTo: "https://negociaaky.com.br/corretor/login",
        });

        if (corretor.telefone) {
          await sendWhatsAppMessage(
            corretor.telefone,
            `✅ *Parabéns, ${corretor.nome.split(" ")[0]}!*\n\n` +
            `Sua conta de corretor na *NegociaAky* foi *aprovada*! 🎉\n\n` +
            `Para acessar seu painel, siga os passos:\n\n` +
            `1️⃣ Verifique seu e-mail *${corretor.email}*\n` +
            `2️⃣ Clique no link de acesso que enviamos agora\n` +
            `3️⃣ Defina sua senha e entre no painel\n\n` +
            `🔗 Login: *negociaaky.com.br/corretor/login*\n\n` +
            `Boas vendas! 🚀`
          ).catch(() => {});
        }
      }

      if (novoAtivo) setExpandedId(null);
    }
    setUpdating(null);
  };

  const ativos = corretores.filter((c) => c.ativo);
  const pendentes = corretores.filter((c) => !c.ativo);

  const ranking = [...ativos].sort(
    (a, b) => (stats[b.id]?.msgs_enviadas || 0) - (stats[a.id]?.msgs_enviadas || 0)
  );

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Corretores</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {corretores.length} corretor{corretores.length !== 1 ? "es" : ""} cadastrado{corretores.length !== 1 ? "s" : ""}
          {" · "}{pendentes.length} pendente{pendentes.length !== 1 ? "s" : ""} de aprovação
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : corretores.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <UserCheck className="h-12 w-12 mb-3 opacity-20" />
          <p className="font-medium">Nenhum corretor cadastrado</p>
        </div>
      ) : (
        <div className="space-y-8">

          {ranking.length > 0 && stats[ranking[0]?.id]?.msgs_enviadas > 0 && (
            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-secondary p-5">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-primary" />
                <h2 className="font-display font-bold text-foreground">Ranking de Performance</h2>
              </div>
              <div className="space-y-3">
                {ranking.slice(0, 5).map((c, i) => {
                  const s = stats[c.id] || { msgs_enviadas: 0, leads_contactados: 0, leads_convertidos: 0, leads_em_andamento: 0 };
                  const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
                  return (
                    <div key={c.id} className="flex items-center gap-4 rounded-lg bg-card p-3 shadow-sm">
                      <span className="text-xl w-8 shrink-0 text-center">{medalha}</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                          {c.foto_url
                            ? <img src={c.foto_url} alt={c.nome} className="h-full w-full object-cover" />
                            : <span className="text-xs font-bold text-primary">{c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span>
                          }
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{c.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">{[c.bairro, c.regiao].filter(Boolean).join(" · ") || c.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <StatPill icon={<MessageCircle className="h-3 w-3" />} value={s.msgs_enviadas} label="msgs" />
                        <StatPill icon={<TrendingUp className="h-3 w-3" />} value={s.leads_contactados} label="leads" color="blue" />
                        <StatPill icon={<Star className="h-3 w-3" />} value={s.leads_convertidos} label="fechados" color="green" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border">
            <TabBtn active={tab === "pendentes"} onClick={() => setTab("pendentes")} badge={pendentes.length}>
              Aguardando Aprovação
            </TabBtn>
            <TabBtn active={tab === "ativos"} onClick={() => setTab("ativos")} badge={ativos.length}>
              Ativos
            </TabBtn>
          </div>

          {tab === "pendentes" && (
            pendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum corretor aguardando aprovação</p>
            ) : (
              <div className="space-y-3">
                {pendentes.map((c) => (
                  <CorretorCard
                    key={c.id} corretor={c} stats={stats[c.id]}
                    updating={updating} onToggle={toggleAtivo}
                    expanded={expandedId === c.id}
                    onExpand={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  />
                ))}
              </div>
            )
          )}

          {tab === "ativos" && (
            ativos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum corretor ativo</p>
            ) : (
              <div className="space-y-3">
                {ativos.map((c) => (
                  <CorretorCard
                    key={c.id} corretor={c} stats={stats[c.id]}
                    updating={updating} onToggle={toggleAtivo}
                    expanded={expandedId === c.id}
                    onExpand={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}
    </AdminLayout>
  );
};

const StatPill = ({ icon, value, label, color = "default" }: {
  icon: React.ReactNode; value: number; label: string; color?: "default" | "blue" | "green";
}) => {
  const colors = { default: "bg-muted text-muted-foreground", blue: "bg-blue-50 text-blue-700", green: "bg-green-50 text-green-700" };
  return (
    <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${colors[color]}`}>
      {icon}<span className="font-bold">{value}</span><span className="opacity-70">{label}</span>
    </div>
  );
};

const TabBtn = ({ active, onClick, badge, children }: {
  active: boolean; onClick: () => void; badge: number; children: React.ReactNode;
}) => (
  <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
    {children}
    <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{badge}</span>
  </button>
);

const CorretorCard = ({ corretor, stats, updating, onToggle, expanded, onExpand }: {
  corretor: Corretor; stats?: CorretorStats; updating: string | null;
  onToggle: (c: Corretor) => void; expanded: boolean; onExpand: () => void;
}) => (
  <div className={`rounded-xl border bg-card shadow-sm overflow-hidden ${corretor.ativo ? "border-border" : "border-amber-200"}`}>
    {/* Header — sempre visível */}
    <div className={`p-4 ${!corretor.ativo ? "bg-amber-50/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="h-11 w-11 rounded-full shrink-0 overflow-hidden bg-primary/10 flex items-center justify-center mt-0.5 ring-2 ring-primary/10">
            {corretor.foto_url
              ? <img src={corretor.foto_url} alt={corretor.nome} className="h-full w-full object-cover" />
              : <span className="font-display text-sm font-bold text-primary">
                  {corretor.nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground">{corretor.nome}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${corretor.ativo ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {corretor.ativo ? "Ativo" : "Pendente"}
              </span>
              {corretor.comprometido && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />Comprometido ✅
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
              {corretor.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{corretor.email}</span>}
              {corretor.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{corretor.telefone}</span>}
              {corretor.regiao && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{corretor.regiao}</span>}
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(corretor.criado_em)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Botão expandir para ver detalhes */}
          <button
            onClick={onExpand}
            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Fechar" : "Ver dados"}
          </button>

          <Button
            size="sm"
            variant={corretor.ativo ? "outline" : "default"}
            className={`gap-1.5 ${!corretor.ativo ? "bg-green-600 hover:bg-green-700 text-white border-0" : ""}`}
            disabled={updating === corretor.id}
            onClick={() => onToggle(corretor)}
          >
            {updating === corretor.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : corretor.ativo ? (
              <><UserX className="h-3.5 w-3.5" />Desativar</>
            ) : (
              <><UserCheck className="h-3.5 w-3.5" />Aprovar</>
            )}
          </Button>
        </div>
      </div>
    </div>

    {/* Detalhes expandidos */}
    {expanded && (
      <div className="border-t border-border bg-muted/20 px-4 pb-4 pt-3 space-y-4">

        <div className="grid gap-4 sm:grid-cols-2">
          {corretor.creci && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">CRECI</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Award className="h-4 w-4 text-primary" />{corretor.creci}
              </p>
            </div>
          )}
          {corretor.atuacao && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Área de Atuação</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-primary" />
                {ATUACAO_LABEL[corretor.atuacao] || corretor.atuacao}
              </p>
            </div>
          )}
          {corretor.experiencia && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Experiência</p>
              <p className="text-sm font-medium text-foreground">
                {EXPERIENCIA_LABEL[corretor.experiencia] || corretor.experiencia}
              </p>
            </div>
          )}
          {corretor.regiao && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Região de Atuação</p>
              <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />{corretor.regiao}
              </p>
            </div>
          )}
        </div>

        {corretor.sobre && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Sobre</p>
            <p className="text-sm text-foreground bg-card rounded-lg px-3 py-2 border border-border">
              {corretor.sobre}
            </p>
          </div>
        )}

        {(corretor.motivacao || corretor.objetivo) && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Motivações & Objetivos</p>
            {corretor.motivacao && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Lightbulb className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">Por que quer ser corretor</p>
                </div>
                <p className="text-sm text-foreground">{corretor.motivacao}</p>
              </div>
            )}
            {corretor.objetivo && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">Como pretende contribuir</p>
                </div>
                <p className="text-sm text-foreground">{corretor.objetivo}</p>
              </div>
            )}
          </div>
        )}

        {corretor.ativo && stats && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Performance</p>
            <div className="flex flex-wrap gap-2">
              <StatPill icon={<MessageCircle className="h-3 w-3" />} value={stats.msgs_enviadas} label="msgs enviadas" />
              <StatPill icon={<TrendingUp className="h-3 w-3" />} value={stats.leads_contactados} label="leads contactados" color="blue" />
              <StatPill icon={<CheckCircle className="h-3 w-3" />} value={stats.leads_em_andamento} label="em andamento" />
              <StatPill icon={<Star className="h-3 w-3" />} value={stats.leads_convertidos} label="fechados" color="green" />
            </div>
          </div>
        )}

        {!corretor.creci && !corretor.atuacao && !corretor.experiencia && !corretor.sobre && (
          <p className="text-sm text-muted-foreground italic">
            Corretor não preencheu os dados do perfil ainda.
          </p>
        )}
      </div>
    )}
  </div>
);

export default AdminCorretores;
