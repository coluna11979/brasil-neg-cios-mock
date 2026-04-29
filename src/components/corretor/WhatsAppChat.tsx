import { useEffect, useState, useRef } from "react";
import {
  Search, Send, Phone, Mail, ArrowLeft, MessageCircle, Building2,
  CheckCheck, Loader2, AlertCircle, Wifi, WifiOff,
  Sparkles, ChevronDown, ChevronUp, TrendingUp, Target, DollarSign,
  BarChart3, Brain, Flame,
  ThumbsUp, Snowflake, CheckCircle, Circle, Paperclip, ImageIcon,
  UserCircle, MapPin, Calendar, MessageSquare, UserPlus, X, RefreshCw,
} from "lucide-react";
import { checkInstanceStatus } from "@/lib/uazapi";
import { getAllLeads, addLead, calculateLeadScore, getScoreLabel, updateLeadStatus, markAiSugestaoUsada, type Lead } from "@/stores/leadStore";
import {
  getMessagesByLead,
  sendMessage,
  markMessagesAsRead,
  type LeadMessage,
} from "@/stores/messageStore";
import { supabase } from "@/lib/supabase";
import { callClaude } from "@/lib/anthropic";

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatPhoneDisplay(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return phone;
}
const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).slice(0, 2).join("");

function renderMessageContent(text: string) {
  if (text.startsWith("[IMAGE]:")) {
    const url = text.replace("[IMAGE]:", "");
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <img src={url} alt="imagem" className="max-w-[220px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity" />
      </a>
    );
  }
  if (text.includes("[tipo: media]") || text.includes("Mídia recebida")) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground italic text-sm">
        <ImageIcon className="h-4 w-4 shrink-0" />📸 Mídia recebida
      </span>
    );
  }
  if (text.startsWith("📸") || text.toLowerCase().startsWith("album:")) {
    return (
      <span className="flex items-center gap-1.5 text-muted-foreground italic text-sm">
        <ImageIcon className="h-4 w-4 shrink-0" />{text}
      </span>
    );
  }
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
  if (text.startsWith("[VIDEO]:")) {
    const url = text.replace("[VIDEO]:", "");
    return <video controls src={url} className="max-w-[240px] rounded-xl" />;
  }
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
  if (text.startsWith("🎥") || text.startsWith("🎤") || text.startsWith("📎")) {
    return <span className="text-muted-foreground italic text-sm">{text}</span>;
  }
  return <p className="text-sm text-foreground whitespace-pre-wrap break-words">{text}</p>;
}

