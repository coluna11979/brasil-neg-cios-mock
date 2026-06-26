import { useEffect, useState, useRef } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Search, Send, Phone, Mail, ArrowLeft, MessageCircle, Building2,
  CheckCheck, Loader2, Smile, AlertCircle, Wifi, WifiOff, RefreshCw,
  Sparkles, ChevronDown, ChevronUp, TrendingUp, Target, DollarSign,
  BarChart3, Brain, PanelRightOpen, PanelRightClose, Flame,
  ThumbsUp, Snowflake, CheckCircle, Circle, Paperclip, ImageIcon,
  UserCircle, MapPin, Calendar, MessageSquare, UserPlus, X,
  Plus, Trash2, Clock, Eye,
} from "lucide-react";
import { callClaude } from "@/lib/anthropic";
import { checkInstanceStatus } from "@/lib/uazapi";
import { getLeadIntent, describeIntent, intentItemLabel } from "@/lib/leadIntent";
import { getAiPrompt } from "@/lib/aiPrompts";
import AdminLayout from "@/components/admin/AdminLayout";
import { getAllLeads, addLead, calculateLeadScore, getScoreLabel, updateLeadStatus, type Lead } from "@/stores/leadStore";
import { useSalesPipelines, useUpdateLeadStage } from "@/hooks/useSalesPipelines";
import ImovelPickerModal from "@/components/admin/ImovelPickerModal";
import { useSearchParams } from "react-router-dom";

type NegocioData = {
  titulo: string;
  preco: number | null;
  faturamento_mensal: number | null;
  categoria: string | null;
  cidade: string | null;
};

type InvestorProfile = {
  perfil: string;
  icone: string;
  descricao: string;
  gatilhos: string[];
};

function formatCurrency(val: number) {
  if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `R$ ${(val / 1_000).toFixed(0)}K`;
  return `R$ ${val.toLocaleString("pt-BR")}`;
}
import {
  getMessagesByLead,
  sendMessage,
  markMessagesAsRead,
  type LeadMessage,
} from "@/stores/messageStore";
import { supabase } from "@/lib/supabase";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hoje";
  if (date.toDateString() === yesterday.toDateString()) return "Ontem";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function renderMessageContent(text: string) {
  // Imagem
  if (text.startsWith("[IMAGE]:")) {
    const url = text.replace("[IMAGE]:", "");
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img
          src={url}
          alt="imagem"
          className="max-w-[220px] rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      </a>
    );
  }
  // Mídia legada (formato antigo de versões anteriores)
  if (text.includes("[tipo: media]") || text.includes("Mídia recebida")) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground italic text-sm">
        <ImageIcon className="h-4 w-4 shrink-0" />📸 Mídia recebida
      </span>
    );
  }
  // Álbum / mídia especial
  if (text.startsWith("📸") || text.toLowerCase().startsWith("album:")) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground italic text-sm">
        <ImageIcon className="h-4 w-4 shrink-0" />
        {text}
      </span>
    );
  }
  // Áudio (com transcrição opcional)
  if (text.startsWith("[AUDIO]:")) {
    const raw = text.replace("[AUDIO]:", "");
    const sepIdx = raw.indexOf("|TRANSCRIPT:");
    const url = sepIdx >= 0 ? raw.slice(0, sepIdx) : raw;
    const transcript = sepIdx >= 0 ? raw.slice(sepIdx + 12) : null;
    return (
      <div className="flex flex-col gap-1.5">
        <audio controls src={url} className="max-w-[240px] rounded-lg" />
        {transcript && (
          <p className="text-xs text-muted-foreground italic leading-relaxed border-l-2 border-muted-foreground/30 pl-2">
            🎤 "{transcript}"
          </p>
        )}
      </div>
    );
  }
  // Vídeo enviado pelo corretor
  if (text.startsWith("[VIDEO]:")) {
    const url = text.replace("[VIDEO]:", "");
    return (
      <video controls src={url} className="max-w-[240px] rounded-xl" />
    );
  }
  // Arquivo/PDF enviado pelo corretor
  if (text.startsWith("[FILE]:")) {
    const raw = text.replace("[FILE]:", "");
    const sepIdx = raw.lastIndexOf("|");
    const url = sepIdx >= 0 ? raw.slice(0, sepIdx) : raw;
    const name = sepIdx >= 0 ? raw.slice(sepIdx + 1) : "arquivo";
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 hover:bg-muted transition-colors text-sm">
        <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate max-w-[160px]">{name}</span>
      </a>
    );
  }
  // Vídeo / áudio / arquivo recebido do lead (sem URL)
  if (text.startsWith("🎥") || text.startsWith("🎤") || text.startsWith("📎")) {
    return <span className="text-muted-foreground italic text-sm">{text}</span>;
  }
  // Texto normal com quebras de linha
  return (
    <span className="whitespace-pre-wrap break-words">{text}</span>
  );
}

function formatPhoneDisplay(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return phone;
}

