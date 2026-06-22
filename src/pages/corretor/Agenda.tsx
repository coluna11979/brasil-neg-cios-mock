import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import CorretorLayout from "@/components/corretor/CorretorLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  CalendarDays, Clock, Phone, Video, RotateCcw, Plus, X,
  ChevronLeft, ChevronRight, Loader2, Settings, CheckCircle2, AlertTriangle,
  PhoneCall, Users, Eye, Copy, Trash2,
} from "lucide-react";

type Tarefa = {
  id: string; tipo: string; titulo: string; responsavel: string | null;
  cliente_nome: string | null; data: string; hora: string | null;
  notas: string | null; crucial: boolean; status: string; created_at: string;
};

type Agendamento = {
  id: string; nome: string; email: string | null; telefone: string;
  imovel_ref: string | null; data: string; horario: string; status: string;
  notas: string | null; corretor: string | null; created_at: string;
};

type HorarioConfig = { dia: string; ativo: boolean; inicio: string; fim: string };

const TIPO_CONFIG: Record<string, { label: string; icon: typeof Phone; color: string; bg: string }> = {
  ligacao: { label: "Ligação", icon: PhoneCall, color: "text-blue-700", bg: "bg-blue-100" },
  reuniao: { label: "Reunião", icon: Video, color: "text-purple-700", bg: "bg-purple-100" },
  follow_up: { label: "Follow-up", icon: RotateCcw, color: "text-amber-700", bg: "bg-amber-100" },
  visita: { label: "Visita", icon: Eye, color: "text-green-700", bg: "bg-green-100" },
  call: { label: "Call", icon: Phone, color: "text-indigo-700", bg: "bg-indigo-100" },
};

