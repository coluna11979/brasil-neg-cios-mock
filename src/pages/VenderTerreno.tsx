import { useState } from "react";
import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import {
  Phone, User, CheckCircle, Send, MapPin, Ruler,
  DollarSign, FileText, ArrowLeft, Loader2, Layers,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { addLead } from "@/stores/leadStore";

const ZONEAMENTOS = [
  "ZC — Zona Comercial",
  "ZM — Zona Mista",
  "ZI — Zona Industrial",
  "ZR — Zona Residencial (uso misto)",
  "ZPDS — Proteção e Desenvolvimento Sustentável",
  "Não sei / A verificar",
];

const TIPOS_TERRENO = [
  "Terreno urbano comercial",
  "Terreno de esquina",
  "Terreno industrial / galpão",
  "Terreno para incorporação",
  "Gleba / área rural produtiva",
  "Outro",
];

const VenderTerreno = () => {
  usePageTitle("Vender Terreno Comercial");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    // OBRIGATÓRIOS
    nome: "",
    telefone: "",
    // OPCIONAIS
    email: "",
    tipo: "",
    endereco: "",
    area_m2: "",
    valor_pedido: "",
    zoneamento: "",
    descricao: "",
  });

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = "Nome é obrigatório";
    const tel = form.telefone.replace(/\D/g, "");
    if (tel.length < 10) e.telefone = "Telefone inválido (mínimo 10 dígitos com DDD)";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const erros = validate();
    if (Object.keys(erros).length > 0) { setErrors(erros); return; }

    setLoading(true);

    // Monta mensagem rica com os opcionais preenchidos
    const partes: string[] = ["Quer vender terreno comercial"];
    if (form.tipo) partes.push(`Tipo: ${form.tipo}`);
    if (form.area_m2) partes.push(`Área: ${form.area_m2} m²`);
    if (form.valor_pedido) partes.push(`Valor pedido: R$ ${form.valor_pedido}`);
    if (form.zoneamento) partes.push(`Zoneamento: ${form.zoneamento}`);
    if (form.endereco) partes.push(`Endereço: ${form.endereco}`);
    if (form.descricao) partes.push(`Obs: ${form.descricao}`);

    await addLead({
      nome: form.nome.trim(),
      email: form.email.trim(),
      telefone: form.telefone.replace(/\D/g, "") || undefined,
      mensagem: partes.join(" · "),
      origem: "vender-terreno",
    });

    setEnviado(true);
    setLoading(false);
  };

  if (enviado) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 ring-8 ring-green-50">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Recebemos seu contato!
            </h1>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Ótimo, <strong className="text-foreground">{form.nome.split(" ")[0]}</strong>! Um consultor NegócioJá vai entrar em contato pelo seu WhatsApp em até 1 hora para entender melhor o terreno e encaminhar compradores qualificados.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/imoveis"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Ver imóveis comerciais
              </Link>
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Ir para a home
              </Link>
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

      {/* Hero */}
      <section className="gradient-hero py-12 md:py-16">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Layers className="h-7 w-7 text-white" />
              </div>
            </div>
            <h1 className="font-display text-3xl font-extrabold text-primary-foreground md:text-4xl">
              Vender Terreno Comercial
            </h1>
            <p className="mt-3 text-primary-foreground/80 text-sm leading-relaxed max-w-lg mx-auto">
              Alcance investidores e construtoras que buscam terrenos em São Paulo.
              Preencha apenas nome e telefone — nosso consultor cuida do resto.
            </p>
          </div>
        </div>
      </section>

      <main className="flex-1 py-10">
        <div className="container-app">
          <Link
            to="/imoveis"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Imóveis Comerciais
          </Link>

          <div className="mx-auto max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* ── BLOCO 1: Contato (obrigatório) ── */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-foreground">Seus dados de contato</h2>
                    <p className="text-xs text-muted-foreground">Somente esses dois campos são obrigatórios</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Nome completo <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={form.nome}
                        onChange={(e) => handleChange("nome", e.target.value)}
                        placeholder="Seu nome"
                        className={`w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${errors.nome ? "border-destructive" : "border-border"}`}
                      />
                    </div>
                    {errors.nome && <p className="mt-1 text-xs text-destructive">{errors.nome}</p>}
                  </div>

                  {/* Telefone */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      WhatsApp <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-600" />
                      <input
                        type="tel"
                        value={form.telefone}
                        onChange={(e) => handleChange("telefone", e.target.value)}
                        placeholder="(11) 9 9999-9999"
                        className={`w-full rounded-xl border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors ${errors.telefone ? "border-destructive" : "border-border"}`}
                      />
                    </div>
                    {errors.telefone && <p className="mt-1 text-xs text-destructive">{errors.telefone}</p>}
                  </div>

                  {/* Email — opcional */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      E-mail <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* ── BLOCO 2: Informações do Terreno (tudo opcional) ── */}
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                    <Layers className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-foreground">Sobre o terreno</h2>
                    <p className="text-xs text-muted-foreground">Quanto mais info, mais rápido encontramos o comprador certo</p>
                  </div>
                  <span className="ml-auto text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-2.5 py-1 uppercase tracking-wide">Opcional</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">

                  {/* Tipo */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1.5">Tipo de terreno</label>
                    <div className="flex flex-wrap gap-2">
                      {TIPOS_TERRENO.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => handleChange("tipo", form.tipo === t ? "" : t)}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            form.tipo === t
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Área */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Área (m²)</label>
                    <div className="relative">
                      <Ruler className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="number"
                        value={form.area_m2}
                        onChange={(e) => handleChange("area_m2", e.target.value)}
                        placeholder="Ex: 500"
                        className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* Valor */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Valor pedido (R$)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={form.valor_pedido}
                        onChange={(e) => handleChange("valor_pedido", e.target.value)}
                        placeholder="Ex: 850.000"
                        className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* Zoneamento */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1.5">Zoneamento</label>
                    <div className="flex flex-wrap gap-2">
                      {ZONEAMENTOS.map((z) => (
                        <button
                          key={z}
                          type="button"
                          onClick={() => handleChange("zoneamento", form.zoneamento === z ? "" : z)}
                          className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                            form.zoneamento === z
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }`}
                        >
                          {z}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Endereço */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1.5">Endereço / Bairro</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        type="text"
                        value={form.endereco}
                        onChange={(e) => handleChange("endereco", e.target.value)}
                        placeholder="Ex: Tatuapé, São Paulo"
                        className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  {/* Descrição */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-foreground mb-1.5">Informações adicionais</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <textarea
                        value={form.descricao}
                        onChange={(e) => handleChange("descricao", e.target.value)}
                        placeholder="Frente para a rua, documentação ok, aceita permuta..."
                        rows={3}
                        className="w-full rounded-xl border border-border bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                  : <><Send className="h-4 w-4" />Quero vender meu terreno</>
                }
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Seus dados são 100% seguros. Um consultor entrará em contato pelo WhatsApp em até 1h.
              </p>

            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default VenderTerreno;