const WhatsAppCRM = () => {
  usePageTitle("Admin - Mensagens");
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle" | "sent" | "no_phone" | "error">("idle");
  const [sendError, setSendError] = useState<string>("");
  const [instanceStatus, setInstanceStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [instanceStatusMsg, setInstanceStatusMsg] = useState<string>("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);
  // Intel sidebar
  const [showIntel, setShowIntel] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContact, setNewContact] = useState({ nome: "", telefone: "", email: "", mensagem: "" });
  const [savingContact, setSavingContact] = useState(false);
  const [showEditLead, setShowEditLead] = useState(false);
  const [editLeadForm, setEditLeadForm] = useState({ nome: "", telefone: "", email: "" });
  const [savingEditLead, setSavingEditLead] = useState(false);
  const [negocioData, setNegocioData] = useState<NegocioData | null>(null);
  const [loadingNegocio, setLoadingNegocio] = useState(false);
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile | null>(null);
  const [loadingInvestor, setLoadingInvestor] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<Lead["status"]>("novo");
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Cadência
  const [cadenciaEstagio, setCadenciaEstagio] = useState<string | null>(null);
  const [cadenciaMsg, setCadenciaMsg] = useState("");
  const [cadenciaLoading, setCadenciaLoading] = useState(false);
  // Sender profiles map: id → nome
  const [senderProfiles, setSenderProfiles] = useState<Record<string, string>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  // Corretores map: id → nome (para o header e intel)
  const [corretoresMap, setCorretoresMap] = useState<Record<string, string>>({});
  // Última atividade por lead (lead_id → ISO timestamp) para ordenar a lista
  const [lastMsgMap, setLastMsgMap] = useState<Record<string, string>>({});

  const loadLastMsgMap = async () => {
    const { data } = await supabase
      .from("lead_messages")
      .select("lead_id, created_at")
      .order("created_at", { ascending: false })
      .limit(3000);
    if (!data) return;
    const map: Record<string, string> = {};
    for (const m of data as { lead_id: string; created_at: string }[]) {
      if (!map[m.lead_id]) map[m.lead_id] = m.created_at; // primeira ocorrência = mais recente
    }
    setLastMsgMap(map);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
    supabase.from("profiles").select("id, nome").eq("role", "corretor").then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((p: { id: string; nome: string }) => { map[p.id] = p.nome; });
        setCorretoresMap(map);
      }
    });
    getAllLeads().then((data) => {
      setLeads(data);
      setLoading(false);
      // Abre o lead se vier ?leadId= na URL (vindo do Pipeline)
      const leadIdParam = searchParams.get("leadId");
      if (leadIdParam) {
        const found = data.find((l) => l.id === leadIdParam);
        if (found) setSelectedLead(found);
      }
    });
    loadLastMsgMap();
    // Checa status da instância Uazapi ao abrir
    checkInstanceStatus().then(({ connected, status }) => {
      setInstanceStatus(connected ? "connected" : "disconnected");
      setInstanceStatusMsg(status || "");
    });
  }, []);

  const recheckInstance = () => {
    setInstanceStatus("checking");
    setInstanceStatusMsg("");
    checkInstanceStatus().then(({ connected, status }) => {
      setInstanceStatus(connected ? "connected" : "disconnected");
      setInstanceStatusMsg(status || "");
    });
  };

  useEffect(() => {
    if (selectedLead) setCurrentStatus(selectedLead.status || "novo");
  }, [selectedLead]);

  const openEditLead = () => {
    if (!selectedLead) return;
    setEditLeadForm({
      nome: selectedLead.nome || "",
      telefone: selectedLead.telefone || "",
      email: selectedLead.email || "",
    });
    setShowEditLead(true);
  };
  const handleSaveEditLead = async () => {
    if (!selectedLead) return;
    const nome = editLeadForm.nome.trim();
    if (!nome) { alert("Nome é obrigatório"); return; }
    setSavingEditLead(true);
    const updates = {
      nome,
      telefone: editLeadForm.telefone.trim() || null,
      email: editLeadForm.email.trim() || null,
    };
    const { error } = await supabase.from("leads").update(updates).eq("id", selectedLead.id);
    if (error) {
      alert("Erro ao salvar: " + error.message);
      setSavingEditLead(false);
      return;
    }
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, ...updates } : l));
    setSelectedLead((p) => p ? { ...p, ...updates } : p);
    setSavingEditLead(false);
    setShowEditLead(false);
  };

  const handleStatusChange = async (status: Lead["status"]) => {
    if (!selectedLead) return;
    setCurrentStatus(status);
    await updateLeadStatus(selectedLead.id, status);
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, status } : l));
  };

  // === Pipelines: transferir o lead entre pipelines ===
  const { data: pipelines = [] } = useSalesPipelines();
  const updateStageMut = useUpdateLeadStage();

  // === Múltiplos negócios (lead_negocios junction) ===
  const [showImovelPicker, setShowImovelPicker] = useState(false);
  const [leadNegocios, setLeadNegocios] = useState<{ id: string; negocio_id: string; titulo: string; categoria?: string | null; preco?: number | null }[]>([]);
  const [loadingNegocios, setLoadingNegocios] = useState(false);

  const loadLeadNegocios = async (leadId: string) => {
    setLoadingNegocios(true);
    const { data } = await supabase
      .from("lead_negocios")
      .select("id, negocio_id, negocios(titulo, categoria, preco)")
      .eq("lead_id", leadId);
    setLeadNegocios((data || []).map((r: any) => ({
      id: r.id,
      negocio_id: r.negocio_id,
      titulo: r.negocios?.titulo || "Sem título",
      categoria: r.negocios?.categoria,
      preco: r.negocios?.preco,
    })));
    setLoadingNegocios(false);
  };

  useEffect(() => {
    if (selectedLead) loadLeadNegocios(selectedLead.id);
    else setLeadNegocios([]);
  }, [selectedLead?.id]);

  // Fetch negocio data when lead's linked negocios change (use first one for ficha)
  useEffect(() => {
    const firstNegocioId = leadNegocios[0]?.negocio_id || selectedLead?.negocio_id;
    if (!firstNegocioId) {
      setNegocioData(null);
      setInvestorProfile(null);
      return;
    }
    setLoadingNegocio(true);
    setInvestorProfile(null);
    supabase
      .from("negocios")
      .select("titulo, preco, faturamento_mensal, categoria, cidade")
      .eq("id", firstNegocioId)
      .single()
      .then(({ data }) => {
        setNegocioData(data ?? null);
        setLoadingNegocio(false);
      });
  }, [leadNegocios, selectedLead?.negocio_id]);

  const handleAdicionarNegocio = async (negocioId: string, titulo: string) => {
    if (!selectedLead) return;
    const { error } = await supabase.from("lead_negocios").insert({ lead_id: selectedLead.id, negocio_id: negocioId });
    if (error && error.code === "23505") return; // duplicate
    if (!error) {
      await supabase.from("leads").update({ negocio_id: negocioId, negocio_titulo: titulo }).eq("id", selectedLead.id);
      setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, negocio_id: negocioId, negocio_titulo: titulo } : l));
      setSelectedLead((p) => p ? { ...p, negocio_id: negocioId, negocio_titulo: titulo } : p);
    }
    await loadLeadNegocios(selectedLead.id);
    setShowImovelPicker(false);
  };
  const handleRemoverNegocio = async (junctionId: string) => {
    if (!selectedLead) return;
    await supabase.from("lead_negocios").delete().eq("id", junctionId);
    await loadLeadNegocios(selectedLead.id);
  };

  // === Agendamentos de visita ===
  const [agendamentos, setAgendamentos] = useState<{ id: string; data: string; horario: string; notas: string | null; status: string; negocio_id: string | null; negocio_titulo?: string }[]>([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(false);
  const [showAgendarModal, setShowAgendarModal] = useState(false);
  const [agendarForm, setAgendarForm] = useState({ data: "", hora: "", negocio_id: "", observacao: "" });
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false);

  const loadAgendamentos = async (leadId: string) => {
    setLoadingAgendamentos(true);
    const { data } = await supabase
      .from("agendamentos")
      .select("id, data, horario, notas, status, negocio_id, negocios(titulo)")
      .eq("lead_id", leadId)
      .order("data", { ascending: true })
      .order("horario", { ascending: true });
    setAgendamentos((data || []).map((r: any) => ({
      id: r.id,
      data: r.data,
      horario: r.horario,
      notas: r.notas,
      status: r.status,
      negocio_id: r.negocio_id,
      negocio_titulo: r.negocios?.titulo,
    })));
    setLoadingAgendamentos(false);
  };

  useEffect(() => {
    if (selectedLead) loadAgendamentos(selectedLead.id);
    else setAgendamentos([]);
  }, [selectedLead?.id]);

  const handleSalvarAgendamento = async () => {
    if (!selectedLead || !agendarForm.data || !agendarForm.hora) return;
    setSalvandoAgendamento(true);
    const negocio = leadNegocios.find((n) => n.negocio_id === agendarForm.negocio_id);
    const { data: inserted, error } = await supabase.from("agendamentos").insert({
      lead_id: selectedLead.id,
      negocio_id: agendarForm.negocio_id || null,
      nome: selectedLead.nome,
      telefone: selectedLead.telefone || "",
      email: selectedLead.email || null,
      imovel_ref: negocio?.titulo || selectedLead.negocio_titulo || null,
      data: agendarForm.data,
      horario: agendarForm.hora,
      status: "pendente",
      notas: agendarForm.observacao.trim() || null,
    }).select("id").single();
    if (error) {
      alert("Erro ao agendar: " + error.message);
      setSalvandoAgendamento(false);
      return;
    }

    // Envia email de confirmacao se o lead tem email
    let emailMsg = "";
    if (selectedLead.email && inserted?.id) {
      try {
        const { data: emailRes, error: emailErr } = await supabase.functions.invoke("send-agendamento-email", {
          body: { agendamento_id: inserted.id },
        });
        if (emailErr || !emailRes?.success) {
          emailMsg = `\n\nObs: agendamento salvo, mas email NÃO enviado: ${emailRes?.error || emailErr?.message || "erro desconhecido"}`;
          console.error("[CRM] Falha envio email agendamento:", emailRes, emailErr);
        } else {
          emailMsg = `\n\n📧 Email de confirmação enviado para ${emailRes.sent_to}`;
        }
      } catch (e) {
        emailMsg = `\n\nObs: agendamento salvo, mas falhou ao enviar email: ${e instanceof Error ? e.message : String(e)}`;
      }
    } else if (!selectedLead.email) {
      emailMsg = "\n\n⚠️ Lead sem email — clique no nome dele no topo do chat pra adicionar e reenviar.";
    }

    await loadAgendamentos(selectedLead.id);
    setShowAgendarModal(false);
    setAgendarForm({ data: "", hora: "", negocio_id: "", observacao: "" });
    setSalvandoAgendamento(false);
    if (emailMsg) alert(`Visita agendada!${emailMsg}`);
  };

  const handleCancelarAgendamento = async (agId: string) => {
    await supabase.from("agendamentos").update({ status: "cancelado", updated_at: new Date().toISOString() }).eq("id", agId);
    if (selectedLead) await loadAgendamentos(selectedLead.id);
  };
  const handleTransferPipeline = async (pipelineId: string) => {
    if (!selectedLead) return;
    const pipe = pipelines.find((p) => p.id === pipelineId);
    if (!pipe || pipe.stages.length === 0) return;
    const firstStage = pipe.stages[0];
    await updateStageMut.mutateAsync({
      leadId: selectedLead.id,
      stageId: firstStage.id,
      pipelineId: pipe.id,
    });
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, pipeline_id: pipe.id, stage_id: firstStage.id } : l));
    setSelectedLead((p) => p ? { ...p, pipeline_id: pipe.id, stage_id: firstStage.id } : p);
  };
  const handleChangeStage = async (stageId: string) => {
    if (!selectedLead || !selectedLead.pipeline_id) return;
    const pipe = pipelines.find((p) => p.id === selectedLead.pipeline_id);
    const stage = pipe?.stages.find((s) => s.id === stageId);
    if (!pipe || !stage) return;
    await updateStageMut.mutateAsync({
      leadId: selectedLead.id, stageId, pipelineId: pipe.id,
      isWon: stage.is_won, isLost: stage.is_lost,
    });
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, stage_id: stageId } : l));
    setSelectedLead((p) => p ? { ...p, stage_id: stageId } : p);
  };

  const handleInvestorAnalysis = async () => {
    if (!selectedLead || loadingInvestor) return;
    setLoadingInvestor(true);
    setInvestorProfile(null);
    try {
      const negInfo = negocioData
        ? `Negócio: ${negocioData.titulo}, Preço: R$ ${negocioData.preco?.toLocaleString("pt-BR") ?? "N/A"}, Faturamento mensal: R$ ${negocioData.faturamento_mensal?.toLocaleString("pt-BR") ?? "N/A"}, Categoria: ${negocioData.categoria ?? "N/A"}`
        : `Interesse em: ${selectedLead.negocio_titulo || selectedLead.galeria_nome || "não especificado"}`;

      const prompt = `Você é um especialista em M&A de pequenas e médias empresas no Brasil. Analise esse lead e retorne um JSON válido.

Lead:
- Nome: ${selectedLead.nome}
- Mensagem: ${selectedLead.mensagem || "não informada"}
- Origem: ${selectedLead.origem}
- ${negInfo}

Classifique o perfil do investidor e gere 3 gatilhos financeiros de alto impacto para o corretor usar na conversa.

Retorne APENAS este JSON (sem markdown, sem explicação):
{
  "perfil": "Investidor Financeiro" | "Empreendedor Operacional" | "Empresário Estratégico" | "Comprador de Primeira Viagem",
  "icone": "💰" | "🚀" | "🏢" | "🌱",
  "descricao": "frase curta explicando o perfil (máx 60 chars)",
  "gatilhos": ["gatilho 1 ROI/financeiro", "gatilho 2 operacional", "gatilho 3 urgência/escassez"]
}`;

      const result = await callClaude(prompt);
      const json = result.match(/\{[\s\S]*\}/)?.[0];
      if (json) {
        const parsed = JSON.parse(json);
        setInvestorProfile(parsed);
      }
    } catch {
      setInvestorProfile({
        perfil: "Perfil não identificado",
        icone: "🎯",
        descricao: "Analise a conversa para classificar",
        gatilhos: ["Destaque o ROI mensal do negócio", "Mencione o payback e retorno garantido", "Use urgência: outros interessados"],
      });
    }
    setLoadingInvestor(false);
  };

  useEffect(() => {
    if (!selectedLead) return;
    setLoadingMessages(true);
    setAiSuggestions([]);
    setShowAi(false);
    getMessagesByLead(selectedLead.id).then(async (msgs) => {
      setMessages(msgs);
      setLoadingMessages(false);
      markMessagesAsRead(selectedLead.id);
      // Carrega nomes dos remetentes únicos
      const ids = [...new Set(msgs.map((m) => m.sender_id).filter(Boolean))] as string[];
      if (ids.length > 0) {
        const { data } = await supabase.from("profiles").select("id, nome").in("id", ids);
        if (data) {
          const map: Record<string, string> = { ...senderProfiles };
          data.forEach((p: { id: string; nome: string }) => { map[p.id] = p.nome; });
          setSenderProfiles(map);
        }
      }
    });
  }, [selectedLead]);

  const handleAiSuggestions = async () => {
    if (!selectedLead || aiLoading) return;
    setAiLoading(true);
    setShowAi(true);
    setAiSuggestions([]);
    try {
      const historico = messages
        .slice(-10)
        .map((m) => `${m.sender_type === "corretor" ? "Corretor" : "Lead"}: ${m.message}`)
        .join("\n");

      const intent = getLeadIntent(selectedLead);
      const promptBase = await getAiPrompt("sugestoes_chat", {
        nome: selectedLead.nome,
        origem: selectedLead.origem,
        item_label: intentItemLabel(intent, selectedLead),
        item: selectedLead.negocio_titulo || selectedLead.galeria_nome || "não especificado",
        mensagem: selectedLead.mensagem || "não informada",
        postura: describeIntent(intent, selectedLead),
        historico: historico || "(sem mensagens ainda)",
      });
      const prompt = `${promptBase}\n\nResponda APENAS com as 3 sugestões, uma por linha, sem numeração, sem prefixo, sem explicação.`;

      const result = await callClaude(prompt);
      const sugestoes = result
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 10)
        .slice(0, 3);
      setAiSuggestions(sugestoes);
    } catch {
      setAiSuggestions(["Não foi possível gerar sugestões agora. Tente novamente."]);
    }
    setAiLoading(false);
  };

  // Detecta estágio da cadência quando lead/mensagens mudam
  useEffect(() => {
    if (!selectedLead) { setCadenciaEstagio(null); setCadenciaMsg(""); return; }
    const outbound = messages.filter((m) => m.sender_type === "corretor");
    const inbound = messages.filter((m) => m.sender_type === "lead");
    if (messages.length === 0) {
      setCadenciaEstagio("boas-vindas");
    } else if (outbound.length > 0 && inbound.length === 0) {
      const lastOut = outbound[outbound.length - 1];
      const hrs = (Date.now() - new Date(lastOut.created_at).getTime()) / 3600000;
      if (hrs >= 144) setCadenciaEstagio("urgencia");
      else if (hrs >= 60) setCadenciaEstagio("reengajamento");
      else if (hrs >= 20) setCadenciaEstagio("followup");
      else setCadenciaEstagio(null);
    } else if (inbound.length > 0) {
      setCadenciaEstagio("qualificacao");
    } else {
      setCadenciaEstagio(null);
    }
    setCadenciaMsg("");
  }, [selectedLead?.id, messages.length]);

  type CadenciaMeta = { label: string; emoji: string; color: string };
  const CADENCIA_META: Record<string, CadenciaMeta> = {
    "boas-vindas": { label: "Boas-vindas", emoji: "👋", color: "bg-emerald-50 border-emerald-200" },
    "followup":    { label: "Follow-up (Dia 1)", emoji: "📬", color: "bg-blue-50 border-blue-200" },
    "reengajamento": { label: "Reengajamento (Dia 3)", emoji: "🔄", color: "bg-amber-50 border-amber-200" },
    "urgencia":    { label: "Última tentativa (Dia 7)", emoji: "🚨", color: "bg-red-50 border-red-200" },
    "qualificacao": { label: "Qualificação", emoji: "🎯", color: "bg-violet-50 border-violet-200" },
  };

  /** Monta o cabeçalho comum + busca template do banco (ai_prompts). */
  const getCadenciaPrompt = async (estagio: string): Promise<string> => {
    if (!selectedLead) return "";
    const intent = getLeadIntent(selectedLead);
    const itemLabel = intentItemLabel(intent, selectedLead);
    const interesse = selectedLead.negocio_titulo || selectedLead.galeria_nome || "negócio à venda";
    const cabecalho = `Você é consultor especialista da plataforma NegociaAky (compra e venda de negócios, imóveis comerciais, galerias e franquias).

# Lead
- Nome: ${selectedLead.nome}
- Origem do cadastro: ${selectedLead.origem || "não informada"}
- ${itemLabel}: ${interesse}
- Mensagem original do lead: "${selectedLead.mensagem || "nenhuma"}"

# IMPORTANTE — Postura correta (LEIA COM ATENÇÃO)
${describeIntent(intent, selectedLead)}
`;

    const key =
      estagio === "boas-vindas"    ? "cadencia_boas_vindas" :
      estagio === "followup"       ? "cadencia_followup" :
      estagio === "reengajamento"  ? "cadencia_reengajamento" :
      estagio === "urgencia"       ? "cadencia_urgencia" :
      estagio === "qualificacao"   ? "cadencia_qualificacao" :
      "";
    if (!key) return "";
    return await getAiPrompt(key, { cabecalho });
  };

  const gerarMensagemCadencia = async () => {
    if (!cadenciaEstagio || !selectedLead || cadenciaLoading) return;
    setCadenciaLoading(true);
    setCadenciaMsg("");
    try {
      const prompt = await getCadenciaPrompt(cadenciaEstagio);
      const msg = await callClaude(prompt);
      setCadenciaMsg(msg.trim());
    } catch {
      setCadenciaMsg("Não foi possível gerar a mensagem. Tente novamente.");
    }
    setCadenciaLoading(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription — atualiza instantaneamente quando chega mensagem nova
  useEffect(() => {
    if (!selectedLead) return;
    const leadId = selectedLead.id;

    const refresh = async () => {
      const msgs = await getMessagesByLead(leadId);
      setMessages((prev) => {
        // Preserva bolhas otimistas (pending) que ainda não estão no banco
        const pending = prev.filter((m) => (m as { pending?: boolean }).pending);
        const merged = [...msgs, ...pending];
        return prev.length === merged.length ? prev : merged;
      });
      markMessagesAsRead(leadId);
      loadLastMsgMap();
    };

    const channel = supabase
      .channel(`admin_lead_messages:${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lead_messages",
          filter: `lead_id=eq.${leadId}`,
        },
        refresh
      )
      .subscribe();

    // Fallback por polling: garante atualização mesmo se o Realtime cair (ws 401)
    const poll = setInterval(refresh, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [selectedLead]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedLead || sending) return;

    const text = newMessage.trim();
    const leadId = selectedLead.id;
    const nowIso = new Date().toISOString();
    const tempId = `temp-${Date.now()}`;

    // ── Envio otimista: bolha aparece na hora (padrão WhatsApp) ──
    const optimistic: LeadMessage & { pending?: boolean } = {
      id: tempId,
      lead_id: leadId,
      sender_type: "corretor",
      sender_id: currentUserId,
      message: text,
      is_read: false,
      created_at: nowIso,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setNewMessage("");
    setSendStatus("idle");
    setSending(true);
    // Sobe a conversa pro topo imediatamente
    setLastMsgMap((prev) => ({ ...prev, [leadId]: nowIso }));

    const result = await sendMessage(
      leadId,
      text,
      "corretor",
      selectedLead.telefone || undefined
    );

    if (result.saved) {
      // Reconcilia com o banco (troca o temp pelo registro real)
      const msgs = await getMessagesByLead(leadId);
      setMessages(msgs);
      const status = result.whatsapp === "sent" ? "sent" : result.whatsapp === "no_phone" ? "no_phone" : "error";
      setSendStatus(status);
      if (status === "error") {
        setSendError(result.error || "Falha na API Uazapi — veja o console (F12) para detalhes");
      }
      setTimeout(() => { setSendStatus("idle"); setSendError(""); }, 6000);
    } else {
      // Falhou: remove a bolha otimista e restaura o texto
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(text);
      setSendStatus("error");
      setSendError(result.error || "Erro ao salvar mensagem");
    }
    setSending(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLead) return;

    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|3gp)$/i.test(file.name);
    const isDoc = file.type === "application/pdf" || file.name.endsWith(".pdf");

    if (!isImage && !isAudio && !isVideo && !isDoc) {
      alert("Tipo não suportado. Envie imagem, áudio, vídeo (mp4/mov) ou PDF.");
      return;
    }

    // Limite por tipo: vídeo aceita até 50MB (WhatsApp via Uazapi)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Arquivo muito grande! Máximo ${isVideo ? "50" : "25"}MB. Seu arquivo: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
      return;
    }

    setUploadingFile(true);
    setSendStatus("idle");
    try {
      const ext = file.name.split(".").pop() || "bin";
      const folder = isImage ? "crm/images" : isAudio ? "crm/audio" : isVideo ? "crm/video" : "crm/docs";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      // Vídeos sem MIME (alguns navegadores) → força video/mp4
      const contentType = file.type || (isVideo ? "video/mp4" : "application/octet-stream");
      const { error: uploadError } = await supabase.storage.from("lead-images").upload(path, file, { contentType, cacheControl: "3600", upsert: false });
      if (uploadError) throw new Error(`Upload: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from("lead-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      let msgContent: string;
      if (isImage) msgContent = `[IMAGE]:${publicUrl}`;
      else if (isAudio) msgContent = `[AUDIO]:${publicUrl}`;
      else if (isVideo) msgContent = `[VIDEO]:${publicUrl}`;
      else msgContent = `[FILE]:${publicUrl}|${file.name}`;

      const result = await sendMessage(selectedLead.id, msgContent, "corretor", selectedLead.telefone || undefined);
      const updated = await getMessagesByLead(selectedLead.id);
      setMessages(updated);

      if (result.saved) {
        const status = result.whatsapp === "sent" ? "sent" : result.whatsapp === "no_phone" ? "no_phone" : result.whatsapp === "error" ? "error" : "idle";
        setSendStatus(status);
        if (status === "error") {
          setSendError(result.error || `Falha ao enviar ${isVideo ? "vídeo" : "arquivo"} via WhatsApp — veja o console (F12)`);
          console.error(`[CRM] WhatsApp falhou:`, result.error, result.debugInfo);
        }
        setTimeout(() => { setSendStatus("idle"); setSendError(""); }, 8000);
      }
    } catch (err) {
      console.error("[CRM] Erro ao enviar arquivo:", err);
      setSendStatus("error");
      setSendError(err instanceof Error ? err.message : "Erro ao enviar arquivo");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.nome.trim() || (!newContact.telefone.trim() && !newContact.email.trim())) return;
    setSavingContact(true);
    try {
      const ok = await addLead({
        nome: newContact.nome.trim(),
        telefone: newContact.telefone.trim(),
        email: newContact.email.trim() || "",
        mensagem: newContact.mensagem.trim() || "Contato cadastrado pelo CRM",
        origem: "crm",
      });
      if (ok) {
        const updated = await getAllLeads();
        setLeads(updated);
        const created = updated.find((l) => l.telefone === newContact.telefone.trim() && l.nome === newContact.nome.trim());
        if (created) setSelectedLead(created);
        setNewContact({ nome: "", telefone: "", email: "", mensagem: "" });
        setShowNewContact(false);
      } else {
        alert("Erro ao salvar contato. Tente novamente.");
      }
    } finally {
      setSavingContact(false);
    }
  };

  const [quickFilter, setQuickFilter] = useState<"all" | "today" | "pipeline" | "no_pipeline">("all");
  const [pipelineFilter, setPipelineFilter] = useState<string>("all");
  const filteredLeads = leads
    .filter((lead) => {
      if (pipelineFilter !== "all" && lead.pipeline_id !== pipelineFilter) return false;
      if (quickFilter === "today") {
        const last = lastMsgMap[lead.id] || lead.created_at;
        if (!last) return false;
        return new Date(last).toDateString() === new Date().toDateString();
      }
      if (quickFilter === "pipeline" && !lead.pipeline_id) return false;
      if (quickFilter === "no_pipeline" && lead.pipeline_id) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        lead.nome.toLowerCase().includes(q) ||
        (lead.email || "").toLowerCase().includes(q) ||
        (lead.telefone || "").includes(q) ||
        (lead.mensagem || "").toLowerCase().includes(q) ||
        (lead.negocio_titulo || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      // Conversa mais recente no topo (padrão WhatsApp).
      // Usa última mensagem; cai para created_at do lead se ainda não houver mensagens.
      const ta = new Date(lastMsgMap[a.id] || a.created_at || 0).getTime();
      const tb = new Date(lastMsgMap[b.id] || b.created_at || 0).getTime();
      return tb - ta;
    });

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  const groupedMessages: { date: string; msgs: LeadMessage[] }[] = [];
  let lastDate = "";
  for (const msg of messages) {
    const date = formatDate(msg.created_at);
    if (date !== lastDate) {
      groupedMessages.push({ date, msgs: [msg] });
      lastDate = date;
    } else {
      groupedMessages[groupedMessages.length - 1].msgs.push(msg);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  // Computed financial metrics
  const roi = negocioData?.preco && negocioData?.faturamento_mensal
    ? ((negocioData.faturamento_mensal * 12) / negocioData.preco * 100).toFixed(1)
    : null;
  const payback = negocioData?.preco && negocioData?.faturamento_mensal
    ? Math.round(negocioData.preco / negocioData.faturamento_mensal)
    : null;
  const multiplo = negocioData?.preco && negocioData?.faturamento_mensal
    ? (negocioData.preco / (negocioData.faturamento_mensal * 12)).toFixed(1)
    : null;

  const score = selectedLead ? calculateLeadScore(selectedLead) : 0;
  const scoreInfo = getScoreLabel(score);

  const STATUS_OPTIONS: { value: Lead["status"]; label: string; color: string }[] = [
    { value: "novo", label: "Novo", color: "bg-blue-100 text-blue-700" },
    { value: "em-andamento", label: "Em andamento", color: "bg-amber-100 text-amber-700" },
    { value: "convertido", label: "Convertido", color: "bg-green-100 text-green-700" },
    { value: "perdido", label: "Perdido", color: "bg-red-100 text-red-700" },
  ];

  return (
    <AdminLayout>
      {/* Modal Novo Contato */}
      {showNewContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                <p className="font-display font-bold text-foreground">Novo Contato</p>
              </div>
              <button onClick={() => setShowNewContact(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateContact} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Nome <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newContact.nome}
                  onChange={(e) => setNewContact((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome completo"
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <p className="text-[10px] text-muted-foreground -mt-2">Informe ao menos WhatsApp <strong>ou</strong> e-mail.</p>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">WhatsApp</label>
                <input
                  type="tel"
                  value={newContact.telefone}
                  onChange={(e) => setNewContact((p) => ({ ...p, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Observação</label>
                <textarea
                  value={newContact.mensagem}
                  onChange={(e) => setNewContact((p) => ({ ...p, mensagem: e.target.value }))}
                  placeholder="Ex: cliente interessado em imóvel comercial..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowNewContact(false)} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={savingContact} className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Salvar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100dvh-7rem)] md:h-[calc(100vh-7rem)] rounded-none md:rounded-xl border-0 md:border border-border overflow-hidden bg-card shadow-sm -mx-4 md:mx-0">

        {/* Sidebar - Contact List */}
        <div className={`w-full md:w-[300px] flex-shrink-0 border-r border-border flex flex-col ${selectedLead ? "hidden md:flex" : "flex"}`}>
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <p className="font-display font-semibold text-foreground text-sm">Conversas</p>
              {/* Status Uazapi */}
              <button
                onClick={recheckInstance}
                title="Verificar conexão Uazapi"
                className="flex items-center gap-1.5 text-[10px] font-medium rounded-full px-2 py-0.5 border transition-colors hover:opacity-80"
                style={{
                  color: instanceStatus === "connected" ? "#15803d" : instanceStatus === "disconnected" ? "#b91c1c" : "#92400e",
                  backgroundColor: instanceStatus === "connected" ? "#f0fdf4" : instanceStatus === "disconnected" ? "#fef2f2" : "#fffbeb",
                  borderColor: instanceStatus === "connected" ? "#bbf7d0" : instanceStatus === "disconnected" ? "#fecaca" : "#fde68a",
                }}
              >
                {instanceStatus === "checking" ? (
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                ) : instanceStatus === "connected" ? (
                  <Wifi className="h-2.5 w-2.5" />
                ) : (
                  <WifiOff className="h-2.5 w-2.5" />
                )}
                {instanceStatus === "checking" ? "Verificando..." : instanceStatus === "connected" ? "Uazapi OK" : "Uazapi OFF"}
                <RefreshCw className="h-2 w-2 opacity-50" />
              </button>
              {instanceStatus === "disconnected" && instanceStatusMsg && (
                <p className="text-[9px] text-red-500 mt-0.5 max-w-[180px] leading-tight">{instanceStatusMsg}</p>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Nome, telefone, mensagem, imóvel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-8 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground/60"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowNewContact(true)}
                title="Novo contato"
                className="flex items-center justify-center rounded-lg bg-primary px-3 text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            </div>
            {/* Chips de filtro rápido */}
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
              {([
                { key: "all", label: "Todos", count: leads.length },
                { key: "today", label: "Hoje", count: leads.filter((l) => { const last = lastMsgMap[l.id] || l.created_at; return last && new Date(last).toDateString() === new Date().toDateString(); }).length },
                { key: "pipeline", label: "Em pipeline", count: leads.filter((l) => l.pipeline_id).length },
                { key: "no_pipeline", label: "Sem pipeline", count: leads.filter((l) => !l.pipeline_id).length },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setQuickFilter(f.key)}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors ${
                    quickFilter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {f.label}
                  <span className={`rounded-full px-1 text-[9px] ${quickFilter === f.key ? "bg-primary-foreground/20" : "bg-background/60"}`}>{f.count}</span>
                </button>
              ))}
            </div>
            {/* Filtro por pipeline */}
            <div className="mt-2">
              <select
                value={pipelineFilter}
                onChange={(e) => setPipelineFilter(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">📋 Todos os pipelines</option>
                {pipelines.map((p) => {
                  const count = leads.filter((l) => l.pipeline_id === p.id).length;
                  return (
                    <option key={p.id} value={p.id}>
                      {p.pipeline_type === "vendas" ? "💼" : "🎯"} {p.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
            {(searchQuery || quickFilter !== "all" || pipelineFilter !== "all") && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                {filteredLeads.length} {filteredLeads.length === 1 ? "resultado" : "resultados"}
              </p>
            )}
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/50">
            {filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                <MessageCircle className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhum lead encontrado</p>
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                    selectedLead?.id === lead.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                  }`}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                    {getInitials(lead.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-foreground truncate">{lead.nome}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{timeAgo(lead.criado_em)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {lead.telefone ? formatPhoneDisplay(lead.telefone) : lead.email || "Sem contato"}
                    </p>
                    {/* Corretor badge or WhatsApp indicator */}
                    {lead.corretor_id && corretoresMap[lead.corretor_id] ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-violet-600 mt-0.5">
                        <UserCircle className="h-2.5 w-2.5" />
                        {corretoresMap[lead.corretor_id]}
                      </span>
                    ) : lead.telefone ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-green-600 mt-0.5">
                        <Wifi className="h-2.5 w-2.5" />
                        WhatsApp disponível
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                        <WifiOff className="h-2.5 w-2.5" />
                        Sem telefone
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 min-w-0 flex flex-col ${!selectedLead ? "hidden md:flex" : "flex"}`}>
          {!selectedLead ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4">
                <MessageCircle className="h-10 w-10 opacity-30" />
              </div>
              <p className="font-display text-lg font-semibold">NegociaAky CRM</p>
              <p className="text-sm mt-1">Selecione um lead para iniciar a conversa</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
                <button onClick={() => setSelectedLead(null)} className="md:hidden p-1 rounded hover:bg-muted">
                  <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                  {getInitials(selectedLead.nome)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={openEditLead}
                      title="Editar nome, telefone e email do lead"
                      className="font-semibold text-foreground hover:text-primary hover:underline decoration-dotted underline-offset-4 transition-colors"
                    >
                      {selectedLead.nome}
                    </button>
                    {selectedLead.corretor_id && corretoresMap[selectedLead.corretor_id] && (
                      <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                        <UserCircle className="h-3 w-3" />
                        {corretoresMap[selectedLead.corretor_id]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedLead.telefone ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <Wifi className="h-3 w-3" />
                        {formatPhoneDisplay(selectedLead.telefone)}
                        <span className="text-muted-foreground">· WhatsApp conectado</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <WifiOff className="h-3 w-3" />
                        Sem telefone — apenas mensagem interna
                      </span>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  {selectedLead.telefone && (
                    <a
                      href={`https://wa.me/55${selectedLead.telefone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-green-50 hover:text-green-600 transition-colors"
                      title="Abrir WhatsApp"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                  {selectedLead.email && (
                    <a
                      href={`mailto:${selectedLead.email}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                      title="Enviar e-mail"
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={() => setShowIntel(!showIntel)}
                    title={showIntel ? "Fechar intel" : "Abrir intel do lead"}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${showIntel ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}
                  >
                    {showIntel ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Lead Context Bar */}
              {(selectedLead.negocio_titulo || selectedLead.galeria_nome) && (
                <div className="px-4 py-2 border-b border-border bg-accent/5 flex items-center gap-2 text-xs">
                  <Building2 className="h-3.5 w-3.5 text-accent" />
                  <span className="text-muted-foreground">Interesse em:</span>
                  <span className="font-medium text-foreground">
                    {selectedLead.negocio_titulo || selectedLead.galeria_nome}
                    {selectedLead.espaco_numero && ` — ${selectedLead.espaco_numero}`}
                  </span>
                </div>
              )}

              {/* Send status banner */}
              {sendStatus === "sent" && (
                <div className="px-4 py-2 bg-green-50 border-b border-green-100 flex items-center gap-2 text-xs text-green-700">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mensagem enviada via WhatsApp!
                </div>
              )}
              {sendStatus === "no_phone" && (
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-xs text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Salvo internamente. Lead sem telefone — não enviado pelo WhatsApp.
                </div>
              )}
              {sendStatus === "error" && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-start gap-2 text-xs text-red-700">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Salvo internamente, mas NÃO enviado pelo WhatsApp.</p>
                    {sendError && (
                      <p className="mt-0.5 text-red-600 font-mono break-all">{sendError}</p>
                    )}
                    <p className="mt-0.5 text-red-500">Abra o console do navegador (F12) para ver detalhes da resposta Uazapi.</p>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#f0f2f5]">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <p className="text-sm bg-white/80 rounded-lg px-4 py-2 shadow-sm text-muted-foreground">
                      Nenhuma mensagem ainda. Inicie a conversa!
                    </p>
                    {selectedLead.mensagem && (
                      <div className="max-w-sm">
                        <p className="text-xs text-muted-foreground text-center mb-2">Mensagem original do lead:</p>
                        <div className="bg-[#e2f0cb] rounded-lg p-3 shadow-sm text-sm text-foreground italic">
                          "{selectedLead.mensagem}"
                        </div>
                      </div>
                    )}
                    {selectedLead.telefone && (
                      <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
                        📱 Mensagens serão enviadas automaticamente para {formatPhoneDisplay(selectedLead.telefone)}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    {selectedLead.mensagem && (
                      <div className="flex justify-center mb-4">
                        <div className="bg-[#e2f0cb] rounded-lg px-3 py-1.5 text-xs text-muted-foreground shadow-sm max-w-xs text-center">
                          Lead capturado: "{selectedLead.mensagem}"
                        </div>
                      </div>
                    )}
                    {groupedMessages.map((group) => (
                      <div key={group.date}>
                        <div className="flex items-center justify-center my-3">
                          <span className="bg-white/90 rounded-lg px-3 py-1 text-xs text-muted-foreground shadow-sm">
                            {group.date}
                          </span>
                        </div>
                        {group.msgs.map((msg) => {
                          const isOutbound = msg.sender_type === "corretor";
                          const isMe = msg.sender_id === currentUserId;
                          const senderName = isOutbound
                            ? (isMe ? "Você" : msg.sender_id ? (senderProfiles[msg.sender_id] || "Corretor") : "Corretor")
                            : null;
                          return (
                            <div
                              key={msg.id}
                              className={`flex mb-2 ${isOutbound ? "justify-end" : "justify-start"}`}
                            >
                              <div className={`max-w-[75%] ${isOutbound ? "items-end" : "items-start"} flex flex-col`}>
                                {isOutbound && senderName && (
                                  <span className={`text-[10px] font-semibold mb-0.5 px-1 ${isMe ? "text-green-700" : "text-violet-600"}`}>
                                    {isMe ? "Você (Admin)" : `↩ ${senderName}`}
                                  </span>
                                )}
                                <div
                                  className={`rounded-lg px-3 py-2 shadow-sm ${
                                    isOutbound
                                      ? isMe
                                        ? "bg-[#d9fdd3] rounded-tr-none"
                                        : "bg-[#e9d8fd] rounded-tr-none"
                                      : "bg-white rounded-tl-none"
                                  }`}
                                >
                                  {renderMessageContent(msg.message)}
                                  <div className="flex items-center justify-end gap-1 mt-1">
                                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                                    {isOutbound && (
                                      <CheckCheck className={`h-3.5 w-3.5 ${msg.is_read ? "text-blue-500" : "text-muted-foreground/50"}`} />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Cadência de Vendas */}
              {cadenciaEstagio && CADENCIA_META[cadenciaEstagio] && (
                <div className={`mx-4 mb-2 mt-1 rounded-xl border ${CADENCIA_META[cadenciaEstagio].color} p-3`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{CADENCIA_META[cadenciaEstagio].emoji}</span>
                      <span className="text-xs font-semibold text-foreground">
                        Cadência: {CADENCIA_META[cadenciaEstagio].label}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={gerarMensagemCadencia}
                      disabled={cadenciaLoading}
                      className="flex items-center gap-1 rounded-lg bg-white border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {cadenciaLoading
                        ? <><Loader2 className="h-3 w-3 animate-spin" />Gerando...</>
                        : <><Sparkles className="h-3 w-3 text-primary" />Gerar mensagem</>}
                    </button>
                  </div>
                  {cadenciaMsg && (
                    <>
                      <p className="text-xs text-foreground leading-relaxed mb-2 bg-white/60 rounded-lg px-3 py-2 border border-white/80">
                        {cadenciaMsg}
                      </p>
                      <button
                        type="button"
                        onClick={() => { setNewMessage(cadenciaMsg); setCadenciaMsg(""); }}
                        className="flex items-center gap-1.5 rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:opacity-90 transition-opacity"
                      >
                        <Send className="h-3 w-3" />
                        Usar esta mensagem
                      </button>
                    </>
                  )}
                  {!cadenciaMsg && !cadenciaLoading && (
                    <p className="text-xs text-muted-foreground">
                      Clique em "Gerar mensagem" para a IA criar uma mensagem personalizada para este estágio.
                    </p>
                  )}
                </div>
              )}

              {/* IA7 — Sugestões IA */}
              <div className="border-t border-border bg-gradient-to-r from-primary/5 to-transparent">
                <button
                  type="button"
                  onClick={showAi ? () => setShowAi(false) : handleAiSuggestions}
                  className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sugestões IA para responder
                  </span>
                  {showAi ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
                </button>

                {showAi && (
                  <div className="px-4 pb-3 space-y-2">
                    {aiLoading ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Gerando sugestões personalizadas...
                      </div>
                    ) : aiSuggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setNewMessage(s); setShowAi(false); }}
                        className="w-full text-left rounded-lg border border-primary/20 bg-card px-3 py-2 text-xs text-foreground hover:bg-primary/5 hover:border-primary/40 transition-colors leading-relaxed"
                      >
                        {s}
                      </button>
                    ))}
                    {!aiLoading && aiSuggestions.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAiSuggestions}
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <RefreshCw className="h-3 w-3" /> Gerar novas sugestões
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSend} className="flex items-center gap-1.5 md:gap-2 px-2 md:px-4 py-2 md:py-3 border-t border-border bg-muted/30 pb-[max(0.5rem,env(safe-area-inset-bottom))] w-full min-w-0">
                <input type="file" ref={fileInputRef} accept="image/*,audio/*,video/*,.pdf" className="hidden" onChange={handleFileSelect} />
                <button type="button" className="hidden md:flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0">
                  <Smile className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFile}
                  title="Enviar arquivo"
                  className="flex h-9 w-9 md:h-9 md:w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors shrink-0 disabled:opacity-50"
                >
                  {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                </button>
                <input
                  type="text"
                  placeholder={selectedLead.telefone ? "Mensagem..." : "Mensagem interna..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 min-w-0 rounded-full md:rounded-lg border border-border bg-card px-3 md:px-4 py-2 md:py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${
                    selectedLead.telefone ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}
        </div>

        {/* ──────────────────────────────────────────
            PAINEL DE INTELIGÊNCIA DO LEAD (direita)
            ────────────────────────────────────────── */}
        {selectedLead && showIntel && (
          <div className="fixed inset-0 z-40 md:static md:inset-auto flex w-full md:w-[280px] shrink-0 flex-col border-l border-border bg-card overflow-y-auto">

            {/* Header do painel */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <Brain className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-display font-bold text-xs text-foreground">Intel do Lead</p>
                  <p className="text-[10px] text-muted-foreground">Dados + perfil IA</p>
                </div>
              </div>
              <button
                onClick={() => setShowIntel(false)}
                className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-muted transition-colors"
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">

              {/* ── Dados do Lead ── */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dados do Lead</p>
                <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">{selectedLead.nome}</span>
                  </div>
                  {selectedLead.telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-green-600 shrink-0" />
                      <a href={`https://wa.me/55${selectedLead.telefone.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-green-700 hover:underline">{selectedLead.telefone}</a>
                    </div>
                  )}
                  {selectedLead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <a href={`mailto:${selectedLead.email}`} className="text-xs text-primary hover:underline truncate">{selectedLead.email}</a>
                    </div>
                  )}
                  {selectedLead.origem && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground capitalize">{selectedLead.origem}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(selectedLead.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                  {selectedLead.mensagem && (
                    <div className="flex items-start gap-2 pt-1 border-t border-border/50">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-[10px] text-muted-foreground italic leading-relaxed line-clamp-3">"{selectedLead.mensagem}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Lead Score ── */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Lead Score</p>
                <div className="flex items-center gap-3">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/5">
                    <span className="font-display text-base font-bold text-primary">{score}</span>
                  </div>
                  <div className="flex-1">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${scoreInfo.color}`}>
                      {score >= 75 ? <Flame className="h-3 w-3" /> : score >= 50 ? <ThumbsUp className="h-3 w-3" /> : <Snowflake className="h-3 w-3" />}
                      {scoreInfo.label}
                    </span>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${score >= 75 ? "bg-red-500" : score >= 50 ? "bg-amber-400" : "bg-blue-400"}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Pipeline ── */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pipeline</p>
                <select
                  value={selectedLead.pipeline_id || ""}
                  onChange={(e) => e.target.value && handleTransferPipeline(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">— Sem pipeline —</option>
                  {pipelines.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.pipeline_type === "vendas" ? "Vendas" : "Captação"})</option>
                  ))}
                </select>
                {selectedLead.pipeline_id && (() => {
                  const pipe = pipelines.find((p) => p.id === selectedLead.pipeline_id);
                  if (!pipe) return null;
                  return (
                    <select
                      value={selectedLead.stage_id || ""}
                      onChange={(e) => e.target.value && handleChangeStage(e.target.value)}
                      className="mt-1.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                      <option value="">— Estágio —</option>
                      {pipe.stages.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              {/* ── Negócios de Interesse (múltiplos) ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Negócios de Interesse</p>
                  <button onClick={() => setShowImovelPicker(true)} className="flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline">
                    <Plus className="h-3 w-3" /> Adicionar
                  </button>
                </div>
                {loadingNegocios ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...</div>
                ) : leadNegocios.length === 0 ? (
                  <button
                    onClick={() => setShowImovelPicker(true)}
                    className="w-full rounded-xl border-2 border-dashed border-border bg-muted/30 p-4 hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <Building2 className="h-7 w-7 text-muted-foreground/50 group-hover:text-primary mx-auto mb-1.5 transition-colors" />
                    <p className="text-xs font-medium text-foreground">+ Vincular Negócio</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Escolha os negócios que este lead tem interesse</p>
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    {leadNegocios.map((n) => (
                      <div key={n.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-2 group">
                        <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-semibold text-foreground truncate">{n.titulo}</p>
                          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                            {n.categoria && <span>{n.categoria}</span>}
                            {n.preco && <span className="font-medium text-primary">{formatCurrency(n.preco)}</span>}
                          </div>
                        </div>
                        <button onClick={() => handleRemoverNegocio(n.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all" title="Remover">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Agendar Visita ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Visitas</p>
                  <button onClick={() => { setAgendarForm({ data: "", hora: "", negocio_id: "", observacao: "" }); setShowAgendarModal(true); }} className="flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline">
                    <Plus className="h-3 w-3" /> Agendar
                  </button>
                </div>
                {loadingAgendamentos ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...</div>
                ) : agendamentos.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic">Nenhuma visita agendada</p>
                ) : (
                  <div className="space-y-1.5">
                    {agendamentos.map((ag) => {
                      const dt = new Date(`${ag.data}T${ag.horario}`);
                      const isPast = dt < new Date();
                      const isCanceled = ag.status === "cancelado";
                      return (
                        <div key={ag.id} className={`rounded-lg border p-2 ${isCanceled ? "border-red-200 bg-red-50/50 opacity-60" : isPast ? "border-amber-200 bg-amber-50/50" : "border-green-200 bg-green-50/50"}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[11px] font-semibold text-foreground">
                                {dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} às {ag.horario.slice(0,5)}
                              </span>
                            </div>
                            {!isCanceled && (
                              <button onClick={() => handleCancelarAgendamento(ag.id)} className="text-[9px] text-muted-foreground hover:text-red-500 underline">cancelar</button>
                            )}
                          </div>
                          {ag.negocio_titulo && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{ag.negocio_titulo}</p>}
                          {ag.notas && <p className="text-[10px] text-muted-foreground italic mt-0.5">"{ag.notas}"</p>}
                          {isCanceled && <span className="text-[9px] font-medium text-red-600">Cancelada</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>


              {/* ── Ficha do Negócio ── */}
              {(leadNegocios.length > 0 || selectedLead.negocio_id) && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ficha do Negócio</p>
                  {loadingNegocio ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...
                    </div>
                  ) : negocioData ? (
                    <div className="space-y-2">
                      <div className="rounded-xl border border-border bg-muted/30 p-3">
                        <p className="text-xs font-semibold text-foreground truncate">{negocioData.titulo}</p>
                        {negocioData.categoria && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{negocioData.categoria}{negocioData.cidade ? ` · ${negocioData.cidade}` : ""}</p>
                        )}
                      </div>
                      {negocioData.preco && (
                        <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <DollarSign className="h-3.5 w-3.5" /> Preço pedido
                          </span>
                          <span className="font-display text-sm font-bold text-primary">{formatCurrency(negocioData.preco)}</span>
                        </div>
                      )}
                      {negocioData.faturamento_mensal && (
                        <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <BarChart3 className="h-3.5 w-3.5 text-green-600" /> Fat. mensal
                          </span>
                          <span className="font-display text-sm font-bold text-green-700">{formatCurrency(negocioData.faturamento_mensal)}</span>
                        </div>
                      )}
                      {roi && payback && multiplo && (
                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                          <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                            <TrendingUp className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                            <p className="font-display text-base font-bold text-foreground">{roi}%</p>
                            <p className="text-[9px] text-muted-foreground leading-tight">ROI<br/>anual</p>
                          </div>
                          <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                            <Target className="h-3.5 w-3.5 text-amber-500 mx-auto mb-1" />
                            <p className="font-display text-base font-bold text-foreground">{payback}m</p>
                            <p className="text-[9px] text-muted-foreground leading-tight">Payback<br/>meses</p>
                          </div>
                          <div className="rounded-xl border border-border bg-card p-2.5 text-center">
                            <BarChart3 className="h-3.5 w-3.5 text-green-600 mx-auto mb-1" />
                            <p className="font-display text-base font-bold text-foreground">{multiplo}x</p>
                            <p className="text-[9px] text-muted-foreground leading-tight">Múltiplo<br/>receita</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Dados do negócio não disponíveis</p>
                  )}
                </div>
              )}

              {/* ── Perfil do Investidor IA ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Perfil IA do Investidor</p>
                </div>
                {!investorProfile && !loadingInvestor && (
                  <button
                    onClick={handleInvestorAnalysis}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Analisar perfil com IA
                  </button>
                )}
                {loadingInvestor && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-3 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analisando perfil do investidor...
                  </div>
                )}
                {investorProfile && !loadingInvestor && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{investorProfile.icone}</span>
                        <div>
                          <p className="text-xs font-bold text-foreground">{investorProfile.perfil}</p>
                          <p className="text-[10px] text-muted-foreground">{investorProfile.descricao}</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Gatilhos Financeiros</p>
                      <div className="space-y-1.5">
                        {investorProfile.gatilhos.map((g, i) => (
                          <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-2.5 py-2">
                            <span className="text-amber-600 font-bold text-xs shrink-0 mt-px">{i + 1}</span>
                            <p className="text-xs text-foreground leading-snug">{g}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleInvestorAnalysis}
                      className="flex items-center gap-1 text-[10px] text-primary hover:underline"
                    >
                      <RefreshCw className="h-2.5 w-2.5" /> Reanalisar perfil
                    </button>
                  </div>
                )}
              </div>

              {/* ── Info do Lead ── */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dados do Lead</p>
                <div className="space-y-1.5 text-xs">
                  {selectedLead.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{selectedLead.email}</span>
                    </div>
                  )}
                  {selectedLead.telefone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3 shrink-0" />
                      <span>{formatPhoneDisplay(selectedLead.telefone)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Target className="h-3 w-3 shrink-0" />
                    <span>Origem: <span className="font-medium text-foreground">{selectedLead.origem}</span></span>
                  </div>
                  {selectedLead.mensagem && (
                    <div className="rounded-lg bg-muted/50 p-2.5 mt-1">
                      <p className="text-[10px] text-muted-foreground mb-1">Mensagem inicial:</p>
                      <p className="text-xs italic text-foreground leading-snug">"{selectedLead.mensagem}"</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Modal de seleção de imóvel (adiciona à lista) */}
      <ImovelPickerModal
        open={showImovelPicker}
        onClose={() => setShowImovelPicker(false)}
        onSelect={({ id, titulo }) => handleAdicionarNegocio(id, titulo)}
        currentNegocioId={selectedLead?.negocio_id || null}
      />

      {/* Modal Editar Lead (nome/telefone/email) */}
      {showEditLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowEditLead(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <UserCircle className="h-4 w-4 text-primary" />
                </div>
                <p className="font-display font-bold text-foreground">Editar Lead</p>
              </div>
              <button onClick={() => setShowEditLead(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Nome <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  autoFocus
                  value={editLeadForm.nome}
                  onChange={(e) => setEditLeadForm((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome completo"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">WhatsApp</label>
                <input
                  type="tel"
                  value={editLeadForm.telefone}
                  onChange={(e) => setEditLeadForm((p) => ({ ...p, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={editLeadForm.email}
                  onChange={(e) => setEditLeadForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">Necessário para enviar agendamentos por email</p>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowEditLead(false)} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
                <button type="button" onClick={handleSaveEditLead} disabled={savingEditLead || !editLeadForm.nome.trim()} className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {savingEditLead ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agendar Visita */}
      {showAgendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowAgendarModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                  <Calendar className="h-4 w-4 text-green-700" />
                </div>
                <p className="font-display font-bold text-foreground">Agendar Visita</p>
              </div>
              <button onClick={() => setShowAgendarModal(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Data <span className="text-red-500">*</span></label>
                  <input type="date" value={agendarForm.data} onChange={(e) => setAgendarForm((p) => ({ ...p, data: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Hora <span className="text-red-500">*</span></label>
                  <input type="time" value={agendarForm.hora} onChange={(e) => setAgendarForm((p) => ({ ...p, hora: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              {leadNegocios.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Negócio</label>
                  <select value={agendarForm.negocio_id} onChange={(e) => setAgendarForm((p) => ({ ...p, negocio_id: e.target.value }))} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">— Selecione (opcional) —</option>
                    {leadNegocios.map((n) => <option key={n.negocio_id} value={n.negocio_id}>{n.titulo}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Observação</label>
                <textarea value={agendarForm.observacao} onChange={(e) => setAgendarForm((p) => ({ ...p, observacao: e.target.value }))} placeholder="Ex: visitar o salão no período da manhã..." rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowAgendarModal(false)} className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancelar</button>
                <button type="button" onClick={handleSalvarAgendamento} disabled={!agendarForm.data || !agendarForm.hora || salvandoAgendamento} className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {salvandoAgendamento ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                  Agendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default WhatsAppCRM;
