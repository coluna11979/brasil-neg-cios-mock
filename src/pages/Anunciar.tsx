import { useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Home,
  Store,
  Award,
  CheckCircle,
  ChevronRight,
  MapPin,
  Sparkles,
  Loader2,
  TrendingUp,
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

type TipoAnuncio = "negocio" | "imovel" | "galeria" | "franquia";

const TIPOS = [
  {
    id: "negocio" as TipoAnuncio,
    icon: Store,
    titulo: "Negócio / Empresa",
    desc: "Venda de empresa, comércio, restaurante, serviços...",
  },
  {
    id: "imovel" as TipoAnuncio,
    icon: Home,
    titulo: "Imóvel Comercial",
    desc: "Venda ou aluguel de sala, loja, galpão, ponto comercial...",
  },
  {
    id: "galeria" as TipoAnuncio,
    icon: Building2,
    titulo: "Galeria Comercial",
    desc: "Galeria com espaços para locação: lojas, salas, boxes...",
  },
  {
    id: "franquia" as TipoAnuncio,
    icon: Award,
    titulo: "Franquia",
    desc: "Ofereça sua franquia ou compre uma unidade franqueada...",
  },
];

const CATEGORIAS_NEGOCIO = [
  "Alimentação", "Saúde e Beleza", "Serviços", "Varejo", "Tecnologia",
  "Educação", "Automotivo", "Indústria", "Entretenimento", "Outro",
];

const Anunciar = () => {
  usePageTitle("Anunciar Negócio");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitted, setSubmitted] = useState(false);
  const [tipo, setTipo] = useState<TipoAnuncio | null>(null);

  const [aiLoadingDesc, setAiLoadingDesc] = useState(false);
  const [aiLoadingPrice, setAiLoadingPrice] = useState(false);
  const [aiPriceSuggestion, setAiPriceSuggestion] = useState<string | null>(null);

  const handleGenerateDesc = async () => {
    if (!negocio.nome || !negocio.categoria) return;
    setAiLoadingDesc(true);
    try {
      const prompt = `Gere uma descrição de venda profissional e atraente para este negócio:
Nome: ${negocio.nome}
Categoria: ${negocio.categoria}
Anos de operação: ${negocio.anosOperacao || "não informado"}
Faturamento mensal: ${negocio.faturamento ? `R$ ${Number(negocio.faturamento).toLocaleString("pt-BR")}` : "não informado"}
Valor pedido: ${negocio.valorPedido ? `R$ ${Number(negocio.valorPedido).toLocaleString("pt-BR")}` : "não informado"}

Escreva entre 3 e 5 frases. Destaque o potencial, os diferenciais e o perfil ideal de comprador. Tom profissional mas acessível. Não use asteriscos nem markdown.`;
      const desc = await callClaude(prompt);
      setNegocio((p) => ({ ...p, descricao: desc.trim() }));
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoadingDesc(false);
    }
  };

  const handleEvaluatePrice = async () => {
    if (!negocio.categoria) return;
    setAiLoadingPrice(true);
    setAiPriceSuggestion(null);
    try {
      const prompt = `Avalie o preço de venda para este negócio no mercado brasileiro (São Paulo):
Categoria: ${negocio.categoria}
Anos de operação: ${negocio.anosOperacao || "não informado"}
Faturamento mensal: ${negocio.faturamento ? `R$ ${Number(negocio.faturamento).toLocaleString("pt-BR")}` : "não informado"}
Valor pedido pelo vendedor: ${negocio.valorPedido ? `R$ ${Number(negocio.valorPedido).toLocaleString("pt-BR")}` : "não informado"}

Responda em no máximo 3 linhas com: faixa de preço sugerida para este tipo de negócio em SP, múltiplo de faturamento típico do setor, e uma avaliação rápida se o preço pedido está adequado, acima ou abaixo do mercado. Seja direto e objetivo. Não use asteriscos.`;
      const result = await callClaude(prompt);
      setAiPriceSuggestion(result.trim());
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoadingPrice(false);
    }
  };

  // Campos dinâmicos por tipo
  const [negocio, setNegocio] = useState({
    categoria: "", nome: "", anosOperacao: "", faturamento: "", valorPedido: "", descricao: "",
  });
  const [imovel, setImovel] = useState({
    operacao: "venda", tipoImovel: "", area: "", valor: "", endereco: "", descricao: "",
  });
  const [galeria, setGaleria] = useState({
    nome: "", endereco: "", totalEspacos: "", valorMedio: "", descricao: "",
  });
  const [franquia, setFranquia] = useState({
    marca: "", segmento: "", investimento: "", taxaFranquia: "", royalties: "", descricao: "",
  });

  // Contato — sempre igual
  const [contato, setContato] = useState({ nome: "", whatsapp: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (tipo === "negocio") {
      if (!negocio.categoria) e.categoria = "Obrigatório";
      if (!negocio.nome.trim()) e.nome = "Obrigatório";
      if (!negocio.valorPedido) e.valorPedido = "Obrigatório";
      if (!negocio.descricao.trim()) e.descricao = "Obrigatório";
    }
    if (tipo === "imovel") {
      if (!imovel.tipoImovel) e.tipoImovel = "Obrigatório";
      if (!imovel.area) e.area = "Obrigatório";
      if (!imovel.valor) e.valor = "Obrigatório";
      if (!imovel.endereco.trim()) e.endereco = "Obrigatório";
    }
    if (tipo === "galeria") {
      if (!galeria.nome.trim()) e.nome = "Obrigatório";
      if (!galeria.endereco.trim()) e.endereco = "Obrigatório";
      if (!galeria.totalEspacos) e.totalEspacos = "Obrigatório";
    }
    if (tipo === "franquia") {
      if (!franquia.marca.trim()) e.marca = "Obrigatório";
      if (!franquia.segmento.trim()) e.segmento = "Obrigatório";
      if (!franquia.investimento) e.investimento = "Obrigatório";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateContato = () => {
    const e: Record<string, string> = {};
    if (!contato.nome.trim()) e.nome = "Obrigatório";
    if (!contato.whatsapp.trim()) e.whatsapp = "Obrigatório";
    if (!contato.email.trim() || !contato.email.includes("@")) e.email = "E-mail inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && tipo) { setStep(2); setErrors({}); }
    if (step === 2 && validateStep2()) { setStep(3); setErrors({}); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateContato()) setSubmitted(true);
  };

  const err = (field: string) =>
    errors[field] ? <p className="mt-1 text-xs text-destructive">{errors[field]}</p> : null;

  // ─── Sucesso ───────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center py-16 px-4">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
              Anúncio Recebido!
            </h1>
            <p className="mt-3 text-muted-foreground">
              Olá <strong className="text-foreground">{contato.nome}</strong>, recebemos seu anúncio.
              Um corretor NegócioJá entrará em contato pelo WhatsApp em breve para dar continuidade.
            </p>
            <div className="mt-6 rounded-lg border border-primary/20 bg-secondary p-4 text-sm text-left text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Próximos passos:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Corretor analisa as informações</li>
                <li>Validação e aprovação do anúncio</li>
                <li>Publicação no marketplace</li>
              </ul>
            </div>
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

          {/* Progress */}
          <div className="mt-6 mx-auto max-w-2xl">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
              <span className={step >= 1 ? "text-primary font-semibold" : ""}>1. Tipo</span>
              <ChevronRight className="h-4 w-4" />
              <span className={step >= 2 ? "text-primary font-semibold" : ""}>2. Detalhes</span>
              <ChevronRight className="h-4 w-4" />
              <span className={step >= 3 ? "text-primary font-semibold" : ""}>3. Contato</span>
            </div>

            {/* Aviso São Paulo */}
            <div className="mb-6 flex items-center gap-2 rounded-lg border border-primary/20 bg-secondary px-4 py-3 text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-muted-foreground">
                Por enquanto atendemos somente <strong className="text-foreground">São Paulo – SP</strong>.
              </span>
            </div>

            {/* ── STEP 1: Escolha o tipo ── */}
            {step === 1 && (
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                  O que você quer anunciar?
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Selecione o tipo de anúncio para continuar.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {TIPOS.map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTipo(t.id)}
                        className={`flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all hover:border-primary hover:bg-secondary ${
                          tipo === t.id
                            ? "border-primary bg-secondary"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tipo === t.id ? "bg-primary" : "bg-muted"}`}>
                          <Icon className={`h-5 w-5 ${tipo === t.id ? "text-primary-foreground" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{t.titulo}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{t.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  className="mt-8 w-full gap-2 font-semibold"
                  disabled={!tipo}
                  onClick={handleNext}
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* ── STEP 2: Formulário dinâmico ── */}
            {step === 2 && (
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  {TIPOS.find((t) => t.id === tipo)?.titulo}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Preencha as informações do seu anúncio.
                </p>

                <div className="mt-8 space-y-5">
                  {/* NEGÓCIO */}
                  {tipo === "negocio" && (
                    <>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <Label>Categoria *</Label>
                          <Select value={negocio.categoria} onValueChange={(v) => setNegocio((p) => ({ ...p, categoria: v }))}>
                            <SelectTrigger className={`mt-2 ${errors.categoria ? "border-destructive" : ""}`}>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIAS_NEGOCIO.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {err("categoria")}
                        </div>
                        <div>
                          <Label>Anos de operação</Label>
                          <Input className="mt-2" type="number" placeholder="Ex: 5" value={negocio.anosOperacao}
                            onChange={(e) => setNegocio((p) => ({ ...p, anosOperacao: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label>Nome do negócio *</Label>
                        <Input className={`mt-2 ${errors.nome ? "border-destructive" : ""}`} placeholder="Ex: Pizzaria Bella Napoli"
                          value={negocio.nome} onChange={(e) => setNegocio((p) => ({ ...p, nome: e.target.value }))} />
                        {err("nome")}
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <Label>Faturamento mensal (R$)</Label>
                          <Input className="mt-2" type="number" placeholder="Ex: 80000"
                            value={negocio.faturamento} onChange={(e) => setNegocio((p) => ({ ...p, faturamento: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Valor pedido (R$) *</Label>
                          <Input className={`mt-2 ${errors.valorPedido ? "border-destructive" : ""}`} type="number" placeholder="Ex: 350000"
                            value={negocio.valorPedido} onChange={(e) => setNegocio((p) => ({ ...p, valorPedido: e.target.value }))} />
                          {err("valorPedido")}
                          {negocio.categoria && (
                            <button
                              type="button"
                              onClick={handleEvaluatePrice}
                              disabled={aiLoadingPrice}
                              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 disabled:opacity-50 transition-colors"
                            >
                              {aiLoadingPrice ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <TrendingUp className="h-3.5 w-3.5" />
                              )}
                              {aiLoadingPrice ? "Analisando..." : "Avaliar preço com IA"}
                            </button>
                          )}
                        </div>
                      </div>
                      {aiPriceSuggestion && (
                        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 leading-relaxed">
                          <p className="font-semibold mb-1.5 flex items-center gap-1.5 text-violet-700">
                            <Sparkles className="h-4 w-4" /> Análise de Precificação — IA
                          </p>
                          <p className="text-xs whitespace-pre-line">{aiPriceSuggestion}</p>
                        </div>
                      )}
                      <div>
                        <Label>Breve descrição *</Label>
                        <Textarea className={`mt-2 ${errors.descricao ? "border-destructive" : ""}`} rows={4}
                          placeholder="Descreva o negócio: diferenciais, situação atual, motivo da venda..."
                          value={negocio.descricao} onChange={(e) => setNegocio((p) => ({ ...p, descricao: e.target.value }))} />
                        {err("descricao")}
                        {negocio.nome && negocio.categoria && (
                          <button
                            type="button"
                            onClick={handleGenerateDesc}
                            disabled={aiLoadingDesc}
                            className="mt-2 flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                          >
                            {aiLoadingDesc ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            {aiLoadingDesc ? "Gerando..." : "Gerar descrição com IA"}
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {/* IMÓVEL */}
                  {tipo === "imovel" && (
                    <>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <Label>Operação *</Label>
                          <Select value={imovel.operacao} onValueChange={(v) => setImovel((p) => ({ ...p, operacao: v }))}>
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="venda">Venda</SelectItem>
                              <SelectItem value="aluguel">Aluguel</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Tipo de imóvel *</Label>
                          <Select value={imovel.tipoImovel} onValueChange={(v) => setImovel((p) => ({ ...p, tipoImovel: v }))}>
                            <SelectTrigger className={`mt-2 ${errors.tipoImovel ? "border-destructive" : ""}`}>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="loja">Loja</SelectItem>
                              <SelectItem value="sala">Sala comercial</SelectItem>
                              <SelectItem value="galpao">Galpão</SelectItem>
                              <SelectItem value="ponto">Ponto comercial</SelectItem>
                              <SelectItem value="predio">Prédio comercial</SelectItem>
                              <SelectItem value="outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                          {err("tipoImovel")}
                        </div>
                      </div>
                      <div>
                        <Label>Endereço / Bairro *</Label>
                        <Input className={`mt-2 ${errors.endereco ? "border-destructive" : ""}`}
                          placeholder="Ex: Av. Paulista, 1500 – Bela Vista"
                          value={imovel.endereco} onChange={(e) => setImovel((p) => ({ ...p, endereco: e.target.value }))} />
                        {err("endereco")}
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <Label>Área (m²) *</Label>
                          <Input className={`mt-2 ${errors.area ? "border-destructive" : ""}`} type="number" placeholder="Ex: 120"
                            value={imovel.area} onChange={(e) => setImovel((p) => ({ ...p, area: e.target.value }))} />
                          {err("area")}
                        </div>
                        <div>
                          <Label>{imovel.operacao === "aluguel" ? "Aluguel mensal (R$)" : "Valor (R$)"} *</Label>
                          <Input className={`mt-2 ${errors.valor ? "border-destructive" : ""}`} type="number" placeholder="Ex: 8000"
                            value={imovel.valor} onChange={(e) => setImovel((p) => ({ ...p, valor: e.target.value }))} />
                          {err("valor")}
                        </div>
                      </div>
                      <div>
                        <Label>Informações adicionais</Label>
                        <Textarea className="mt-2" rows={3} placeholder="Descreva características: infraestrutura, vagas, estado de conservação..."
                          value={imovel.descricao} onChange={(e) => setImovel((p) => ({ ...p, descricao: e.target.value }))} />
                      </div>
                    </>
                  )}

                  {/* GALERIA */}
                  {tipo === "galeria" && (
                    <>
                      <div>
                        <Label>Nome da galeria *</Label>
                        <Input className={`mt-2 ${errors.nome ? "border-destructive" : ""}`} placeholder="Ex: Galeria Centro Empresarial"
                          value={galeria.nome} onChange={(e) => setGaleria((p) => ({ ...p, nome: e.target.value }))} />
                        {err("nome")}
                      </div>
                      <div>
                        <Label>Endereço *</Label>
                        <Input className={`mt-2 ${errors.endereco ? "border-destructive" : ""}`} placeholder="Ex: Rua Augusta, 200 – Consolação"
                          value={galeria.endereco} onChange={(e) => setGaleria((p) => ({ ...p, endereco: e.target.value }))} />
                        {err("endereco")}
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <Label>Nº de espaços disponíveis *</Label>
                          <Input className={`mt-2 ${errors.totalEspacos ? "border-destructive" : ""}`} type="number" placeholder="Ex: 15"
                            value={galeria.totalEspacos} onChange={(e) => setGaleria((p) => ({ ...p, totalEspacos: e.target.value }))} />
                          {err("totalEspacos")}
                        </div>
                        <div>
                          <Label>Aluguel médio por espaço (R$)</Label>
                          <Input className="mt-2" type="number" placeholder="Ex: 3500"
                            value={galeria.valorMedio} onChange={(e) => setGaleria((p) => ({ ...p, valorMedio: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label>Descrição da galeria</Label>
                        <Textarea className="mt-2" rows={3} placeholder="Descreva: tipos de espaço, fluxo de pessoas, infraestrutura..."
                          value={galeria.descricao} onChange={(e) => setGaleria((p) => ({ ...p, descricao: e.target.value }))} />
                      </div>
                    </>
                  )}

                  {/* FRANQUIA */}
                  {tipo === "franquia" && (
                    <>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <Label>Nome da marca *</Label>
                          <Input className={`mt-2 ${errors.marca ? "border-destructive" : ""}`} placeholder="Ex: Subway, O Boticário..."
                            value={franquia.marca} onChange={(e) => setFranquia((p) => ({ ...p, marca: e.target.value }))} />
                          {err("marca")}
                        </div>
                        <div>
                          <Label>Segmento *</Label>
                          <Input className={`mt-2 ${errors.segmento ? "border-destructive" : ""}`} placeholder="Ex: Alimentação, Beleza..."
                            value={franquia.segmento} onChange={(e) => setFranquia((p) => ({ ...p, segmento: e.target.value }))} />
                          {err("segmento")}
                        </div>
                      </div>
                      <div className="grid gap-5 sm:grid-cols-3">
                        <div>
                          <Label>Investimento total (R$) *</Label>
                          <Input className={`mt-2 ${errors.investimento ? "border-destructive" : ""}`} type="number" placeholder="Ex: 120000"
                            value={franquia.investimento} onChange={(e) => setFranquia((p) => ({ ...p, investimento: e.target.value }))} />
                          {err("investimento")}
                        </div>
                        <div>
                          <Label>Taxa de franquia (R$)</Label>
                          <Input className="mt-2" type="number" placeholder="Ex: 30000"
                            value={franquia.taxaFranquia} onChange={(e) => setFranquia((p) => ({ ...p, taxaFranquia: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Royalties (%)</Label>
                          <Input className="mt-2" type="number" placeholder="Ex: 5"
                            value={franquia.royalties} onChange={(e) => setFranquia((p) => ({ ...p, royalties: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea className="mt-2" rows={3} placeholder="Diferenciais da franquia, suporte oferecido, tempo de retorno estimado..."
                          value={franquia.descricao} onChange={(e) => setFranquia((p) => ({ ...p, descricao: e.target.value }))} />
                      </div>
                    </>
                  )}

                  {/* Localização — São Paulo fixo */}
                  <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 flex items-center gap-3">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Localização: <strong className="text-foreground">São Paulo – SP</strong>
                    </span>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setStep(1); setErrors({}); }}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                  </Button>
                  <Button type="button" className="flex-1 gap-2 font-semibold" onClick={handleNext}>
                    Continuar <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Dados de contato ── */}
            {step === 3 && (
              <form onSubmit={handleSubmit}>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Seus dados de contato
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Um corretor NegócioJá entrará em contato para finalizar seu anúncio.
                </p>

                <div className="mt-8 space-y-5">
                  <div>
                    <Label htmlFor="nome">Nome completo *</Label>
                    <Input id="nome" className={`mt-2 ${errors.nome ? "border-destructive" : ""}`}
                      placeholder="Seu nome" value={contato.nome}
                      onChange={(e) => setContato((p) => ({ ...p, nome: e.target.value }))} />
                    {err("nome")}
                  </div>
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                    <Input id="whatsapp" className={`mt-2 ${errors.whatsapp ? "border-destructive" : ""}`}
                      placeholder="(11) 9 0000-0000" value={contato.whatsapp}
                      onChange={(e) => setContato((p) => ({ ...p, whatsapp: e.target.value }))} />
                    {err("whatsapp")}
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail *</Label>
                    <Input id="email" type="email" className={`mt-2 ${errors.email ? "border-destructive" : ""}`}
                      placeholder="seu@email.com" value={contato.email}
                      onChange={(e) => setContato((p) => ({ ...p, email: e.target.value }))} />
                    {err("email")}
                  </div>
                </div>

                <p className="mt-4 text-xs text-muted-foreground">
                  Seu anúncio será revisado por um corretor antes de ir ao marketplace. Você será notificado via WhatsApp.
                </p>

                <div className="mt-8 flex gap-3">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => { setStep(2); setErrors({}); }}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                  </Button>
                  <Button type="submit" className="flex-1 font-semibold">
                    Enviar Anúncio
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Anunciar;