const DIA_LABELS: Record<string, string> = { seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb", dom: "Dom" };
const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DOW = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

const DEFAULT_HORARIOS: HorarioConfig[] = [
  { dia: "seg", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "ter", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "qua", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "qui", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "sex", ativo: true, inicio: "09:00", fim: "18:00" },
  { dia: "sab", ativo: false, inicio: "09:00", fim: "13:00" },
  { dia: "dom", ativo: false, inicio: "", fim: "" },
];

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

function ds(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CorretorAgenda() {
  const today = new Date();
  const [userId, setUserId] = useState<string | null>(null);
  const [nomeCorretor, setNomeCorretor] = useState("");
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [showModal, setShowModal] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [horarios, setHorarios] = useState<HorarioConfig[]>(DEFAULT_HORARIOS);
  const [savingConfig, setSavingConfig] = useState(false);

  const [nTipo, setNTipo] = useState("ligacao");
  const [nTitulo, setNTitulo] = useState("Ligação");
  const [nCliente, setNCliente] = useState("");
  const [nData, setNData] = useState(ds(year, month, selectedDay || today.getDate()));
  const [nHora, setNHora] = useState("10:00");
  const [nNotas, setNNotas] = useState("");
  const [nCrucial, setNCrucial] = useState(false);
  const [savingTarefa, setSavingTarefa] = useState(false);

  const weeks = useMemo(() => getMonthDays(year, month), [year, month]);
  const todayStr = ds(today.getFullYear(), today.getMonth(), today.getDate());
  const selDateStr = selectedDay ? ds(year, month, selectedDay) : "";

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      const uid = data.session.user.id;
      setUserId(uid);
      const { data: p } = await supabase.from("profiles").select("nome").eq("id", uid).single();
      if (p?.nome) setNomeCorretor(p.nome);
    });
  }, []);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const ms = `${year}-${String(month + 1).padStart(2, "0")}`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${ms}-${String(lastDay).padStart(2, "0")}`;
    const [t, a, c] = await Promise.all([
      supabase.from("agenda_tarefas").select("*").eq("user_id", userId).gte("data", `${ms}-01`).lte("data", endDate).order("data").order("hora"),
      supabase.from("agendamentos").select("*").eq("user_id", userId).gte("data", `${ms}-01`).lte("data", endDate).order("data").order("horario"),
      supabase.from("agenda_config").select("horarios").eq("user_id", userId).maybeSingle(),
    ]);
    setTarefas(t.data || []);
    setAgendamentos(a.data || []);
    if (c.data?.horarios) setHorarios(c.data.horarios);
    setLoading(false);
  };

  useEffect(() => { if (userId) load(); }, [year, month, userId]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1); setSelectedDay(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1); setSelectedDay(null); };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today.getDate()); };

  const itemsForDay = (d: number) => {
    const s = ds(year, month, d);
    const tDay = tarefas.filter((t) => t.data === s);
    const aDay = agendamentos.filter((a) => a.data === s);
    return { tarefas: tDay, agendamentos: aDay, total: tDay.length + aDay.length };
  };

  const sel = selectedDay ? itemsForDay(selectedDay) : null;

  const kpis = useMemo(() => {
    const atrasadas = tarefas.filter((t) => t.data < todayStr && t.status === "pendente").length
      + agendamentos.filter((a) => a.data < todayStr && a.status === "pendente").length;
    return {
      reunioes: agendamentos.filter((a) => a.status !== "cancelado").length,
      followUps: tarefas.filter((t) => t.tipo === "follow_up" && t.status === "pendente").length,
      atrasadas,
      calls: tarefas.filter((t) => (t.tipo === "ligacao" || t.tipo === "call") && t.status === "pendente").length,
      hoje: tarefas.filter((t) => t.data === todayStr).length + agendamentos.filter((a) => a.data === todayStr).length,
      concluidas: tarefas.filter((t) => t.data === todayStr && t.status === "concluida").length,
    };
  }, [tarefas, agendamentos, todayStr]);

  const handleCreateTarefa = async () => {
    if (!nTitulo.trim() || !userId) return;
    setSavingTarefa(true);
    const { error } = await supabase.from("agenda_tarefas").insert({
      tipo: nTipo, titulo: nTitulo.trim(), responsavel: nomeCorretor || null,
      cliente_nome: nCliente.trim() || null, data: nData, hora: nHora || null,
      notas: nNotas.trim() || null, crucial: nCrucial, user_id: userId,
    });
    setSavingTarefa(false);
    if (error) { toast.error("Erro ao criar tarefa"); return; }
    toast.success("Tarefa criada!");
    setShowModal(false);
    setNTitulo("Ligação"); setNCliente(""); setNNotas(""); setNCrucial(false);
    load();
  };

  const toggleStatus = async (id: string, cur: string) => {
    const next = cur === "concluida" ? "pendente" : "concluida";
    await supabase.from("agenda_tarefas").update({ status: next }).eq("id", id);
    setTarefas((p) => p.map((t) => t.id === id ? { ...t, status: next } : t));
  };

  const deleteTarefa = async (id: string) => {
    if (!confirm("Excluir esta tarefa?")) return;
    await supabase.from("agenda_tarefas").delete().eq("id", id);
    setTarefas((p) => p.filter((t) => t.id !== id));
  };

  const changeAgStatus = async (id: string, status: string) => {
    await supabase.from("agendamentos").update({ status }).eq("id", id);
    setAgendamentos((p) => p.map((a) => a.id === id ? { ...a, status } : a));
    toast.success(`Status: ${status}`);
  };

  const saveConfig = async () => {
    if (!userId) return;
    setSavingConfig(true);
    const { data: existing } = await supabase.from("agenda_config").select("id").eq("user_id", userId).maybeSingle();
    if (existing) {
      await supabase.from("agenda_config").update({ horarios, updated_at: new Date().toISOString() }).eq("user_id", userId);
    } else {
      await supabase.from("agenda_config").insert({ id: Math.floor(Math.random() * 999999), user_id: userId, horarios });
    }
    setSavingConfig(false);
    toast.success("Horários salvos!");
  };

  return (
    <CorretorLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" /> Minha Agenda
            </h1>
            <p className="text-xs text-muted-foreground">{nomeCorretor}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowConfig(true)} className="gap-1.5">
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" onClick={() => { setNData(selDateStr || todayStr); setShowModal(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova tarefa
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 font-medium text-blue-700">
            <Video className="h-3 w-3" /> {kpis.reunioes} reuniões
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 font-medium text-amber-700">
            <RotateCcw className="h-3 w-3" /> {kpis.followUps} follow-ups
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 font-medium text-red-700">
            <AlertTriangle className="h-3 w-3" /> {kpis.atrasadas} atrasadas
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-1 font-medium text-indigo-700">
            <PhoneCall className="h-3 w-3" /> {kpis.calls} calls
          </span>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span>Atrasadas: {kpis.atrasadas}</span>
          <span>Hoje: {kpis.hoje}</span>
          <span>Concluídas hoje: {kpis.concluidas}</span>
        </div>

        {/* Calendar + Side */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Calendar */}
          <div className="flex-1 bg-white rounded-xl border shadow-sm">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <button onClick={goToday} className="rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-gray-50">Hoje</button>
                <button onClick={prevMonth} className="rounded-lg p-1 hover:bg-gray-100"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={nextMonth} className="rounded-lg p-1 hover:bg-gray-100"><ChevronRight className="h-4 w-4" /></button>
                <h2 className="text-sm font-semibold ml-1">{MONTH_NAMES[month]} {year}</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {selectedDay ? `${String(selectedDay).padStart(2,"0")}/${String(month+1).padStart(2,"0")}/${year}` : ""}
              </span>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="p-2">
                <div className="grid grid-cols-7 mb-1">
                  {DOW.map((d) => <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1.5">{d}</div>)}
                </div>
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7">
                    {week.map((d, di) => {
                      if (d === null) return <div key={di} className="border border-transparent p-0.5 min-h-[64px]" />;
                      const dStr = ds(year, month, d);
                      const isT = dStr === todayStr;
                      const isSel = d === selectedDay;
                      const items = itemsForDay(d);
                      return (
                        <button key={di} onClick={() => setSelectedDay(d)}
                          className={`border rounded-lg p-1 min-h-[64px] text-left transition-all hover:bg-gray-50 ${isSel ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-gray-100"}`}>
                          <span className={`inline-flex items-center justify-center rounded-full text-[11px] font-medium w-5 h-5 ${isT ? "bg-primary text-white" : "text-gray-700"}`}>{d}</span>
                          <div className="mt-0.5 space-y-0.5">
                            {items.agendamentos.slice(0, 1).map((a) => (
                              <div key={a.id} className="flex items-center gap-0.5 rounded bg-green-100 px-0.5 py-px text-[9px] font-medium text-green-800 truncate">
                                <Eye className="h-2 w-2 shrink-0" /> {a.horario}
                              </div>
                            ))}
                            {items.tarefas.slice(0, 1).map((t) => {
                              const c = TIPO_CONFIG[t.tipo] || TIPO_CONFIG.ligacao;
                              return (
                                <div key={t.id} className={`flex items-center gap-0.5 rounded px-0.5 py-px text-[9px] font-medium truncate ${c.bg} ${c.color} ${t.status === "concluida" ? "opacity-50 line-through" : ""}`}>
                                  <c.icon className="h-2 w-2 shrink-0" /> {t.hora || ""}
                                </div>
                              );
                            })}
                            {items.total > 2 && <div className="text-[9px] text-muted-foreground pl-0.5">+{items.total - 2}</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="w-full lg:w-72 bg-white rounded-xl border shadow-sm p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xs">
                {selectedDay ? `${DOW[new Date(year, month, selectedDay).getDay()]}, ${selectedDay} de ${MONTH_NAMES[month]}` : "Selecione um dia"}
              </h3>
              {selectedDay && <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setNData(selDateStr); setShowModal(true); }}><Plus className="h-3.5 w-3.5" /></Button>}
            </div>

            {sel && sel.total === 0 && <p className="text-xs text-muted-foreground py-6 text-center">Nenhuma tarefa</p>}

            {sel && sel.agendamentos.map((a) => (
              <div key={a.id} className="rounded-lg border border-green-200 bg-green-50 p-2.5 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-green-700" />
                  <span className="font-medium text-green-800">{a.horario} — Visita</span>
                </div>
                <p className="text-gray-700"><strong>{a.nome}</strong> · {a.telefone}</p>
                {a.email && <p className="text-gray-500">✉ {a.email}</p>}
                {a.imovel_ref && <p className="text-gray-500">📍 {a.imovel_ref}</p>}
                <div className="flex gap-1 pt-0.5">
                  {a.status === "pendente" && (
                    <>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-blue-200 text-blue-700" onClick={() => changeAgStatus(a.id, "confirmado")}>Confirmar</Button>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-red-200 text-red-600" onClick={() => changeAgStatus(a.id, "cancelado")}>Cancelar</Button>
                    </>
                  )}
                  {a.status === "confirmado" && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 border-green-200 text-green-700" onClick={() => changeAgStatus(a.id, "realizado")}>Realizado</Button>
                  )}
                  <a href={`https://wa.me/55${a.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-green-300 px-1.5 py-0.5 text-[10px] font-medium text-green-700 hover:bg-green-100">
                    <Phone className="h-2.5 w-2.5" /> WhatsApp
                  </a>
                </div>
              </div>
            ))}

            {sel && sel.tarefas.map((t) => {
              const c = TIPO_CONFIG[t.tipo] || TIPO_CONFIG.ligacao;
              return (
                <div key={t.id} className={`rounded-lg border p-2.5 space-y-1 text-xs ${t.status === "concluida" ? "opacity-60 bg-gray-50" : c.bg}`}>
                  <div className="flex items-center gap-1.5">
                    <c.icon className={`h-3.5 w-3.5 ${c.color}`} />
                    <span className={`font-medium ${t.status === "concluida" ? "line-through text-gray-500" : "text-gray-900"}`}>
                      {t.hora && `${t.hora} — `}{t.titulo}
                    </span>
                  </div>
                  {t.cliente_nome && <p className="text-gray-500">🏢 {t.cliente_nome}</p>}
                  {t.notas && <p className="text-gray-500 italic">"{t.notas}"</p>}
                  {t.crucial && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600"><AlertTriangle className="h-2.5 w-2.5" /> CRUCIAL</span>}
                  <div className="flex gap-1 pt-0.5">
                    <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => toggleStatus(t.id, t.status)}>
                      <CheckCircle2 className="h-2.5 w-2.5" /> {t.status === "concluida" ? "Reabrir" : "Concluir"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-500" onClick={() => deleteTarefa(t.id)}>
                      <Trash2 className="h-2.5 w-2.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal Nova Tarefa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2"><PhoneCall className="h-5 w-5" /> Nova Tarefa</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo</label>
                <select value={nTipo} onChange={(e) => { setNTipo(e.target.value); setNTitulo(TIPO_CONFIG[e.target.value]?.label || ""); }}
                  className="w-full rounded-lg border px-3 py-2 text-sm bg-white">
                  {Object.entries(TIPO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Título *</label>
                <Input value={nTitulo} onChange={(e) => setNTitulo(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Cliente</label>
              <Input value={nCliente} onChange={(e) => setNCliente(e.target.value)} placeholder="Nome do cliente..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Data</label>
                <Input type="date" value={nData} onChange={(e) => setNData(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Hora</label>
                <Input type="time" value={nHora} onChange={(e) => setNHora(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Notas</label>
              <Textarea value={nNotas} onChange={(e) => setNNotas(e.target.value)} placeholder="Observações..." rows={3} className="resize-none" />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <span className="text-sm font-medium text-red-700 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Crucial</span>
              <div className="ml-auto"><Switch checked={nCrucial} onCheckedChange={setNCrucial} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button onClick={handleCreateTarefa} disabled={savingTarefa}>
                {savingTarefa ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Config */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end sm:justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfig(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md sm:mx-4 p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Configurar Agenda</h2>
              <button onClick={() => setShowConfig(false)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-muted-foreground">Configure seus dias e horários de trabalho.</p>
            <div className="space-y-3">
              {horarios.map((h, i) => (
                <div key={h.dia} className="flex items-center gap-3">
                  <Switch checked={h.ativo} onCheckedChange={(v) => { const n = [...horarios]; n[i] = { ...h, ativo: v }; setHorarios(n); }} />
                  <span className="w-10 text-sm font-semibold">{DIA_LABELS[h.dia]}</span>
                  {h.ativo ? (
                    <>
                      <Input type="time" value={h.inicio} className="w-28 h-9 text-sm" onChange={(e) => { const n = [...horarios]; n[i] = { ...h, inicio: e.target.value }; setHorarios(n); }} />
                      <span className="text-xs text-gray-400">até</span>
                      <Input type="time" value={h.fim} className="w-28 h-9 text-sm" onChange={(e) => { const n = [...horarios]; n[i] = { ...h, fim: e.target.value }; setHorarios(n); }} />
                    </>
                  ) : <span className="text-sm text-gray-400">Folga</span>}
                </div>
              ))}
            </div>
            <Button onClick={saveConfig} disabled={savingConfig} className="w-full">
              {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar horário"}
            </Button>
          </div>
        </div>
      )}
    </CorretorLayout>
  );
}
