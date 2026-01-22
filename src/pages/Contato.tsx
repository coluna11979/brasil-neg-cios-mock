import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getListingById, formatCurrency } from "@/data/mockListings";

const Contato = () => {
  const { id } = useParams<{ id: string }>();
  const listing = getListingById(id || "");

  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    mensagem: "",
  });
  const [enviado, setEnviado] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email inválido";
    }

    if (!formData.mensagem.trim()) {
      newErrors.mensagem = "Mensagem é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      // Simula envio
      setEnviado(true);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  if (!listing) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold text-foreground">
              Anúncio não encontrado
            </h1>
            <p className="mt-2 text-muted-foreground">
              O anúncio que você procura não existe ou foi removido.
            </p>
            <Button asChild className="mt-6">
              <Link to="/busca">Voltar para busca</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="mx-auto max-w-md text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>

            <h1 className="mt-6 font-display text-2xl font-bold text-foreground">
              Mensagem Enviada!
            </h1>

            <p className="mt-4 text-muted-foreground">
              Sua mensagem foi enviada com sucesso para o anunciante de{" "}
              <strong className="text-foreground">{listing.titulo}</strong>.
            </p>

            {/* Simulation Notice */}
            <div className="mt-6 rounded-lg border border-accent/30 bg-accent/10 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-accent" />
                <p className="text-sm text-left text-foreground">
                  <strong>Nota:</strong> Esta é uma simulação. Em um ambiente
                  real, o anunciante receberia sua mensagem por email e poderia
                  entrar em contato com você.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link to={`/anuncio/${listing.id}`}>Voltar ao Anúncio</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/busca">Explorar Outros Negócios</Link>
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
            to={`/anuncio/${listing.id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao anúncio
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-3">
            {/* Form */}
            <div className="lg:col-span-2">
              <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Entrar em Contato
              </h1>
              <p className="mt-2 text-muted-foreground">
                Envie uma mensagem para o anunciante demonstrando seu interesse.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="nome">Nome completo *</Label>
                    <Input
                      id="nome"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      placeholder="Seu nome"
                      className={`mt-2 ${errors.nome ? "border-destructive" : ""}`}
                    />
                    {errors.nome && (
                      <p className="mt-1 text-sm text-destructive">{errors.nome}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="seu@email.com"
                      className={`mt-2 ${errors.email ? "border-destructive" : ""}`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="telefone">Telefone (opcional)</Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    placeholder="(11) 99999-9999"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="mensagem">Mensagem *</Label>
                  <Textarea
                    id="mensagem"
                    name="mensagem"
                    value={formData.mensagem}
                    onChange={handleChange}
                    placeholder="Escreva sua mensagem aqui. Conte sobre você, seu interesse no negócio e quaisquer perguntas que tenha..."
                    rows={6}
                    className={`mt-2 ${errors.mensagem ? "border-destructive" : ""}`}
                  />
                  {errors.mensagem && (
                    <p className="mt-1 text-sm text-destructive">{errors.mensagem}</p>
                  )}
                </div>

                <Button type="submit" size="lg" className="gap-2 font-semibold">
                  <Send className="h-5 w-5" />
                  Enviar Mensagem
                </Button>
              </form>
            </div>

            {/* Listing Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl border border-border bg-card p-6 shadow-card">
                <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Você está entrando em contato sobre:
                </h3>

                <div className="mt-4">
                  <div className="aspect-video overflow-hidden rounded-lg">
                    <img
                      src={listing.imagem}
                      alt={listing.titulo}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <h4 className="mt-4 font-display text-lg font-semibold text-foreground">
                    {listing.titulo}
                  </h4>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {listing.cidade}, {listing.estado}
                  </p>

                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-sm text-muted-foreground">Valor</p>
                    <p className="font-display text-xl font-bold text-primary">
                      {formatCurrency(listing.preco)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contato;