const WhatsAppChat = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendStatus, setSendStatus] = useState<"idle"|"sent"|"no_phone"|"error">("idle");
  const [sendError, setSendError] = useState("");
  const [instanceStatus, setInstanceStatus] = useState<"checking"|"connected"|"disconnected">("checking");
  const [instanceStatusMsg, setInstanceStatusMsg] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showAi, setShowAi] = useState(false);
  // Intel sidebar
  const [showIntel, setShowIntel] = useState(true);
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContact, setNewContact] = useState({ nome: "", telefone: "", email: "", mensagem: "" });
  const [savingContact, setSavingContact] = useState(false);
  const [negocioData, setNegocioData] = useState<NegocioData | null>(null);
  const [loadingNegocio, setLoadingNegocio] = useState(false);
  const [investorProfile, setInvestorProfile] = useState<InvestorProfile | null>(null);
  const [loadingInvestor, setLoadingInvestor] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<Lead["status"]>("novo");
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAllLeads().then((data) => { setLeads(data); setLoading(false); });
    checkInstanceStatus().then(({ connected, status }) => {
      setInstanceStatus(connected ? "connected" : "disconnected");
      setInstanceStatusMsg(status || "");
    });
  }, []);

  const recheckInstance = () => {
    setInstanceStatus("checking");
    checkInstanceStatus().then(({ connected, status }) => {
      setInstanceStatus(connected ? "connected" : "disconnected");
      setInstanceStatusMsg(status || "");
    });
  };

  // Fetch negocio data when lead changes
  useEffect(() => {
    if (!selectedLead?.negocio_id) {
      setNegocioData(null);
      setInvestorProfile(null);
      return;
    }
    setLoadingNegocio(true);
    setInvestorProfile(null);
    supabase
      .from("negocios")
      .select("titulo, preco, faturamento_mensal, categoria, cidade")
      .eq("id", selectedLead.negocio_id)
      .single()
      .then(({ data }) => {
        setNegocioData(data ?? null);
        setLoadingNegocio(false);
      });
  }, [selectedLead?.negocio_id]);

  useEffect(() => {
    if (selectedLead) setCurrentStatus(selectedLead.status || "novo");
  }, [selectedLead]);

  const handleStatusChange = async (status: Lead["status"]) => {
    if (!selectedLead) return;
    setCurrentStatus(status);
    await updateLeadStatus(selectedLead.id, status);
    setLeads((prev) => prev.map((l) => l.id === selectedLead.id ? { ...l, status } : l));
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

      const prompt = `Você é um assistente especializado em negociação de compra e venda de negócios (M&A de PMEs brasileiras).

Contexto do lead:
- Nome: ${selectedLead.nome}
- Interesse: ${selectedLead.negocio_titulo || selectedLead.galeria_nome || "não especificado"}
- Mensagem inicial: ${selectedLead.mensagem || "não informada"}
- Origem: ${selectedLead.origem}

Histórico da conversa (últimas mensagens):
${historico || "(sem mensagens ainda)"}

Gere EXATAMENTE 3 sugestões de resposta para o corretor enviar agora via WhatsApp.
Cada sugestão deve ser direta, profissional e em português brasileiro informal.
Varie o tom: 1 para avançar na negociação, 1 para qualificar o lead, 1 para agendar reunião/visita.

Responda APENAS com as 3 sugestões, uma por linha, sem numeração, sem prefixo, sem explicação.`;

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

  useEffect(() => {
    if (!selectedLead) return;
    setLoadingMessages(true);
    setAiSuggestions([]);
    setShowAi(false);
    getMessagesByLead(selectedLead.id).then((msgs) => {
      setMessages(msgs);
      setLoadingMessages(false);
      markMessagesAsRead(selectedLead.id);
    });
  }, [selectedLead]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Realtime subscription — atualiza instantaneamente quando chega mensagem nova
  useEffect(() => {
    if (!selectedLead) return;

    const channel = supabase
      .channel(`lead_messages:${selectedLead.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lead_messages",
          filter: `lead_id=eq.${selectedLead.id}`,
        },
        async () => {
          const msgs = await getMessagesByLead(selectedLead.id);
          setMessages(msgs);
          markMessagesAsRead(selectedLead.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedLead]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedLead || sending) return;
    setSending(true);
    setSendStatus("idle");
    const result = await sendMessage(selectedLead.id, newMessage.trim(), "corretor", selectedLead.telefone || undefined);
    if (result.saved) {
      setNewMessage("");
      const msgs = await getMessagesByLead(selectedLead.id);
      setMessages(msgs);
      const st = result.whatsapp === "sent" ? "sent" : result.whatsapp === "no_phone" ? "no_phone" : "error";
      setSendStatus(st);
      if (st === "error") setSendError(result.error || "Falha na API");
      setTimeout(() => { setSendStatus("idle"); setSendError(""); }, 6000);
    } else {
      setSendStatus("error");
      setSendError(result.error || "Erro ao salvar mensagem");
    }
    setSending(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedLead) return;
    if (file.size > 25 * 1024 * 1024) { alert("Arquivo muito grande! Máximo 25MB."); return; }

    const isImage = file.type.startsWith("image/");
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");
    const isDoc = file.type === "application/pdf" || file.name.endsWith(".pdf");

    if (!isImage && !isAudio && !isVideo && !isDoc) {
      alert("Tipo não suportado. Envie imagem, áudio, vídeo ou PDF.");
      return;
    }

    setUploadingFile(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const folder = isImage ? "crm/images" : isAudio ? "crm/audio" : isVideo ? "crm/video" : "crm/docs";
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("lead-images").upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("lead-images").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      let msgContent: string;
      if (isImage) msgContent = `[IMAGE]:${publicUrl}`;
      else if (isAudio) msgContent = `[AUDIO]:${publicUrl}`;
      else if (isVideo) msgContent = `[VIDEO]:${publicUrl}`;
      else msgContent = `[FILE]:${publicUrl}|${file.name}`;

      await sendMessage(selectedLead.id, msgContent, "corretor", selectedLead.telefone || undefined);
      const updated = await getMessagesByLead(selectedLead.id);
      setMessages(updated);
    } catch (err) {
      console.error("[Chat] Erro ao enviar arquivo:", err);
      alert("Erro ao enviar arquivo. Tente novamente.");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.nome.trim() || !newContact.telefone.trim()) return;
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

  const filteredLeads = leads.filter((lead) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return lead.nome.toLowerCase().includes(q) || (lead.email||"").toLowerCase().includes(q) || (lead.telefone||"").includes(q);
  });

  const groupedMessages: { date: string; msgs: LeadMessage[] }[] = [];
  let lastDate = "";
  for (const msg of messages) {
    const date = formatDate(msg.created_at);
    if (date !== lastDate) { groupedMessages.push({ date, msgs: [msg] }); lastDate = date; }
    else groupedMessages[groupedMessages.length - 1].msgs.push(msg);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Compute financial metrics
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
    <div className="flex h-[100dvh] md:h-[calc(100vh-3rem)] md:rounded-xl md:border md:border-border overflow-hidden bg-card md:shadow-sm">

      {/* Modal Novo Contato — fullscreen no mobile, modal centralizado no desktop */}
      {showNewContact && (
        <div className="fixed inset-0 z-50 flex md:items-center md:justify-center md:bg-black/50 md:backdrop-blur-sm md:p-4 bg-card">
          <div className="w-full md:max-w-md md:rounded-2xl bg-card md:border md:border-border md:shadow-2xl flex flex-col h-full md:h-auto">
            <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <UserPlus className="h-4 w-4 text-primary" />
                </div>
                <p className="font-display font-bold text-foreground">Novo Contato</p>
              </div>
              <button onClick={() => setShowNewContact(false)} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateContact} className="p-4 md:p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Nome <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newContact.nome}
                  onChange={(e) => setNewContact((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Nome completo"
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">WhatsApp <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={newContact.telefone}
                  onChange={(e) => setNewContact((p) => ({ ...p, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  required
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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

      {/* Sidebar de conversas */}
      <div className={`w-full md:w-[320px] flex-shrink-0 border-r border-border flex flex-col bg-card ${selectedLead ? "hidden md:flex" : "flex"}`}>
        {/* Header sticky com safe-area no top */}
        <div className="sticky top-0 z-10 bg-card border-b border-border" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
            <h1 className="font-display font-bold text-foreground text-lg md:text-base">Conversas</h1>
            <button
              onClick={recheckInstance}
              className="flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1 border transition-colors active:scale-95"
              style={{
                color: instanceStatus === "connected" ? "#15803d" : instanceStatus === "disconnected" ? "#b91c1c" : "#92400e",
                backgroundColor: instanceStatus === "connected" ? "#f0fdf4" : instanceStatus === "disconnected" ? "#fef2f2" : "#fffbeb",
                borderColor: instanceStatus === "connected" ? "#bbf7d0" : instanceStatus === "disconnected" ? "#fecaca" : "#fde68a",
              }}
            >
              {instanceStatus === "checking" ? <Loader2 className="h-3 w-3 animate-spin" /> : instanceStatus === "connected" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {instanceStatus === "checking" ? "..." : instanceStatus === "connected" ? "Online" : "Offline"}
            </button>
          </div>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                inputMode="search"
                placeholder="Buscar lead..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full border border-border bg-muted/50 py-2.5 pl-10 pr-4 text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card focus:border-primary"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border/40 overscroll-contain">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-6 text-center">
              <MessageCircle className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum lead encontrado</p>
              <p className="text-xs mt-1">Use o botão + abaixo para adicionar</p>
            </div>
          ) : filteredLeads.map((lead) => (
            <button
              key={lead.id}
              onClick={() => setSelectedLead(lead)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left active:bg-muted hover:bg-muted/50 transition-colors ${selectedLead?.id === lead.id ? "bg-primary/5 md:border-l-2 md:border-l-primary" : ""}`}
            >
              <div className="relative shrink-0">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-display text-base font-bold text-primary">
                  {getInitials(lead.nome)}
                </div>
                {lead.telefone && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 ring-2 ring-card">
                    <Wifi className="h-2 w-2 text-white" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-base md:text-sm text-foreground truncate">{lead.nome}</p>
                  <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(lead.criado_em)}</span>
                </div>
                <p className="text-sm md:text-xs text-muted-foreground truncate mt-0.5">
                  {lead.mensagem
                    ? lead.mensagem
                    : lead.telefone ? formatPhoneDisplay(lead.telefone) : lead.email || "Sem contato"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {lead.negocio_titulo && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Building2 className="h-2.5 w-2.5" />
                      <span className="truncate max-w-[140px]">{lead.negocio_titulo}</span>
                    </span>
                  )}
                  {!lead.telefone && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-600">
                      <WifiOff className="h-2.5 w-2.5" />Sem telefone
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* FAB Novo Contato — só no mobile, flutuante */}
        <button
          onClick={() => setShowNewContact(true)}
          aria-label="Novo contato"
          className="md:hidden fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <UserPlus className="h-6 w-6" />
        </button>

        {/* Botão Novo Contato — desktop, no rodapé da sidebar */}
        <div className="hidden md:block px-4 py-3 border-t border-border bg-muted/20">
          <button
            onClick={() => setShowNewContact(true)}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            Novo contato
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className={`flex-1 min-w-0 flex flex-col ${!selectedLead ? "hidden md:flex" : "flex"}`}>
        {!selectedLead ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4">
              <MessageCircle className="h-10 w-10 opacity-30" />
            </div>
            <p className="font-display text-lg font-semibold">NegociaAky</p>
            <p className="text-sm mt-1">Selecione um lead para iniciar a conversa</p>
          </div>
        ) : (
          <>
            {/* Header do chat — compacto no mobile, com avatar clicável que abre intel */}
            <div
              className="sticky top-0 z-20 flex items-center gap-2.5 px-3 py-2.5 border-b border-border bg-card"
              style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.625rem)" }}
            >
              <button
                onClick={() => setSelectedLead(null)}
                aria-label="Voltar para lista"
                className="md:hidden flex h-9 w-9 -ml-1 items-center justify-center rounded-full text-muted-foreground active:bg-muted hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowIntel(true)}
                className="flex flex-1 items-center gap-3 min-w-0 text-left active:opacity-70"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                  {getInitials(selectedLead.nome)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate text-base md:text-sm">{selectedLead.nome}</p>
                  {selectedLead.telefone ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <Wifi className="h-3 w-3" />
                      <span className="truncate">{formatPhoneDisplay(selectedLead.telefone)}</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <WifiOff className="h-3 w-3" />Sem telefone
                    </span>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                {selectedLead.telefone && (
                  <a
                    href={`https://wa.me/55${selectedLead.telefone.replace(/\D/g,"")}`}
                    target="_blank" rel="noopener noreferrer"
                    aria-label="Abrir no WhatsApp"
                    className="flex h-10 w-10 items-center justify-center rounded-full text-green-600 active:bg-green-50 hover:bg-green-50 transition-colors"
                  >
                    <Phone className="h-5 w-5 md:h-4 md:w-4" />
                  </a>
                )}
                <button
                  onClick={() => setShowIntel(!showIntel)}
                  aria-label={showIntel ? "Fechar painel" : "Abrir painel do lead"}
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${showIntel ? "bg-primary/10 text-primary" : "text-muted-foreground active:bg-muted hover:bg-muted"}`}
                >
                  <Brain className="h-5 w-5 md:h-4 md:w-4" />
                </button>
              </div>
            </div>

            {(selectedLead.negocio_titulo || selectedLead.galeria_nome) && (
              <div className="px-4 py-2 border-b border-border bg-accent/5 flex items-center gap-2 text-xs">
                <Building2 className="h-3.5 w-3.5 text-accent" />
                <span className="text-muted-foreground">Interesse em:</span>
                <span className="font-medium">{selectedLead.negocio_titulo || selectedLead.galeria_nome}{selectedLead.espaco_numero && ` — ${selectedLead.espaco_numero}`}</span>
              </div>
            )}

            {sendStatus === "sent" && (
              <div className="px-4 py-2 bg-green-50 border-b border-green-100 flex items-center gap-2 text-xs text-green-700">
                <CheckCheck className="h-3.5 w-3.5" />Mensagem enviada via WhatsApp!
              </div>
            )}
            {sendStatus === "no_phone" && (
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-2 text-xs text-amber-700">
                <AlertCircle className="h-3.5 w-3.5" />Salvo internamente. Lead sem telefone.
              </div>
            )}
            {sendStatus === "error" && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-100 flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <p>Salvo internamente, mas NÃO enviado. {sendError}</p>
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
                    <div className="bg-[#e2f0cb] rounded-lg p-3 shadow-sm text-sm italic max-w-xs">
                      "{selectedLead.mensagem}"
                    </div>
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
                        <span className="bg-white/90 rounded-lg px-3 py-1 text-xs text-muted-foreground shadow-sm">{group.date}</span>
                      </div>
                      {group.msgs.map((msg) => (
                        <div key={msg.id} className={`flex mb-1 ${msg.sender_type === "corretor" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${msg.sender_type === "corretor" ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none"}`}>
                            {renderMessageContent(msg.message)}
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                              {msg.sender_type === "corretor" && (
                                <CheckCheck className={`h-3.5 w-3.5 ${msg.is_read ? "text-blue-500" : "text-muted-foreground/50"}`} />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* IA7 — Painel de Sugestões IA */}
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

            {/* AI First Contact Suggestion Banner */}
            {selectedLead.ai_sugestao && !selectedLead.ai_sugestao_usada && (
              <div className="mx-4 mb-2 rounded-xl border border-violet-200 bg-violet-50 p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
                    <span className="text-xs font-semibold text-violet-700">Sugestão de primeiro contato</span>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await markAiSugestaoUsada(selectedLead.id);
                      setSelectedLead({ ...selectedLead, ai_sugestao_usada: true });
                    }}
                    className="text-violet-400 hover:text-violet-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-xs text-violet-800 leading-relaxed mb-2">{selectedLead.ai_sugestao}</p>
                <button
                  type="button"
                  onClick={async () => {
                    setNewMessage(selectedLead.ai_sugestao!);
                    await markAiSugestaoUsada(selectedLead.id);
                    setSelectedLead({ ...selectedLead, ai_sugestao_usada: true });
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
                >
                  <Send className="h-3 w-3" />
                  Usar esta mensagem
                </button>
              </div>
            )}

            {/* Input — textarea auto-grow, safe-area no bottom */}
            <form
              onSubmit={handleSend}
              className="flex items-end gap-2 px-3 py-2 border-t border-border bg-card"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
            >
              <input type="file" ref={fileInputRef} accept="image/*,audio/*,video/*,.pdf" className="hidden" onChange={handleFileSelect} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                aria-label="Anexar arquivo"
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground active:bg-muted hover:bg-muted transition-colors shrink-0 disabled:opacity-50"
              >
                {uploadingFile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
              </button>
              <textarea
                rows={1}
                placeholder={selectedLead.telefone ? `Mensagem via WhatsApp...` : "Mensagem interna..."}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  // Auto-grow: ajusta altura conforme conteúdo (1-5 linhas)
                  const el = e.target;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 140) + "px";
                }}
                onKeyDown={(e) => {
                  // Enter envia, Shift+Enter quebra linha — só no desktop
                  if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(min-width: 768px)").matches) {
                    e.preventDefault();
                    handleSend(e as unknown as React.FormEvent);
                  }
                }}
                className="flex-1 max-h-[140px] resize-none rounded-2xl border border-border bg-muted/40 px-4 py-2.5 text-base md:text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:bg-card focus:border-primary leading-relaxed"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                aria-label="Enviar mensagem"
                className={`flex h-11 w-11 items-center justify-center rounded-full text-white transition-all active:scale-95 disabled:opacity-40 disabled:scale-100 shrink-0 ${selectedLead.telefone ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"}`}
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
          </>
        )}
      </div>

      {/* ──────────────────────────────────────────
          PAINEL DE INTELIGÊNCIA DO LEAD
          - Mobile: drawer fullscreen overlay (z-40)
          - Desktop: sidebar lateral fixa
          ────────────────────────────────────────── */}
      {selectedLead && showIntel && (
        <>
          {/* Backdrop só no mobile */}
          <div
            onClick={() => setShowIntel(false)}
            className="md:hidden fixed inset-0 z-30 bg-black/40 animate-in fade-in"
          />
          <div className="fixed inset-0 z-40 md:relative md:inset-auto md:z-auto flex w-full md:w-[320px] shrink-0 flex-col border-l border-border bg-card overflow-y-auto md:animate-none animate-in slide-in-from-right">

          {/* Header do painel */}
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0"
            style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 md:h-4 md:w-4 text-primary" />
              </div>
              <div>
                <p className="font-display font-bold text-base md:text-xs text-foreground">Intel do Lead</p>
                <p className="text-xs md:text-[10px] text-muted-foreground">Dados + perfil IA</p>
              </div>
            </div>
            <button
              onClick={() => setShowIntel(false)}
              aria-label="Fechar painel"
              className="flex h-10 w-10 md:h-7 md:w-7 items-center justify-center rounded-full md:rounded text-muted-foreground active:bg-muted hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5 md:h-3.5 md:w-3.5" />
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

            {/* ── Status rápido ── */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status do Lead</p>
              <div className="grid grid-cols-2 gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStatusChange(opt.value)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                      currentStatus === opt.value
                        ? `${opt.color} border-current shadow-sm`
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {currentStatus === opt.value
                      ? <CheckCircle className="h-3 w-3 shrink-0" />
                      : <Circle className="h-3 w-3 shrink-0" />}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Ficha do Negócio ── */}
            {selectedLead.negocio_id && (
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

                    {/* Valor */}
                    {negocioData.preco && (
                      <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5" /> Preço pedido
                        </span>
                        <span className="font-display text-sm font-bold text-primary">{formatCurrency(negocioData.preco)}</span>
                      </div>
                    )}

                    {/* Faturamento */}
                    {negocioData.faturamento_mensal && (
                      <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <BarChart3 className="h-3.5 w-3.5 text-green-600" /> Fat. mensal
                        </span>
                        <span className="font-display text-sm font-bold text-green-700">{formatCurrency(negocioData.faturamento_mensal)}</span>
                      </div>
                    )}

                    {/* Métricas de investimento */}
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
        </>
      )}

    </div>
  );
};

export default WhatsAppChat;
