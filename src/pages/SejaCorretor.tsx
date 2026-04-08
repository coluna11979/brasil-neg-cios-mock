import { useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/uazapi";
import { ArrowLeft, CheckCircle, UserCheck, TrendingUp, Handshake, Wallet } from "lucide-react";
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
  { icon: UserCheck, titulo: "Perfil verificado", desc: "Seu perfil aparece como corretor certificado NegócioJá." },
];

const SejaCorretor = () => {
  usePageTitle("Seja um Corretor – NegócioJá");

  const [enviado, setEnviado] = useState(false);
  const [form, setForm] = useState({
    nome: "", whatsapp: "", email: "", cidade: "São Paulo",
    creci: "", experiencia: "", atuacao: "", sobre: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Obrigatório";
    if (!form.whatsapp.trim()) e.whatsapp = "Obrigatório";
    if (!form.email.trim() || !form.email.includes("@")) e.email = "E-mail inválido";
    if (!form.atuacao) e.atuacao = "Obrigatório";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // 1. Cria conta no Supabase Auth (senha temporária — corretor vai redefinir depois)
    const senhaTemp = `NJ_${Math.random().toString(36).slice(2, 10)}`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: senhaTemp,
      options: { data: { nome: form.nome } },
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
        `https://negocioja.com.br/admin/corretores`
      ).catch(() => {});
    }

    // 4. WhatsApp para o CORRETOR com instruções de acesso
    const telefoneCorretor = form.whatsapp.replace(/\D/g, "");
    if (telefoneCorretor.length >= 10) {
      await sendWhatsAppMessage(
        telefoneCorretor,
        `Olá, *${form.nome.split(" ")[0]}*! 👋\n\n` +
        `Recebemos sua candidatura na *NegócioJá* e já está em análise pela nossa equipe.\n\n` +
        `⏳ Em até 24h você será aprovado e receberá outro aviso aqui.\n\n` +
        `Após a aprovação, acesse seu painel em:\n` +
        `🔗 negocioja.com.br/corretor/login\n` +
        `📧 Login: *${form.email}*\n` +
        `🔑 Senha temporária: *${senhaTemp}*\n\n` +
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
                Seja um Corretor NegócioJá
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

                  <div>
                    <Label htmlFor="sobre">Sobre você (opcional)</Label>
                    <Textarea id="sobre" className="mt-2" rows={3}
                      placeholder="Conte um pouco sobre sua experiência, região de atuação em SP, etc."
                      value={form.sobre} onChange={(e) => setForm((p) => ({ ...p, sobre: e.target.value }))} />
                  </div>

                  <Button type="submit" className="w-full font-semibold" size="lg">
                    Enviar Candidatura
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SejaCorretor;
