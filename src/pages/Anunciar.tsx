import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, AlertCircle, CheckCircle } from "lucide-react";
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
import { categorias, estados, mockListings, Listing } from "@/data/mockListings";

const Anunciar = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    titulo: "",
    categoria: "",
    tipo: "venda" as "venda" | "venda-imovel" | "aluguel-imovel",
    cidade: "",
    estado: "",
    preco: "",
    faturamentoMensal: "",
    areaM2: "",
    descricao: "",
    descricaoCompleta: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.titulo.trim()) newErrors.titulo = "Título é obrigatório";
    if (!formData.categoria) newErrors.categoria = "Categoria é obrigatória";
    if (!formData.cidade.trim()) newErrors.cidade = "Cidade é obrigatória";
    if (!formData.estado) newErrors.estado = "Estado é obrigatório";
    if (!formData.preco || Number(formData.preco) <= 0)
      newErrors.preco = "Preço deve ser maior que zero";
    if (formData.tipo === "venda" && (!formData.faturamentoMensal || Number(formData.faturamentoMensal) <= 0))
      newErrors.faturamentoMensal = "Faturamento deve ser maior que zero";
    if (!formData.descricao.trim())
      newErrors.descricao = "Descrição breve é obrigatória";
    if (!formData.descricaoCompleta.trim())
      newErrors.descricaoCompleta = "Descrição completa é obrigatória";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      // Create mock listing
      const newId = String(mockListings.length + 100 + Math.floor(Math.random() * 1000));

      const newListing: Listing = {
        id: newId,
        titulo: formData.titulo,
        categoria: formData.categoria,
        cidade: formData.cidade,
        estado: formData.estado,
        preco: Number(formData.preco),
        faturamentoMensal: Number(formData.faturamentoMensal) || 0,
        descricao: formData.descricao,
        descricaoCompleta: formData.descricaoCompleta,
        imagem: "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800",
        destaque: false,
        tipo: formData.tipo !== "venda" ? formData.tipo : undefined,
        areaM2: formData.areaM2 ? Number(formData.areaM2) : undefined,
      };

      // Add to mock data (will only persist for this session)
      mockListings.push(newListing);

      setCreatedId(newId);
      setShowPreview(true);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    return numericValue;
  };

  if (showPreview && createdId) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>

            <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
              Anúncio Publicado!
            </h1>

            <p className="mt-4 text-muted-foreground">
              Seu anúncio <strong className="text-foreground">"{formData.titulo}"</strong> foi
              publicado com sucesso!
            </p>

            {/* Simulation Notice */}
            <div className="mt-6 rounded-lg border border-accent/30 bg-accent/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-accent" />
                <p className="text-sm text-left text-foreground">
                  <strong>Nota:</strong> Este é um MVP de demonstração. O anúncio
                  foi criado apenas para esta sessão e não será persistido após
                  você fechar o navegador.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link to={`/anuncio/${createdId}`}>Ver Meu Anúncio</Link>
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
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para Home
          </Link>

          <div className="mt-6 mx-auto max-w-2xl">
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Anunciar um Negócio
            </h1>
            <p className="mt-2 text-muted-foreground">
              Preencha as informações abaixo para publicar seu negócio no marketplace.
            </p>

            {/* Info Box */}
            <div className="mt-6 rounded-lg border border-primary/20 bg-secondary p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-primary" />
                <div className="text-sm">
                  <p className="font-medium text-foreground">
                    Versão de Demonstração
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Este é um MVP. Os anúncios criados são apenas simulações e não
                    serão persistidos.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {/* Title */}
              <div>
                <Label htmlFor="titulo">Título do Anúncio *</Label>
                <Input
                  id="titulo"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  placeholder="Ex: Pizzaria Tradicional em Ponto Nobre"
                  className={`mt-2 ${errors.titulo ? "border-destructive" : ""}`}
                />
                {errors.titulo && (
                  <p className="mt-1 text-sm text-destructive">{errors.titulo}</p>
                )}
              </div>

              {/* Category & Type */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label>Categoria *</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value) => handleSelectChange("categoria", value)}
                  >
                    <SelectTrigger
                      className={`mt-2 ${errors.categoria ? "border-destructive" : ""}`}
                    >
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.categoria && (
                    <p className="mt-1 text-sm text-destructive">{errors.categoria}</p>
                  )}
                </div>

                <div>
                  <Label>Tipo de Operação *</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value) => handleSelectChange("tipo", value)}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venda">Venda de Negócio</SelectItem>
                      <SelectItem value="venda-imovel">Venda de Imóvel Comercial</SelectItem>
                      <SelectItem value="aluguel-imovel">Aluguel de Imóvel Comercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label>Estado *</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(value) => handleSelectChange("estado", value)}
                  >
                    <SelectTrigger
                      className={`mt-2 ${errors.estado ? "border-destructive" : ""}`}
                    >
                      <SelectValue placeholder="Selecione o estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {estados.map((est) => (
                        <SelectItem key={est} value={est}>
                          {est}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.estado && (
                    <p className="mt-1 text-sm text-destructive">{errors.estado}</p>
                  )}
                </div>
              </div>

              {/* City */}
              <div>
                <Label htmlFor="cidade">Cidade *</Label>
                <Input
                  id="cidade"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  placeholder="Ex: São Paulo"
                  className={`mt-2 ${errors.cidade ? "border-destructive" : ""}`}
                />
                {errors.cidade && (
                  <p className="mt-1 text-sm text-destructive">{errors.cidade}</p>
                )}
              </div>

              {/* Price & Revenue */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <Label htmlFor="preco">
                    {formData.tipo === "aluguel-imovel" ? "Valor do Aluguel Mensal (R$) *" : "Valor do Negócio (R$) *"}
                  </Label>
                  <Input
                    id="preco"
                    name="preco"
                    type="number"
                    value={formData.preco}
                    onChange={(e) =>
                      handleChange({
                        ...e,
                        target: {
                          ...e.target,
                          value: formatCurrencyInput(e.target.value),
                        },
                      })
                    }
                    placeholder="Ex: 250000"
                    className={`mt-2 ${errors.preco ? "border-destructive" : ""}`}
                  />
                  {errors.preco && (
                    <p className="mt-1 text-sm text-destructive">{errors.preco}</p>
                  )}
                </div>

                {formData.tipo === "venda" && (
                  <div>
                    <Label htmlFor="faturamentoMensal">Faturamento Mensal (R$) *</Label>
                    <Input
                      id="faturamentoMensal"
                      name="faturamentoMensal"
                      type="number"
                      value={formData.faturamentoMensal}
                      onChange={(e) =>
                        handleChange({
                          ...e,
                          target: {
                            ...e.target,
                            value: formatCurrencyInput(e.target.value),
                          },
                        })
                      }
                      placeholder="Ex: 75000"
                      className={`mt-2 ${
                        errors.faturamentoMensal ? "border-destructive" : ""
                      }`}
                    />
                    {errors.faturamentoMensal && (
                      <p className="mt-1 text-sm text-destructive">
                        {errors.faturamentoMensal}
                      </p>
                    )}
                  </div>
                )}

                {(formData.tipo === "venda-imovel" || formData.tipo === "aluguel-imovel") && (
                  <div>
                    <Label htmlFor="areaM2">Área (m²)</Label>
                    <Input
                      id="areaM2"
                      name="areaM2"
                      type="number"
                      value={formData.areaM2}
                      onChange={handleChange}
                      placeholder="Ex: 120"
                      className="mt-2"
                    />
                  </div>
                )}
              </div>

              {/* Short Description */}
              <div>
                <Label htmlFor="descricao">Descrição Breve *</Label>
                <Textarea
                  id="descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  placeholder="Uma breve descrição do negócio (aparece nos cards de listagem)"
                  rows={3}
                  className={`mt-2 ${errors.descricao ? "border-destructive" : ""}`}
                />
                {errors.descricao && (
                  <p className="mt-1 text-sm text-destructive">{errors.descricao}</p>
                )}
              </div>

              {/* Full Description */}
              <div>
                <Label htmlFor="descricaoCompleta">Descrição Completa *</Label>
                <Textarea
                  id="descricaoCompleta"
                  name="descricaoCompleta"
                  value={formData.descricaoCompleta}
                  onChange={handleChange}
                  placeholder="Descreva detalhadamente o negócio: histórico, estrutura, diferenciais, equipe, potencial de crescimento..."
                  rows={6}
                  className={`mt-2 ${
                    errors.descricaoCompleta ? "border-destructive" : ""
                  }`}
                />
                {errors.descricaoCompleta && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.descricaoCompleta}
                  </p>
                )}
              </div>

              <Button type="submit" size="lg" className="w-full gap-2 font-semibold">
                <Plus className="h-5 w-5" />
                Publicar Anúncio
              </Button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Anunciar;
