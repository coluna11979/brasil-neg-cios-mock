import { useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import {
  ArrowLeft,
  CheckCircle,
  Send,
  Building2,
  DollarSign,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  TrendingUp,
  Ruler,
} from "lucide-react";
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
import { supabase } from "@/lib/supabase";

const CATEGORIAS = [
  "Alimentação",
  "Saúde e Estética",
  "Serviços",
  "Varejo",
  "Tecnologia",
  "Educação",
  "Automotivo",
  "Indústria",
  "Imóveis Comerciais",
  "Outro",
];

const ESTADOS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const VenderNegocio = () => {
  usePageTitle("Quero Vender Meu Negócio");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    titulo: "",
    categoria: "",
    cidade: "",
    estado: "",
    preco: "",
    faturamento_mensal: "",
    area_m2: "",
    descricao: "",
    proprietario_nome: "",
    proprietario_telefone: "",
    proprietario_email: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.titulo.trim()) newErrors.titulo = "Título é obrigatório";
    if (!form.categoria) newErrors.categoria = "Selecione uma categoria";
    if (!form.cidade.trim()) newErrors.cidade = "Cidade é obrigatória";
    if (!form.estado) newErrors.estado = "Selecione o estado";
    if (!form.proprietario_nome.trim()) newErrors.proprietario_nome = "Nome é obrigatório";
    if (!form.proprietario_email.trim()) {
      newErrors.proprietario_email = "E-mail é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.proprietario_email)) {
      newErrors.proprietario_email = "E-mail inválido";
    }
    if (!form.descricao.trim()) newErrors.descricao = "Descreva seu negócio";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    const { error } = await supabase.from("negocios").insert({
      titulo: form.titulo,
      categoria: form.categoria,
      cidade: form.cidade,
      estado: form.estado,
      preco: form.preco ? Number(form.preco) : null,
      faturamento_mensal: form.faturamento_mensal ? Number(form.faturamento_mensal) : null,
      area_m2: form.area_m2 ? Number(form.area_m2) : null,
      descricao: form.descricao,
      proprietario_nome: form.proprietario_nome,
      proprietario_telefone: form.proprietario_telefone || null,
      proprietario_email: form.proprietario_email,
      status: "pendente",
      tipo: "venda",
    });

    setLoading(false);

    if (error) {
      console.error("Erro ao cadastrar:", error);
      setErrors({ submit: "Erro ao cadastrar. Tente novamente." });
    } else {
      setEnviado(true);
    }
  };

  if (enviado) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="mx-auto max-w-md text-center px-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
              Negócio Cadastrado!
            </h1>
            <p className="mt-4 text-muted-foreground">
              Seu negócio foi enviado para análise. Nossa equipe de corretores entrará em contato
              em até <strong className="text-foreground">24 horas</strong> para os próximos passos.
            </p>
            <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm text-foreground">
                <strong>O que acontece agora?</strong>
              </p>
              <ul className="mt-2 text-sm text-muted-foreground text-left space-y-1">
                <li>1. Corretor analisa as informações</li>
                <li>2. Entrevista com você para detalhes</li>
                <li>3. Avaliação e precificação</li>
                <li>4. Publicação na plataforma</li>
              </ul>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link to="/">Voltar ao Início</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/busca">Explorar Negócios</Link>
              </Button>
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

      <main className="flex-1 py-8">
        <div className="container-app">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <div className="mt-6 mx-auto max-w-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent mb-4">
                <Building2 className="h-4 w-4" />
                Cadastre seu negócio
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Quero Vender Meu Negócio
              </h1>
              <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
                Preencha as informações abaixo e um corretor especializado entrará em contato para avaliar e vender seu negócio.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {errors.submit && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errors.submit}
                </div>
              )}

              {/* Sobre o Negócio */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Sobre o Negócio
                </h2>

                <div>
                  <Label htmlFor="titulo">Nome / Título do Negócio *</Label>
                  <Input
                    id="titulo"
                    name="titulo"
                    value={form.titulo}
                    onChange={handleChange}
                    placeholder="Ex: Pizzaria Tradicional em Ponto Nobre"
                    className={`mt-1.5 ${errors.titulo ? "border-destructive" : ""}`}
                  />
                  {errors.titulo && <p className="mt-1 text-sm text-destructive">{errors.titulo}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Categoria *</Label>
                    <Select
                      value={form.categoria}
                      onValueChange={(v) => {
                        setForm((prev) => ({ ...prev, categoria: v }));
                        if (errors.categoria) setErrors((prev) => ({ ...prev, categoria: "" }));
                      }}
                    >
                      <SelectTrigger className={`mt-1.5 ${errors.categoria ? "border-destructive" : ""}`}>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoria && <p className="mt-1 text-sm text-destructive">{errors.categoria}</p>}
                  </div>

                  <div>
                    <Label htmlFor="area_m2">Área (m²)</Label>
                    <div className="relative mt-1.5">
                      <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="area_m2"
                        name="area_m2"
                        type="number"
                        value={form.area_m2}
                        onChange={handleChange}
                        placeholder="150"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="cidade">Cidade *</Label>
                    <div className="relative mt-1.5">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="cidade"
                        name="cidade"
                        value={form.cidade}
                        onChange={handleChange}
                        placeholder="São Paulo"
                        className={`pl-10 ${errors.cidade ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.cidade && <p className="mt-1 text-sm text-destructive">{errors.cidade}</p>}
                  </div>

                  <div>
                    <Label>Estado *</Label>
                    <Select
                      value={form.estado}
                      onValueChange={(v) => {
                        setForm((prev) => ({ ...prev, estado: v }));
                        if (errors.estado) setErrors((prev) => ({ ...prev, estado: "" }));
                      }}
                    >
                      <SelectTrigger className={`mt-1.5 ${errors.estado ? "border-destructive" : ""}`}>
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map((e) => (
                          <SelectItem key={e} value={e}>{e}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.estado && <p className="mt-1 text-sm text-destructive">{errors.estado}</p>}
                  </div>
                </div>

                <div>
                  <Label htmlFor="descricao">Descrição do Negócio *</Label>
                  <Textarea
                    id="descricao"
                    name="descricao"
                    value={form.descricao}
                    onChange={handleChange}
                    placeholder="Descreva seu negócio: tempo de operação, ponto comercial, equipe, diferenciais, motivo da venda..."
                    rows={5}
                    className={`mt-1.5 ${errors.descricao ? "border-destructive" : ""}`}
                  />
                  {errors.descricao && <p className="mt-1 text-sm text-destructive">{errors.descricao}</p>}
                </div>
              </div>

              {/* Valores */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Informações Financeiras
                </h2>
                <p className="text-sm text-muted-foreground -mt-3">
                  Opcional — ajuda o corretor na avaliação
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="preco">Valor Pretendido (R$)</Label>
                    <div className="relative mt-1.5">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="preco"
                        name="preco"
                        type="number"
                        value={form.preco}
                        onChange={handleChange}
                        placeholder="350000"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="faturamento_mensal">Faturamento Mensal (R$)</Label>
                    <div className="relative mt-1.5">
                      <TrendingUp className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="faturamento_mensal"
                        name="faturamento_mensal"
                        type="number"
                        value={form.faturamento_mensal}
                        onChange={handleChange}
                        placeholder="45000"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Dados do Proprietário */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Seus Dados de Contato
                </h2>

                <div>
                  <Label htmlFor="proprietario_nome">Nome Completo *</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="proprietario_nome"
                      name="proprietario_nome"
                      value={form.proprietario_nome}
                      onChange={handleChange}
                      placeholder="Seu nome completo"
                      className={`pl-10 ${errors.proprietario_nome ? "border-destructive" : ""}`}
                    />
                  </div>
                  {errors.proprietario_nome && <p className="mt-1 text-sm text-destructive">{errors.proprietario_nome}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="proprietario_email">E-mail *</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="proprietario_email"
                        name="proprietario_email"
                        type="email"
                        value={form.proprietario_email}
                        onChange={handleChange}
                        placeholder="seu@email.com"
                        className={`pl-10 ${errors.proprietario_email ? "border-destructive" : ""}`}
                      />
                    </div>
                    {errors.proprietario_email && <p className="mt-1 text-sm text-destructive">{errors.proprietario_email}</p>}
                  </div>

                  <div>
                    <Label htmlFor="proprietario_telefone">WhatsApp / Telefone</Label>
                    <div className="relative mt-1.5">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="proprietario_telefone"
                        name="proprietario_telefone"
                        value={form.proprietario_telefone}
                        onChange={handleChange}
                        placeholder="(11) 99999-9999"
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 font-semibold text-base"
                disabled={loading}
              >
                <Send className="h-5 w-5" />
                {loading ? "Cadastrando..." : "Cadastrar Meu Negócio"}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Ao cadastrar, você concorda que um corretor da NegociaAky entre em contato para avaliação.
              </p>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VenderNegocio;
