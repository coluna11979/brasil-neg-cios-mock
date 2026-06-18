import { useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/uazapi";
import {
  ArrowLeft, CheckCircle, UserCheck, TrendingUp, Handshake, Wallet,
  Sparkles, Loader2, Clock, Inbox, Smartphone, MessageCircle, Bot,
  Zap, BellRing, Target, Rocket, ArrowRight, X, Check,
} from "lucide-react";
import { callClaude } from "@/lib/anthropic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FaithQuote from "@/components/FaithQuote";
import InstallPWAButton from "@/components/corretor/InstallPWAButton";

const DIFERENCIAIS = [
  {
    icon: MessageCircle,
    titulo: "Leads direto no seu WhatsApp",
    desc: "Cada interessado cai no seu Zap em segundos. Sem planilha, sem login, sem fricção.",
    cor: "from-emerald-500/15 to-emerald-500/0",
    iconCor: "text-emerald-600",
  },
  {
    icon: Smartphone,
    titulo: "NegociaAky como app no celular",
    desc: "Instala em 1 toque. Notificações push quando o lead chega. Funciona offline.",
    cor: "from-primary/15 to-primary/0",
    iconCor: "text-primary",
  },
  {
    icon: Bot,
    titulo: "IA atende 24h por você",
    desc: "Nossa IA qualifica o lead antes de te entregar. Você recebe só quem tá pronto pra negociar.",
    cor: "from-accent/15 to-accent/0",
    iconCor: "text-accent-foreground",
  },
  {
    icon: Target,
    titulo: "Roteamento automático por região",
    desc: "Cadastra seu bairro/CEP e os leads daquela área vêm pra você primeiro. Carteira protegida.",
    cor: "from-violet-500/15 to-violet-500/0",
    iconCor: "text-violet-600",
  },
];

const COMPARATIVO = [
  { label: "Recebimento de leads", sem: "Planilha + ligação manual", com: "WhatsApp em < 30s, com áudio do lead" },
  { label: "Qualificação", sem: "Você liga e descobre que não tá pronto", com: "IA qualifica antes — só vem quem quer fechar" },
  { label: "CRM", sem: "Anotação no caderno ou Excel", com: "Pipeline pronto, kanban, histórico salvo" },
  { label: "App mobile", sem: "Site lento no navegador", com: "PWA instalado, push, abre offline" },
  { label: "Carteira de imóveis", sem: "Você corre atrás", com: "Acesso antecipado ao que entra na sua região" },
  { label: "Comissão", sem: "Dividida com 5 intermediários", com: "Direto com você. Pagamento na conta." },
];

const PASSOS = [
  { num: "01", titulo: "Cadastra em 2 minutos", desc: "Preenche o form abaixo com WhatsApp, CRECI (opcional) e sua região." },
  { num: "02", titulo: "Aprovação em até 24h", desc: "Nossa equipe valida e libera seu acesso ao painel." },
  { num: "03", titulo: "Instala o app + recebe leads", desc: "Instala como app no celular, ativa push e os leads começam a chegar." },
];

const SejaCorretor = () => {
  usePageTitle("Seja um Corretor – NegociaAky");

  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({
    nome: "", whatsapp: "", email: "", cidade: "São Paulo",
    creci: "", experiencia: "", atuacao: "", sobre: "",
    motivacao: "", objetivo: "", comprometido: false,
    bairro: "", cep: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [iaLoading, setIaLoading] = useState(false);
  const [iaSugestoes, setIaSugestoes] = useState<string[]>([]);

  const formatWhatsApp = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2)  return d;
    if (d.length <= 3)  return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 7)  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
  };

  const formatCep = (val: string) => {
    const d = val.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Obrigatório";
    const whatsDigits = form.whatsapp.replace(/\D/g, "");
    if (!whatsDigits) e.whatsapp = "Obrigatório";
    else if (whatsDigits.length < 10 || whatsDigits.length > 11) e.whatsapp = "Número incompleto";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    if (!form.atuacao) e.atuacao = "Obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleGerarSugestoes = async () => {
    setIaLoading(true);
    setIaSugestoes([]);
    try {
      const prompt = `Você é um assistente que ajuda corretores de negócios a escrever uma apresentação profissional e autêntica sobre si mesmos para uma plataforma de compra e venda de empresas.

Dados do corretor:
- Nome: ${form.nome || "não informado"}
- Cidade de atuação: ${form.cidade}
- Bairro/Região: ${form.bairro || "não informado"}
- Área de atuação: ${form.atuacao || "não informada"}
- Experiência: ${form.experiencia || "não informada"}
- CRECI: ${form.creci || "não informado"}
- Por que quer ser corretor: ${form.motivacao || "não informado"}
- Como pretende contribuir: ${form.objetivo || "não informado"}
- Comprometido com 3 captações em 30 dias: ${form.comprometido ? "SIM" : "não"}

Use as motivações e objetivos dele para dar autenticidade ao texto. Se ele se comprometeu com 3 captações em 30 dias, isso indica alto engajamento — reflita isso na descrição.

Gere EXATAMENTE 3 descrições profissionais diferentes para o campo "Sobre você". Cada uma com tom diferente:
1. Formal e experiente
2. Acolhedor e próximo
3. Moderno e direto ao ponto

Responda APENAS com as 3 descrições separadas por "---", sem numeração, sem título, sem explicação.`;

      const resposta = await callClaude(prompt);
      const partes = resposta.split("---").map((s) => s.trim()).filter(Boolean);
      setIaSugestoes(partes.slice(0, 3));
    } catch {
      setIaSugestoes(["Erro ao gerar sugestões. Tente novamente."]);
    } finally {
      setIaLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const senhaInicial = crypto.randomUUID() + crypto.randomUUID();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: senhaInicial,
      options: {
        data: {
          nome: form.nome,
          telefone: form.whatsapp.replace(/\D/g, ""),
          regiao: `${form.cidade} — SP`,
          creci: form.creci.trim() || null,
          experiencia: form.experiencia,
          atuacao: form.atuacao,
          sobre: form.sobre,
          motivacao: form.motivacao || null,
          objetivo: form.objetivo || null,
          comprometido: form.comprometido,
          bairro: form.bairro.trim() || null,
          cep: form.cep.trim() || null,
        },
      },
    });

    if (authError && !authError.message.includes("already registered")) {
      console.error("Erro ao criar conta:", authError);
    }

    const userId = authData?.user?.id;

    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        nome: form.nome,
        email: form.email,
        telefone: form.whatsapp.replace(/\D/g, ""),
        role: "corretor",
        regiao: `${form.cidade} — SP`,
        creci: form.creci.trim() || null,
        experiencia: form.experiencia,
        atuacao: form.atuacao,
        sobre: form.sobre,
        motivacao: form.motivacao || null,
        objetivo: form.objetivo || null,
        comprometido: form.comprometido,
        bairro: form.bairro.trim() || null,
        cep: form.cep.trim() || null,
        ativo: false,
      });
    } else {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", form.email)
        .single();
      if (existing) {
        await supabase.from("profiles").update({
          nome: form.nome,
          telefone: form.whatsapp.replace(/\D/g, ""),
          regiao: `${form.cidade} — SP`,
          creci: form.creci.trim() || null,
          experiencia: form.experiencia,
          atuacao: form.atuacao,
          sobre: form.sobre,
          motivacao: form.motivacao || null,
          objetivo: form.objetivo || null,
          comprometido: form.comprometido,
          bairro: form.bairro.trim() || null,
          cep: form.cep.trim() || null,
          ativo: false,
        }).eq("id", existing.id);
      }
    }

    const adminPhone = import.meta.env.VITE_ADMIN_PHONE;
    if (adminPhone) {
      await sendWhatsAppMessage(
        adminPhone,
        `🔔 *Nova candidatura de corretor!*\n\n` +
        `👤 Nome: *${form.nome}*\n` +
        `📱 WhatsApp: *${form.whatsapp}*\n` +
        `📧 E-mail: *${form.email}*\n` +
        `🏙️ Região: *${form.cidade} — SP*\n` +
        `💼 Atuação: *${form.atuacao || "não informado"}*\n` +
        `🪪 CRECI: *${form.creci.trim() || "não informado"}*\n\n` +
        `Acesse o painel admin para aprovar:\n` +
        `https://negociaaky.com.br/admin/corretores`
      ).catch(() => {});
    }

    const telefoneCorretor = form.whatsapp.replace(/\D/g, "");
    if (telefoneCorretor.length >= 10) {
      await sendWhatsAppMessage(
        telefoneCorretor,
        `Olá, *${form.nome.split(" ")[0]}*! 👋\n\n` +
        `Recebemos sua candidatura na *NegociaAky* e ela já está em análise pela nossa equipe.\n\n` +
        `⏳ *Próximos passos:*\n` +
        `1️⃣ Em até 24h analisamos seu cadastro\n` +
        `2️⃣ Quando aprovado, você recebe um *e-mail* com link seguro para criar sua senha\n` +
        `3️⃣ Acessa seu painel em *negociaaky.com.br/corretor/login*\n\n` +
        `📧 Fique de olho no e-mail *${form.email}* (cheque também o spam).\n\n` +
        `Qualquer dúvida, é só responder por aqui! 😊\n\n` +
        `_✨ Tudo é possível àquele que crê. — Marcos 9:23_`
      ).catch(() => {});
    }

    setEnviado(true);
  };

  const err = (field: string) =>
    errors[field] ? <p className="mt-1 text-xs text-destructive">{errors[field]}</p> : null;

  const scrollToForm = () => {
    document.getElementById("form-cadastro")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (enviado) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center py-16 px-4">
          <div className="mx-auto max-w-lg w-full">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
                  Candidatura recebida!
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Obrigado, <strong className="text-foreground">{form.nome.split(" ")[0]}</strong>!
                  Seu cadastro está em análise.
                </p>
              </div>

              <div className="mt-8 border-t border-border pt-6 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Próximos passos
                </p>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-semibold text-foreground">Análise em até 24h</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Nossa equipe vai revisar seu cadastro e te avisar pelo WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Inbox className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      Verifique seu e-mail
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Quando aprovado, enviamos um link seguro para <strong className="text-foreground">{form.email}</strong> para você criar sua senha.
                      <br />
                      <span className="text-amber-700">Cheque também o spam.</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Smartphone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-semibold text-foreground">Instale o app agora</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Adianta tempo: instala já no celular pra receber push quando aprovar.
                    </p>
                    <div className="mt-3">
                      <InstallPWAButton />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline" className="flex-1">
                  <Link to="/">Voltar para Home</Link>
                </Button>
                <Button asChild className="flex-1">
                  <Link to="/corretor/login">Ir para o Login</Link>
                </Button>
              </div>

              <div className="mt-6 pt-6 border-t border-border">
                <FaithQuote variant="muted" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* ================= HERO ================= */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#0D1117] via-[#0a1628] to-[#0D1117] text-white">
          {/* Background decor */}
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.35), transparent 45%), radial-gradient(circle at 80% 60%, hsl(var(--accent) / 0.25), transparent 50%)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 opacity-[0.05]" style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }} />

          <div className="container-app relative py-6 sm:py-8">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para Home
            </Link>
          </div>

          <div className="container-app relative pt-4 pb-16 sm:pt-8 sm:pb-24">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
              {/* Coluna texto */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span className="text-xs font-medium text-white/80">
                    Recrutamento aberto · São Paulo
                  </span>
                </div>

                <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                  Receba leads <span className="bg-gradient-to-r from-[#00E6FF] to-[#007BFF] bg-clip-text text-transparent">no seu WhatsApp</span>.
                  <br />
                  Instale como <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">app no celular</span>.
                  <br />
                  Deixe a <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">IA atender por você</span>.
                </h1>

                <p className="mt-5 max-w-xl text-base text-white/70 sm:text-lg">
                  A NegociaAky é a plataforma de corretores de São Paulo que entrega lead qualificado,
                  vira app no seu celular e tem IA atendendo seus interessados 24h.
                  <span className="font-semibold text-white"> Você só fecha negócio.</span>
                </p>

                {/* Pills 3 angulos */}
                <div className="mt-6 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                    <MessageCircle className="h-3.5 w-3.5" /> Lead direto no Zap
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1.5 text-xs font-medium text-cyan-300 ring-1 ring-primary/40">
                    <Smartphone className="h-3.5 w-3.5" /> App PWA no celular
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-3 py-1.5 text-xs font-medium text-violet-300 ring-1 ring-violet-500/30">
                    <Bot className="h-3.5 w-3.5" /> IA atende 24h
                  </span>
                </div>

                {/* CTAs */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    size="lg"
                    onClick={scrollToForm}
                    className="bg-gradient-to-r from-[#007BFF] to-[#00E6FF] text-white font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:scale-[1.02]"
                  >
                    Quero ser corretor NegociaAky
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-white/60">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    Cadastro grátis · aprovação em 24h
                  </div>
                </div>

                {/* Numeros / prova social */}
                <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
                  <div>
                    <p className="font-display text-2xl font-bold text-white">+R$ 18M</p>
                    <p className="text-xs text-white/60">em VGV negociado</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-white">&lt; 30s</p>
                    <p className="text-xs text-white/60">lead no seu Zap</p>
                  </div>
                  <div>
                    <p className="font-display text-2xl font-bold text-white">24h</p>
                    <p className="text-xs text-white/60">IA atendendo</p>
                  </div>
                </div>
              </div>

              {/* Coluna mockup celular */}
              <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:ml-auto">
                <div className="relative">
                  {/* Glow */}
                  <div className="absolute -inset-6 rounded-[3rem] bg-gradient-to-br from-primary/30 via-accent/20 to-transparent blur-2xl" />

                  {/* Phone frame */}
                  <div className="relative rounded-[2.5rem] border-[10px] border-zinc-800 bg-zinc-900 shadow-2xl">
                    {/* notch */}
                    <div className="absolute left-1/2 top-0 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-zinc-800" />

                    <div className="overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-[#075E54] to-[#128C7E] p-3 pt-8">
                      {/* WhatsApp header */}
                      <div className="flex items-center gap-2 px-1 pb-3 text-white">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                          NA
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold leading-tight">NegociaAky Bot</p>
                          <p className="text-[10px] text-white/70">online · agora</p>
                        </div>
                        <BellRing className="h-4 w-4 text-white/80" />
                      </div>

                      {/* Chat bg */}
                      <div
                        className="space-y-2 rounded-xl p-3 min-h-[380px]"
                        style={{
                          background: "#e7ddd2",
                          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,0,0,0.05) 1px, transparent 0)",
                          backgroundSize: "16px 16px",
                        }}
                      >
                        {/* lead message */}
                        <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-[#dcf8c6] px-3 py-2 shadow-sm">
                          <p className="text-[11px] font-semibold text-emerald-700">🔔 Lead Qualificado · Vila Madalena</p>
                          <p className="mt-1 text-xs text-zinc-800">
                            <strong>Marcelo S.</strong> tem interesse no salão da R. Aspicuelta.
                            Orçamento: <strong>R$ 280k</strong>. Quer agendar visita esta semana.
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-500">14:32 ✓✓</p>
                        </div>

                        {/* corretor reply */}
                        <div className="max-w-[80%] rounded-lg rounded-tl-sm bg-white px-3 py-2 shadow-sm">
                          <p className="text-xs text-zinc-800">Bora! Quinta às 15h serve?</p>
                          <p className="mt-1 text-[10px] text-zinc-500">14:33</p>
                        </div>

                        {/* IA confirmando */}
                        <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-[#dcf8c6] px-3 py-2 shadow-sm">
                          <p className="text-[11px] font-semibold text-emerald-700">🤖 IA confirmou</p>
                          <p className="mt-1 text-xs text-zinc-800">
                            Marcelo confirmou quinta 15h. Endereço enviado. Te lembro 1h antes.
                          </p>
                          <p className="mt-1 text-[10px] text-zinc-500">14:33 ✓✓</p>
                        </div>

                        {/* Comissão preview */}
                        <div className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-gradient-to-br from-amber-100 to-amber-50 px-3 py-2 shadow-sm border border-amber-200">
                          <p className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
                            <Wallet className="h-3 w-3" /> Comissão prevista
                          </p>
                          <p className="mt-1 font-display text-base font-bold text-amber-900">R$ 8.400</p>
                          <p className="text-[10px] text-amber-700">3% sobre R$ 280k</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Floating badges */}
                  <div className="absolute -left-4 top-16 hidden sm:flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-xl backdrop-blur">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold text-zinc-800">Lead em 12s</span>
                  </div>
                  <div className="absolute -right-4 bottom-24 hidden sm:flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-xl backdrop-blur">
                    <Bot className="h-4 w-4 text-violet-500" />
                    <span className="text-xs font-semibold text-zinc-800">IA respondeu</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wave divider */}
          <svg className="block w-full text-background" viewBox="0 0 1440 64" preserveAspectRatio="none" aria-hidden>
            <path fill="currentColor" d="M0 32 Q360 0 720 32 T1440 32 V64 H0 Z" />
          </svg>
        </section>

        {/* ================= DIFERENCIAIS ================= */}
        <section className="py-16 sm:py-20">
          <div className="container-app">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wide">
                Por que NegociaAky
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold text-foreground sm:text-4xl">
                A combinação que nenhuma plataforma de corretor oferece junto
              </h2>
              <p className="mt-4 text-muted-foreground">
                Lead no Zap + app no celular + IA atendendo. Os 3 ângulos trabalhando ao mesmo tempo na sua carteira.
              </p>
            </div>

            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {DIFERENCIAIS.map((d) => {
                const Icon = d.icon;
                return (
                  <div
                    key={d.titulo}
                    className={`relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5`}
                  >
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${d.cor}`} />
                    <div className="relative">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card shadow-sm ring-1 ring-border">
                        <Icon className={`h-6 w-6 ${d.iconCor}`} />
                      </div>
                      <h3 className="mt-4 font-display text-lg font-bold text-foreground">{d.titulo}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= PROVA DE VALOR / COMISSÃO ================= */}
        <section className="py-16 sm:py-20 bg-muted/30">
          <div className="container-app">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div>
                <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Quanto você ganha
                </span>
                <h2 className="mt-4 font-display text-3xl font-bold text-foreground sm:text-4xl">
                  Comissão direta. Sem intermediário comendo seu corte.
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Você fecha o negócio, a comissão cai na sua conta. Sem rateio entre 5 imobiliárias, sem desconto de "captação", sem zona cinzenta.
                </p>

                <ul className="mt-6 space-y-3">
                  {[
                    "3% sobre transações de negócios até R$ 500k",
                    "5% sobre carteira exclusiva da sua região",
                    "Bônus por captação de novos negócios na plataforma",
                    "Pagamento via PIX em até 7 dias após o fechamento",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </div>
                      <span className="text-sm text-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Calc preview */}
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent blur-2xl" />
                <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xl">
                  <div className="flex items-center gap-2 border-b border-border pb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                      <Wallet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Simulação de Comissão</p>
                      <p className="text-xs text-muted-foreground">Exemplo real Vila Mariana</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Venda da padaria</span>
                      <span className="font-semibold text-foreground">R$ 320.000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sua comissão (3%)</span>
                      <span className="font-bold text-emerald-600">R$ 9.600</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">+ Bônus captação</span>
                      <span className="font-bold text-emerald-600">R$ 1.200</span>
                    </div>
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">Total no PIX</span>
                        <span className="font-display text-2xl font-bold text-emerald-600">R$ 10.800</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    💡 Corretores comprometidos fecham em média <strong>2,3 negócios/mês</strong> na plataforma.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= COMPARATIVO ================= */}
        <section className="py-16 sm:py-20">
          <div className="container-app">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wide">
                Antes vs Agora
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold text-foreground sm:text-4xl">
                A diferença de trabalhar com NegociaAky
              </h2>
            </div>

            <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr]">
                <div className="hidden md:block border-b border-border bg-muted/40 px-6 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categoria</p>
                </div>
                <div className="border-b border-border bg-red-50/40 px-6 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-700 flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5" /> Sem NegociaAky
                  </p>
                </div>
                <div className="border-b border-border bg-emerald-50/40 px-6 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} /> Com NegociaAky
                  </p>
                </div>

                {COMPARATIVO.map((row, i) => (
                  <div key={row.label} className={`contents`}>
                    <div className={`hidden md:flex items-center px-6 py-4 ${i % 2 ? "bg-muted/20" : ""}`}>
                      <p className="text-sm font-semibold text-foreground">{row.label}</p>
                    </div>
                    <div className={`px-6 py-4 ${i % 2 ? "bg-muted/20" : ""}`}>
                      <p className="md:hidden text-xs font-semibold text-muted-foreground mb-1">{row.label}</p>
                      <div className="flex items-start gap-2">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                        <p className="text-sm text-muted-foreground">{row.sem}</p>
                      </div>
                    </div>
                    <div className={`px-6 py-4 ${i % 2 ? "bg-muted/20" : ""}`}>
                      <div className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={3} />
                        <p className="text-sm text-foreground font-medium">{row.com}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= COMO FUNCIONA ================= */}
        <section className="py-16 sm:py-20 bg-gradient-to-b from-background to-muted/20">
          <div className="container-app">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary uppercase tracking-wide">
                Em 3 passos
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold text-foreground sm:text-4xl">
                Do cadastro ao primeiro lead em &lt; 24h
              </h2>
            </div>

            <div className="mx-auto mt-12 max-w-4xl">
              <div className="grid gap-6 md:grid-cols-3">
                {PASSOS.map((p, i) => (
                  <div key={p.num} className="relative">
                    {i < PASSOS.length - 1 && (
                      <div className="absolute left-full top-10 z-0 hidden h-px w-full -translate-x-4 bg-gradient-to-r from-primary/40 to-transparent md:block" />
                    )}
                    <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm">
                      <span className="font-display text-5xl font-bold text-primary/20">{p.num}</span>
                      <h3 className="mt-2 font-display text-lg font-bold text-foreground">{p.titulo}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= FORMULÁRIO ================= */}
        <section id="form-cadastro" className="py-16 sm:py-20 scroll-mt-20">
          <div className="container-app">
            <div className="mx-auto max-w-xl">
              <div className="text-center mb-8">
                <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 uppercase tracking-wide">
                  Cadastro grátis
                </span>
                <h2 className="mt-4 font-display text-3xl font-bold text-foreground sm:text-4xl">
                  Comece hoje. Receba seu primeiro lead amanhã.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Preenche em 2 minutos. Aprovamos em até 24h. Você instala o app e os leads começam a chegar no seu WhatsApp.
                </p>
              </div>

              <div className="mb-6 flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Já é corretor cadastrado?
                </p>
                <Link
                  to="/corretor/login"
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  Entrar no painel →
                </Link>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-lg">
                <h3 className="font-display text-xl font-bold text-foreground mb-6">
                  Cadastre-se como corretor
                </h3>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <Label htmlFor="nome">Nome completo *</Label>
                    <Input id="nome" className={`mt-2 ${errors.nome ? "border-destructive" : ""}`}
                      placeholder="Seu nome" value={form.nome}
                      onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
                    {err("nome")}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="whatsapp">WhatsApp *</Label>
                      <Input
                        id="whatsapp"
                        type="tel"
                        inputMode="numeric"
                        className={`mt-2 ${errors.whatsapp ? "border-destructive" : ""}`}
                        placeholder="(11) 9 9999-9999"
                        value={form.whatsapp}
                        onChange={(e) => setForm((p) => ({ ...p, whatsapp: formatWhatsApp(e.target.value) }))}
                      />
                      {err("whatsapp")}
                    </div>
                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <Input id="email" type="email" className={`mt-2 ${errors.email ? "border-destructive" : ""}`}
                        placeholder="seu@email.com" value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                      {err("email")}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="creci">CRECI (opcional)</Label>
                    <Input id="creci" className="mt-2"
                      placeholder="Ex: 123456-F ou SP-123456"
                      value={form.creci}
                      onChange={(e) => setForm((p) => ({ ...p, creci: e.target.value }))} />
                    <p className="mt-1 text-xs text-muted-foreground">Se ainda não tiver, pode deixar em branco.</p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="cep">CEP de atuação</Label>
                      <Input
                        id="cep"
                        inputMode="numeric"
                        className="mt-2"
                        placeholder="00000-000"
                        value={form.cep}
                        onChange={(e) => setForm((p) => ({ ...p, cep: formatCep(e.target.value) }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bairro">Bairro / Região principal</Label>
                      <Input id="bairro" className="mt-2" placeholder="Ex: Vila Madalena"
                        value={form.bairro}
                        onChange={(e) => setForm((p) => ({ ...p, bairro: e.target.value }))} />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <Label>Área de atuação *</Label>
                      <Select value={form.atuacao} onValueChange={(v) => setForm((p) => ({ ...p, atuacao: v }))}>
                        <SelectTrigger className={`mt-2 ${errors.atuacao ? "border-destructive" : ""}`}>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="negocios">Negócios / Empresas</SelectItem>
                          <SelectItem value="imoveis">Imóveis Comerciais</SelectItem>
                          <SelectItem value="franquias">Franquias</SelectItem>
                          <SelectItem value="galerias">Galerias Comerciais</SelectItem>
                          <SelectItem value="todos">Todos os segmentos</SelectItem>
                        </SelectContent>
                      </Select>
                      {err("atuacao")}
                    </div>
                    <div>
                      <Label>Experiência no setor</Label>
                      <Select value={form.experiencia} onValueChange={(v) => setForm((p) => ({ ...p, experiencia: v }))}>
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iniciante">Iniciante (menos de 1 ano)</SelectItem>
                          <SelectItem value="1-3">1 a 3 anos</SelectItem>
                          <SelectItem value="3-5">3 a 5 anos</SelectItem>
                          <SelectItem value="5+">Mais de 5 anos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">Motivações & Objetivos</p>

                    <div>
                      <Label htmlFor="motivacao">Por que você quer ser corretor NegociaAky?</Label>
                      <Textarea
                        id="motivacao"
                        className="mt-2 bg-card"
                        rows={2}
                        placeholder="Ex: Tenho paixão por conectar empreendedores e ajudar negócios a crescerem..."
                        value={form.motivacao}
                        onChange={(e) => setForm((p) => ({ ...p, motivacao: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="objetivo">Como pretende contribuir para o crescimento da plataforma?</Label>
                      <Textarea
                        id="objetivo"
                        className="mt-2 bg-card"
                        rows={2}
                        placeholder="Ex: Vou prospectar ativamente negócios na minha região e fortalecer a rede de corretores..."
                        value={form.objetivo}
                        onChange={(e) => setForm((p) => ({ ...p, objetivo: e.target.value }))}
                      />
                    </div>

                    <label className={`flex items-start gap-3 cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      form.comprometido
                        ? "border-green-500 bg-green-50"
                        : "border-border bg-card hover:border-primary/40"
                    }`}>
                      <div className="relative mt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={form.comprometido}
                          onChange={(e) => setForm((p) => ({ ...p, comprometido: e.target.checked }))}
                        />
                        <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          form.comprometido ? "border-green-500 bg-green-500" : "border-border bg-background"
                        }`}>
                          {form.comprometido && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${form.comprometido ? "text-green-700" : "text-foreground"}`}>
                          Me comprometo a trazer ao menos 3 captações nos próximos 30 dias
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Corretores comprometidos têm prioridade na distribuição de leads da plataforma.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="sobre">Sobre você (opcional)</Label>
                      <button
                        type="button"
                        onClick={handleGerarSugestoes}
                        disabled={iaLoading}
                        className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                      >
                        {iaLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {iaLoading ? "Gerando..." : "Gerar com IA"}
                      </button>
                    </div>
                    <Textarea id="sobre" className="mt-1" rows={4}
                      placeholder="Conte um pouco sobre sua experiência, região de atuação em SP, etc."
                      value={form.sobre} onChange={(e) => setForm((p) => ({ ...p, sobre: e.target.value }))} />

                    {iaSugestoes.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Escolha uma sugestão para usar:</p>
                        {iaSugestoes.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => { setForm((p) => ({ ...p, sobre: s })); setIaSugestoes([]); }}
                            className="w-full text-left rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors"
                          >
                            <span className="block font-semibold text-primary text-xs mb-1">Opção {i + 1}</span>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#007BFF] to-[#00E6FF] text-white font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all hover:scale-[1.01]"
                    size="lg"
                  >
                    Quero ser corretor NegociaAky
                    <Rocket className="ml-1 h-4 w-4" />
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Cadastro 100% grátis · Sem mensalidade · Você só paga se vender
                  </p>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ================= BOTTOM CTA ================= */}
        <section className="py-16 sm:py-20 bg-gradient-to-br from-[#0D1117] via-[#0a1628] to-[#0D1117] text-white">
          <div className="container-app">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">
                Conecta. Negocia. Realiza.
              </h2>
              <p className="mt-4 text-white/70">
                A NegociaAky é onde corretor de verdade fecha mais negócio. Sem fricção, sem planilha, sem perder lead pra concorrência.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={scrollToForm}
                  className="bg-gradient-to-r from-[#007BFF] to-[#00E6FF] text-white font-semibold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all hover:scale-[1.02]"
                >
                  Cadastrar agora
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/5 text-white hover:bg-white/10"
                >
                  <Link to="/corretor/login">
                    Já sou corretor · Entrar
                  </Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/60">
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Cadastro em 2 min
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Aprovação em 24h
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Sem mensalidade
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Pagamento via PIX
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SejaCorretor;
