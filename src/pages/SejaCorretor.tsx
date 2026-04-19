import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/uazapi";
import { login } from "@/stores/authStore";
import { ArrowLeft, CheckCircle, UserCheck, TrendingUp, Handshake, Wallet, LogIn, AlertCircle, Clock, Sparkles, Loader2 } from "lucide-react";
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

const BENEFICIOS = [
  { icon: Wallet, titulo: "Comissão atrativa", desc: "Ganhe por cada negócio fechado na sua carteira." },
  { icon: TrendingUp, titulo: "Carteira exclusiva", desc: "Acesso antecipado a novos anúncios na sua região." },
  { icon: Handshake, titulo: "Suporte completo", desc: "Treinamento, ferramentas e suporte da plataforma." },
  { icon: UserCheck, titulo: "Perfil verificado", desc: "Seu perfil aparece como corretor certificado NegociaAky." },
];

const SejaCorretor = () => {
  usePageTitle("Seja um Corretor – NegociaAky");
  const navigate = useNavigate();

  const [modo, setModo] = useState<"cadastro" | "login">("cadastro");
  const [loginForm, setLoginForm] = useState({ email: "", senha: "" });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginPendente, setLoginPendente] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginPendente(false);
    setLoginLoading(true);
    try {
      const success = await login(loginForm.email, loginForm.senha);
      if (success) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("ativo, role")
            .eq("id", user.id)
            .single();
          if (profile?.role === "corretor" && !profile?.ativo) {
            await supabase.auth.signOut();
            setLoginPendente(true);
            return;
          }
        }
        navigate("/corretor/mensagens");
      } else {
        setLoginError("E-mail ou senha incorretos.");
      }
    } catch {
      setLoginError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoginLoading(false);
    }
  };

  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({
    nome: "", whatsapp: "", email: "", cidade: "São Paulo",
    creci: "", experiencia: "", atuacao: "", sobre: "",
    dataNascimento: "", cidadeNascimento: "", estadoNascimento: "",
    motivacao: "", objetivo: "", comprometido: false,
    bairro: "", cep: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [iaLoading, setIaLoading] = useState(false);
  const [iaSugestoes, setIaSugestoes] = useState<string[]>([]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Obrigatório";
    if (!form.whatsapp.trim()) e.whatsapp = "Obrigatório";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "E-mail inválido";
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
- Data de nascimento: ${form.dataNascimento || "não informada"}
- Cidade/Estado de nascimento: ${form.cidadeNascimento ? `${form.cidadeNascimento}/${form.estadoNascimento}` : "não informado"}
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

    // 1. Cria conta no Supabase Auth (senha temporária — corretor vai redefinir depois)
    const senhaTemp = `NJ_${Math.random().toString(36).slice(2, 10)}`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: senhaTemp,
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

    // 2. Salva perfil na tabela profiles com ativo = false
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
      // Se usuário já existia, busca pelo email e atualiza
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

    // 3. Alerta WhatsApp para o ADMIN
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

    // 4. WhatsApp para o CORRETOR com instruções de acesso
    const telefoneCorretor = form.whatsapp.replace(/\D/g, "");
    if (telefoneCorretor.length >= 10) {
      await sendWhatsAppMessage(
        telefoneCorretor,
        `Olá, *${form.nome.split(" ")[0]}*! 👋\n\n` +
        `Recebemos sua candidatura na *NegociaAky* e já está em análise pela nossa equipe.\n\n` +
        `⏳ Em até 24h você será aprovado e receberá outro aviso aqui.\n\n` +
        `Após a aprovação, acesse seu painel em:\n` +
        `🔗 negociaaky.com.br/corretor/login\n` +
        `📧 Login: *${form.email}*\n` +
        `🔑 Senha temporária: ${senhaTemp}\n\n` +
        `_Recomendamos trocar a senha no primeiro acesso._\n\n` +
        `Qualquer dúvida, é só responder aqui! 😊`
      ).catch(() => {});
    }

    setEnviado(true);
  };

  const err = (field: string) =>
    errors[field] ? <p className="mt-1 text-xs text-destructive">{errors[field]}</p> : null;

  if (enviado) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center py-16 px-4">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
              Candidatura Recebida!
            </h1>
            <p className="mt-3 text-muted-foreground">
              Obrigado, <strong className="text-foreground">{form.nome}</strong>! Recebemos seu cadastro.
              Nossa equipe vai analisar e entrar em contato pelo WhatsApp em breve.
            </p>
            <Button asChild className="mt-8">
              <Link to="/">Voltar para Home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container-app">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Home
          </Link>

          <div className="mt-8 mx-auto max-w-4xl">
            {/* Hero */}
            <div className="text-center mb-12">
              <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary mb-4">
                Seja um Parceiro
              </span>
              <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
                Seja um Corretor NegociaAky
              </h1>
              <p className="mt-4 max-w-xl mx-auto text-muted-foreground">
                Junte-se à nossa rede de corretores especializados em compra e venda de negócios em São Paulo.
                Trabalhe com autonomia e ganhe comissões atrativas.
              </p>
            </div>

            {/* Benefícios */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-12">
              {BENEFICIOS.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.titulo} className="rounded-xl border border-border bg-card p-5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground">{b.titulo}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Formulário */}
            <div className="mx-auto max-w-xl">
              {/* Toggle cadastro / login */}
              <div className="flex rounded-xl border border-border bg-muted/40 p-1 mb-6">
                <button
                  type="button"
                  onClick={() => setModo("cadastro")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${modo === "cadastro" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Quero me cadastrar
                </button>
                <button
                  type="button"
                  onClick={() => setModo("login")}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${modo === "login" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Já sou cadastrado
                </button>
              </div>

              {/* Login form */}
              {modo === "login" && (
                <div className="rounded-xl border border-border bg-card p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <LogIn className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">Entrar no painel</h2>
                      <p className="text-xs text-muted-foreground">Acesse seu CRM de corretor</p>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    {loginPendente && (
                      <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                        <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                        <div>
                          <p className="font-semibold">Cadastro em análise</p>
                          <p className="mt-0.5 text-amber-700">Sua conta ainda não foi aprovada. Em até 24h você receberá um aviso pelo WhatsApp.</p>
                        </div>
                      </div>
                    )}
                    {loginError && (
                      <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {loginError}
                      </div>
                    )}
                    <div>
                      <Label htmlFor="login-email">E-mail</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))}
                        className="mt-1.5"
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-senha">Senha</Label>
                      <Input
                        id="login-senha"
                        type="password"
                        placeholder="Sua senha"
                        value={loginForm.senha}
                        onChange={(e) => setLoginForm((p) => ({ ...p, senha: e.target.value }))}
                        className="mt-1.5"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full gap-2 font-semibold" size="lg" disabled={loginLoading}>
                      <LogIn className="h-4 w-4" />
                      {loginLoading ? "Entrando..." : "Entrar no meu painel"}
                    </Button>
                  </form>
                </div>
              )}

              {/* Cadastro form */}
              {modo === "cadastro" && (
              <div className="rounded-xl border border-border bg-card p-8">
                <h2 className="font-display text-xl font-bold text-foreground mb-6">
                  Cadastre-se como corretor
                </h2>

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
                      <Input id="whatsapp" className={`mt-2 ${errors.whatsapp ? "border-destructive" : ""}`}
                        placeholder="(11) 9 0000-0000" value={form.whatsapp}
                        onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} />
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
                      <Input id="cep" className="mt-2" placeholder="00000-000"
                        maxLength={9}
                        value={form.cep}
                        onChange={(e) => setForm((p) => ({ ...p, cep: e.target.value }))} />
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

                  {/* Data e local de nascimento */}
                  <div className="grid gap-5 sm:grid-cols-3">
                    <div>
                      <Label htmlFor="dataNascimento">Data de nascimento</Label>
                      <Input id="dataNascimento" type="date" className="mt-2"
                        value={form.dataNascimento}
                        onChange={(e) => setForm((p) => ({ ...p, dataNascimento: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="cidadeNascimento">Cidade natal</Label>
                      <Input id="cidadeNascimento" className="mt-2" placeholder="Ex: Recife"
                        value={form.cidadeNascimento}
                        onChange={(e) => setForm((p) => ({ ...p, cidadeNascimento: e.target.value }))} />
                    </div>
                    <div>
                      <Label htmlFor="estadoNascimento">Estado natal</Label>
                      <Input id="estadoNascimento" className="mt-2" placeholder="Ex: PE"
                        maxLength={2}
                        value={form.estadoNascimento}
                        onChange={(e) => setForm((p) => ({ ...p, estadoNascimento: e.target.value.toUpperCase() }))} />
                    </div>
                  </div>

                  {/* Motivação e Objetivos */}
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

                    {/* Checkbox de comprometimento */}
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

                  {/* Sobre você com IA */}
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

                    {/* Sugestões da IA */}
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

                  <Button type="submit" className="w-full font-semibold" size="lg">
                    Enviar Candidatura
                  </Button>
                </form>
              </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SejaCorretor;
