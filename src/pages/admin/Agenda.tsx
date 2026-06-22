import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  CalendarDays, Clock, Phone, Video, UserCheck, RotateCcw, Plus, X,
  ChevronLeft, ChevronRight, Loader2, Settings, CheckCircle2, AlertTriangle,
  PhoneCall, Users, Eye, Copy, Trash2,
} from "lucide-react";

/* ── types ── */
type Tarefa = {
  id: string; tipo: string; titulo: string; responsavel: string | null;
  cliente_nome: string | null; data: string; hora: string | null;
  notas: string | null; transcricao: string | null; crucial: boolean;
  status: string; participantes: string[] | null; created_at: string;
  user_id: string | null;
};

type Agendamento = {
  id: string; nome: string; email: string | null; telefone: string;
  imovel_ref: string | null; data: string; horario: string; status: string;
  notas: string | null; corretor: string | null; created_at: string;
  user_id: string | null;
};

type Corretor = { id: string; nome: string; role: string };

type HorarioConfig = {
  dia: string; ativo: boolean; inicio: string; fim: string;
};

const TIPO_CONFIG: Record<string, { label: string; icon: typeof Phone; color: string; bg: string }> = {
  ligacao: { label: "Ligação", icon: PhoneCall, color: "text-blue-700", bg: "bg-blue-100" },
  reuniao: { label: "Reunião", icon: Video, color: "text-purple-700", bg: "bg-purple-100" },
  follow_up: { label: "Follow-up", icon: RotateCcw, color: "text-amber-700", bg: "bg-amber-100" },
  visita: { label: "Visita", icon: Eye, color: "text-green-700", bg: "bg-green-100" },
  call: { label: "Call", icon: Phone, color: "text-indigo-700", bg: "bg-indigo-100" },
};

const DIA_LABELS: Record<string, string> = {
  seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom",
};

// responsáveis carregados do banco

/* ── helpers ── */
function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(startDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
  return weeks;
}

function dateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function Agenda() {
  const today = new Date();
  const [userId, setUserId] = useState<string | null>(null);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [showModal, setShowModal] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [horarios, setHorarios] = useState<HorarioConfig[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);
  const [corretores, setCorretores] = useState<Corretor[]>([]);
  const [filtroCorretor, setFiltroCorretor] = useState<string>("todos");

  // Nova tarefa form
  const [nTipo, setNTipo] = useState("ligacao");
  const [nTitulo, setNTitulo] = useState("Ligação");
  const [nResp, setNResp] = useState("");
  const [nRespId, setNRespId] = useState("");
  const [nCliente, setNCliente] = useState("");
  const [nData, setNData] = useState(dateStr(year, month, selectedDay || today.getDate()));
  const [nHora, setNHora] = useState("10:00");
  const [nNotas, setNNotas] = useState("");
  const [nTranscricao, setNTranscricao] = useState("");
  const [nCrucial, setNCrucial] = useState(false);
  const [savingTarefa, setSavingTarefa] = useState(false);

  const weeks = useMemo(() => getMonthDays(year, month), [year, month]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setUserId(data.session.user.id);
    });
    supabase.from("profiles").select("id, nome, role").in("role", ["admin", "corretor"]).eq("ativo", true).order("nome").then(({ data }) => {
      if (data) {
        setCorretores(data);
        if (data.length > 0 && !nResp) { setNResp(data[0].nome); setNRespId(data[0].id); }
      }
    });
  }, []);

  const load = async () => {
    setLoading(true);
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    let tQ = supabase.from("agenda_tarefas").select("*").gte("data", `${monthStr}-01`).lte("data", `${monthStr}-${String(lastDay).padStart(2, "0")}`).order("data").order("hora");
    let aQ = supabase.from("agendamentos").select("*").gte("data", `${monthStr}-01`).lte("data", `${monthStr}-${String(lastDay).padStart(2, "0")}`).order("data").order("horario");
    if (filtroCorretor !== "todos") {
      tQ = tQ.eq("user_id", filtroCorretor);
      aQ = aQ.eq("user_id", filtroCorretor);
    }
    const [t, a, c] = await Promise.all([
      tQ, aQ,
      supabase.from("agenda_config").select("horarios").eq("id", 1).maybeSingle(),
    ]);
    setTarefas(t.data || []);
    setAgendamentos(a.data || []);
    if (c.data?.horarios) setHorarios(c.data.horarios);
    setLoading(false);
  };

  useEffect(() => { load(); }, [year, month, filtroCorretor]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); setSelectedDay(null); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today.getDate()); };

  const todayStr = dateStr(today.getFullYear(), today.getMonth(), today.getDate());

  // items for a given day
  const itemsForDay = (d: number) => {
    const ds = dateStr(year, month, d);
    const tDay = tarefas.filter((t) => t.data === ds);
    const aDay = agendamentos.filter((a) => a.data === ds);
    return { tarefas: tDay, agendamentos: aDay, total: tDay.length + aDay.length };
  };

  // selected day details
  const sel = selectedDay ? itemsForDay(selectedDay) : null;
  const selDateStr = selectedDay ? dateStr(year, month, selectedDay) : "";

  // KPIs
  const kpis = useMemo(() => {
    const tAll = tarefas;
    const aAll = agendamentos;
    const todayT = tAll.filter((t) => t.data === todayStr);
    const todayA = aAll.filter((a) => a.data === todayStr);
    const atrasadas = tAll.filter((t) => t.data < todayStr && t.status === "pendente");
    const atrasadasA = aAll.filter((a) => a.data < todayStr && a.status === "pendente");
    const semana = tAll.filter((t) => { const d = new Date(t.data + "T12:00:00"); const diff = (d.getTime() - today.getTime()) / 86400000; return diff >= 0 && diff < 7; });
    const concluidas = tAll.filter((t) => t.data === todayStr && t.status === "concluida");
    return {
      reunioes: aAll.filter((a) => a.status !== "cancelado").length,
      followUps: tAll.filter((t) => t.tipo === "follow_up" && t.status === "pendente").length,
      atrasadas: atrasadas.length + atrasadasA.length,
      calls: tAll.filter((t) => (t.tipo === "ligacao" || t.tipo === "call") && t.status === "pendente").length,
      hoje: todayT.length + todayA.length,
      semana: semana.length,
      concluidas: concluidas.length,
    };
  }, [tarefas, agendamentos, todayStr]);

  // Create tarefa
  const handleCreateTarefa = async () => {
    if (!nTitulo.trim()) { toast.error("Informe o título"); return; }
    setSavingTarefa(true);
    const { error } = await supabase.from("agenda_tarefas").insert({
      tipo: nTipo, titulo: nTitulo.trim(), responsavel: nResp || null,
      cliente_nome: nCliente.trim() || null, data: nData, hora: nHora || null,
      notas: nNotas.trim() || null, transcricao: nTranscricao.trim() || null,
      crucial: nCrucial, user_id: nRespId || userId,
    });
    setSavingTarefa(false);
    if (error) { toast.error("Erro ao criar tarefa"); return; }
    toast.success("Tarefa criada!");
    setShowModal(false);
    setNTitulo("Ligação"); setNCliente(""); setNNotas(""); setNTranscricao(""); setNCrucial(false);
    load();
  };

  const toggleTarefaStatus = async (id: string, current: string) => {
    const next = current === "concluida" ? "pendente" : "concluida";
    await supabase.from("agenda_tarefas").update({ status: next, updated_at: new Date().toISOString() }).eq("id", id);
    setTarefas((p) => p.map((t) => t.id === id ? { ...t, status: next } : t));
    toast.success(next === "concluida" ? "Concluída!" : "Reaberta");
  };

  const deleteTarefa = async (id: string) => {
    if (!confirm("Excluir esta tarefa?")) return;
    await supabase.from("agenda_tarefas").delete().eq("id", id);
    setTarefas((p) => p.filter((t) => t.id !== id));
    toast.success("Tarefa excluída");
  };

  const changeAgendamentoStatus = async (id: string, status: string) => {
    await supabase.from("agendamentos").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setAgendamentos((p) => p.map((a) => a.id === id ? { ...a, status } : a));
    toast.success(`Agendamento: ${status}`);
  };

  // Save config
  const saveConfig = async () => {
    setSavingConfig(true);
    const { error } = await supabase.from("agenda_config").update({ horarios, updated_at: new Date().toISOString() }).eq("id", 1);
    setSavingConfig(false);
    if (error) toast.error("Erro ao salvar");
    else toast.success("Horários salvos!");
  };

  const bookingUrl = `${window.location.origin}/agendar`;

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-[#BAA05E]" /> Agenda
            </h1>
            <select
              value={filtroCorretor}
              onChange={(e) => setFiltroCorretor(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium"
            >
              <option value="todos">Todos</option>
              {corretores.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success("Link copiado!"); }} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Link
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowConfig(true)} className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" onClick={() => { setNData(selDateStr || todayStr); setShowModal(true); }} className="gap-1.5 bg-[#1a1a2e] hover:bg-[#16162a] text-white">
              <Plus className="h-4 w-4" /> Nova tarefa
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 font-medium text-blue-700">
            <Video className="h-3.5 w-3.5" /> {kpis.reunioes} reuniões
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 font-medium text-amber-700">
            <RotateCcw className="h-3.5 w-3.5" /> {kpis.followUps} follow-ups
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 font-medium text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" /> {kpis.atrasadas} atrasadas
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 font-medium text-indigo-700">
            <PhoneCall className="h-3.5 w-3.5" /> {kpis.calls} calls
          </span>
        </div>

        {/* Sub-KPIs */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span><AlertTriangle className="inline h-3 w-3 mr-1" />Atrasadas: {kpis.atrasadas}</span>
          <span>Hoje: {kpis.hoje}</span>
          <span>Semana: {kpis.semana}</span>
          <span><CheckCircle2 className="inline h-3 w-3 mr-1" />Concluídas hoje: {kpis.concluidas}</span>
        </div>

        {/* Calendar + Side panel */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Calendar */}
          <div className="flex-1 bg-white rounded-xl border shadow-sm">
            {/* Month nav */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <button onClick={goToday} className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-gray-50">Hoje</button>
                <button onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-gray-100"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-gray-100"><ChevronRight className="h-4 w-4" /></button>
                <h2 className="text-lg font-semibold ml-2">{MONTH_NAMES[month]} {year}</h2>
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedDay
                  ? `${DOW[new Date(year, month, selectedDay).getDay()]}, ${String(selectedDay).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`
                  : "Clique em um dia"}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-[#BAA05E]" /></div>
            ) : (
              <div className="p-3">
                {/* DOW header */}
                <div className="grid grid-cols-7 mb-1">
                  {DOW.map((d) => (
                    <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
                  ))}
                </div>
                {/* Weeks */}
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7">
                    {week.map((d, di) => {
                      if (d === null) return <div key={di} className="border border-transparent p-1 min-h-[80px]" />;
                      const ds = dateStr(year, month, d);
                      const isToday = ds === todayStr;
                      const isSel = d === selectedDay;
                      const items = itemsForDay(d);
                      const dayTarefas = items.tarefas.slice(0, 2);
                      const dayAgend = items.agendamentos.slice(0, 2);
                      const overflow = items.total - dayTarefas.length - dayAgend.length;
                      return (
                        <button
                          key={di}
                          onClick={() => setSelectedDay(d)}
                          className={`border rounded-lg p-1 min-h-[80px] text-left transition-all hover:bg-gray-50 ${
                            isSel ? "border-[#1a1a2e] bg-[#1a1a2e]/5 ring-1 ring-[#1a1a2e]/20" : "border-gray-100"
                          }`}
                        >
                          <span className={`inline-flex items-center justify-center rounded-full text-xs font-medium w-6 h-6 ${
                            isToday ? "bg-[#1a1a2e] text-white" : "text-gray-700"
                          }`}>{d}</span>
                          <div className="mt-0.5 space-y-0.5">
                            {dayAgend.map((a) => (
                              <div key={a.id} className="flex items-center gap-0.5 rounded bg-green-100 px-1 py-0.5 text-[10px] font-medium text-green-800 truncate">
                                <Eye className="h-2.5 w-2.5 shrink-0" /> {a.horario} Visita
                              </div>
                            ))}
                            {dayTarefas.map((t) => {
                              const cfg = TIPO_CONFIG[t.tipo] || TIPO_CONFIG.ligacao;
                              return (
                                <div key={t.id} className={`flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium truncate ${cfg.bg} ${cfg.color} ${t.status === "concluida" ? "opacity-50 line-through" : ""}`}>
                                  <cfg.icon className="h-2.5 w-2.5 shrink-0" /> {t.hora || ""} {t.titulo}
                                </div>
                              );
                            })}
                            {overflow > 0 && <div className="text-[10px] text-muted-foreground pl-1">+{overflow} mais</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel — Day detail */}
          <div className="w-full lg:w-80 bg-white rounded-xl border shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                {selectedDay
                  ? `${DOW[new Date(year, month, selectedDay).getDay()]}, ${selectedDay} de ${MONTH_NAMES[month]}`
                  : "Selecione um dia"}
              </h3>
              {selectedDay && (
                <Button size="sm" variant="ghost" onClick={() => { setNData(selDateStr); setShowModal(true); }}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            {sel && sel.total === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma tarefa neste dia</p>
            )}

            {sel && sel.agendamentos.map((a) => (
              <div key={a.id} className="rounded-lg border border-green-200 bg-green-50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-700" />
                  <span className="font-medium text-sm text-green-800">{a.horario} — Visita</span>
                  <span className={`ml-auto text-xs rounded-full px-2 py-0.5 font-medium ${
                    a.status === "confirmado" ? "bg-blue-100 text-blue-700" :
                    a.status === "realizado" ? "bg-green-200 text-green-800" :
                    a.status === "cancelado" ? "bg-red-100 text-red-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>{a.status}</span>
                </div>
                <p className="text-sm text-gray-700"><strong>{a.nome}</strong> · {a.telefone}</p>
                {a.email && <p className="text-xs text-gray-500">✉ {a.email}</p>}
                {a.imovel_ref && <p className="text-xs text-gray-500">📍 {a.imovel_ref}</p>}
                <div className="flex gap-1.5 pt-1">
                  {a.status === "pendente" && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-blue-200 text-blue-700" onClick={() => changeAgendamentoStatus(a.id, "confirmado")}>Confirmar</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-200 text-red-600" onClick={() => changeAgendamentoStatus(a.id, "cancelado")}>Cancelar</Button>
                    </>
                  )}
                  {a.status === "confirmado" && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-green-200 text-green-700" onClick={() => changeAgendamentoStatus(a.id, "realizado")}>Realizado</Button>
                  )}
                  <a href={`https://wa.me/55${a.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-green-300 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100">
                    <Phone className="h-3 w-3" /> WhatsApp
                  </a>
                </div>
              </div>
            ))}

            {sel && sel.tarefas.map((t) => {
              const cfg = TIPO_CONFIG[t.tipo] || TIPO_CONFIG.ligacao;
              return (
                <div key={t.id} className={`rounded-lg border p-3 space-y-1.5 ${t.status === "concluida" ? "opacity-60 bg-gray-50 border-gray-200" : `${cfg.bg} border-gray-200`}`}>
                  <div className="flex items-center gap-2">
                    <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
                    <span className={`font-medium text-sm ${t.status === "concluida" ? "line-through text-gray-500" : "text-gray-900"}`}>
                      {t.hora && `${t.hora} — `}{t.titulo}
                    </span>
                  </div>
                  {t.responsavel && <p className="text-xs text-gray-500">👤 {t.responsavel}</p>}
                  {t.cliente_nome && <p className="text-xs text-gray-500">🏢 {t.cliente_nome}</p>}
                  {t.notas && <p className="text-xs text-gray-500 italic">"{t.notas}"</p>}
                  {t.crucial && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600"><AlertTriangle className="h-3 w-3" /> CRUCIAL</span>}
                  <div className="flex gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => toggleTarefaStatus(t.id, t.status)}>
                      <CheckCircle2 className="h-3 w-3" /> {t.status === "concluida" ? "Reabrir" : "Concluir"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:text-red-700"
                      onClick={() => deleteTarefa(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Modal Nova Tarefa ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-[#1a1a2e]" /> Nova Tarefa
              </h2>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1.5 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>

            {/* Tipo + Responsável + Título */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo</label>
                <select
                  value={nTipo}
                  onChange={(e) => { setNTipo(e.target.value); setNTitulo(TIPO_CONFIG[e.target.value]?.label || ""); }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
                >
                  {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Responsável</label>
                <select value={nRespId} onChange={(e) => { setNRespId(e.target.value); const c = corretores.find((c) => c.id === e.target.value); setNResp(c?.nome || ""); }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white">
                  {corretores.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                <Input value={nTitulo} onChange={(e) => setNTitulo(e.target.value)} placeholder="Ligação" />
              </div>
            </div>

            {/* Cliente */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1"><Users className="h-3 w-3" /> Cliente</label>
              <Input value={nCliente} onChange={(e) => setNCliente(e.target.value)} placeholder="Buscar cliente..." />
            </div>

            {/* Data + Hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Data</label>
                <Input type="date" value={nData} onChange={(e) => setNData(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1"><Clock className="h-3 w-3" /> Hora</label>
                <Input type="time" value={nHora} onChange={(e) => setNHora(e.target.value)} />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Notas</label>
              <Textarea value={nNotas} onChange={(e) => setNNotas(e.target.value)} placeholder="Observações..." rows={3} className="resize-none" />
            </div>

            {/* Crucial toggle */}
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <span className="text-sm font-medium text-red-700 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Tarefa Crucial
              </span>
              <span className="text-xs text-red-500">(cobrada a cada 2h)</span>
              <div className="ml-auto">
                <Switch checked={nCrucial} onCheckedChange={setNCrucial} />
              </div>
            </div>

            {/* Transcrição */}
            <div className="rounded-lg border border-[#BAA05E]/30 bg-[#BAA05E]/5 p-3">
              <label className="text-xs font-medium text-[#BAA05E] mb-1 block flex items-center gap-1">
                ✨ Transcrição (opcional)
              </label>
              <Textarea value={nTranscricao} onChange={(e) => setNTranscricao(e.target.value)}
                placeholder="Cole a transcrição da call para análise com IA..." rows={3} className="resize-none bg-white" />
            </div>

            {/* Participantes info */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block flex items-center gap-1">
                <Users className="h-3 w-3" /> Participantes internos
              </label>
              <button className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleCreateTarefa} disabled={savingTarefa} className="bg-[#1a1a2e] hover:bg-[#16162a] text-white">
                {savingTarefa ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Configurar Agenda ── */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfig(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:mx-4 p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Configurar Agenda</h2>
              <button onClick={() => setShowConfig(false)} className="rounded-lg p-1.5 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              <button className="flex-1 rounded-md bg-white shadow-sm px-3 py-2 text-sm font-medium flex items-center justify-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Horário
              </button>
              <button className="flex-1 rounded-md px-3 py-2 text-sm font-medium text-gray-500 flex items-center justify-center gap-1.5 hover:text-gray-700">
                🔒 Bloqueios
              </button>
              <button className="flex-1 rounded-md px-3 py-2 text-sm font-medium text-gray-500 flex items-center justify-center gap-1.5 hover:text-gray-700">
                <Video className="h-3.5 w-3.5" /> Reuniões
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              Configure seus dias e horários de trabalho. O agente IA usará essas informações para agendar reuniões.
            </p>

            {/* Horários */}
            <div className="space-y-3">
              {horarios.map((h, i) => (
                <div key={h.dia} className="flex items-center gap-3">
                  <Switch
                    checked={h.ativo}
                    onCheckedChange={(v) => {
                      const next = [...horarios];
                      next[i] = { ...h, ativo: v };
                      setHorarios(next);
                    }}
                  />
                  <span className="w-10 text-sm font-semibold text-gray-700">{DIA_LABELS[h.dia] || h.dia}</span>
                  {h.ativo ? (
                    <>
                      <div className="flex items-center gap-1.5">
                        <Input type="time" value={h.inicio} className="w-28 h-9 text-sm"
                          onChange={(e) => { const next = [...horarios]; next[i] = { ...h, inicio: e.target.value }; setHorarios(next); }} />
                      </div>
                      <span className="text-xs text-gray-400">até</span>
                      <div className="flex items-center gap-1.5">
                        <Input type="time" value={h.fim} className="w-28 h-9 text-sm"
                          onChange={(e) => { const next = [...horarios]; next[i] = { ...h, fim: e.target.value }; setHorarios(next); }} />
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">Folga</span>
                  )}
                </div>
              ))}
            </div>

            <Button onClick={saveConfig} disabled={savingConfig} className="w-full bg-[#1a1a2e] hover:bg-[#16162a] text-white">
              {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar horário"}
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
