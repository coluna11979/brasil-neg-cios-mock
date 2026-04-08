import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { ArrowLeft, CheckCircle, Send, AlertCircle, Building2, Maximize2, Eye, Users } from "lucide-react";
import { sendWhatsAppMessage } from "@/lib/uazapi";

function hashId(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = Math.imul(31, h) + str.charCodeAt(i) | 0; }
  return Math.abs(h);
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { formatCurrency } from "@/data/mockListings";
import { supabase } from "@/lib/supabase";
import { type NegocioSupabase, type GaleriaSupabase, type EspacoSupabase } from "@/hooks/useNegocios";
import { addLead } from "@/stores/leadStore";
import { Loader2 } from "lucide-react";

const Contato = () => {
  usePageTitle("Entrar em Contato");
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isGaleria = id === "galeria";
  const galeriaId = searchParams.get("galeriaId");
  const espacoId = searchParams.get("espacoId");

  const [listing, setListing] = useState<NegocioSupabase | null>(null);
  const [galeria, setGaleria] = useState<GaleriaSupabase | null>(null);
  const [espaco, setEspaco] = useState<EspacoSupabase | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (isGaleria) {
      if (!galeriaId) { setLoadingData(false); return; }
      supabase
        .from("galerias")
        .select("*, espacos_galeria(*)")
        .eq("id", galeriaId)
        .single()
        .then(({ data }) => {
          if (data) {
            const g = { ...data, espacos: data.espacos_galeria || [] } as GaleriaSupabase;
            setGaleria(g);
            if (espacoId) {
              const e = g.espacos.find((e) => e.id === espacoId) || null;
              setEspaco(e);
            }
          }
          setLoadingData(false);
        });
    } else {
      if (!id) { setLoadingData(false); return; }
      supabase
        .from("negocios")
        .select("*")
        .eq("id", id)
        .single()
        .then(({ data }) => {
          if (data) setListing(data as NegocioSupabase);
          setLoadingData(false);
        });
    }
  }, [id, isGaleria, galeriaId, espacoId]);

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

    if (!formData.telefone.trim()) {
      newErrors.telefone = "WhatsApp é obrigatório";
    }

    if (!formData.mensagem.trim()) {
      newErrors.mensagem = "Mensagem é obrigatória";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const negocioTitulo = isGaleria
      ? `${espaco?.numero} — ${galeria?.nome}`
      : listing?.titulo || "";

    // 1. Salva o lead
    await addLead({
      nome: formData.nome,
      email: formData.email,
      telefone: formData.telefone,
      mensagem: formData.mensagem,
      origem: isGaleria ? "contato-galeria" : "contato-negocio",
      negocio_id: listing?.id,
      negocio_titulo: listing?.titulo,
      galeria_id: galeria?.id,
      galeria_nome: galeria?.nome,
      espaco_id: espaco?.id,
      espaco_numero: espaco?.numero,
    });

    // 2. WhatsApp automático pro lead confirmando recebimento
    if (formData.telefone) {
      sendWhatsAppMessage(
        formData.telefone,
        `Olá ${formData.nome}! 👋\n\nRecebemos seu interesse em *${negocioTitulo}* aqui pela NegócioJá.\n\nUm corretor especializado vai entrar em contato com você em breve pelo WhatsApp para dar continuidade. 🤝\n\n_NegócioJá — Compre, Venda ou Alugue com segurança_`
      ).catch(() => {}); // disparo silencioso
    }

    // 3. Alerta WhatsApp pro corretor responsável
    const corretorTelefone = isGaleria
      ? (galeria as any)?.corretor_telefone
      : (listing as any)?.corretor_telefone;

    if (corretorTelefone) {
      sendWhatsAppMessage(
        corretorTelefone,
        `🔔 *Novo lead NegócioJá!*\n\n*Nome:* ${formData.nome}\n*Telefone:* ${formData.telefone || "não informado"}\n*E-mail:* ${formData.email}\n*Interesse:* ${negocioTitulo}\n*Mensagem:* ${formData.mensagem}\n\nAcesse o painel para ver todos os detalhes.`
      ).catch(() => {});
    }

    // 4. Redireciona para página de obrigado
    const params = new URLSearchParams({
      nome: formData.nome,
      negocio: negocioTitulo,
      telefone: formData.telefone,
      tipo: isGaleria ? "galeria" : "negocio",
    });
    navigate(`/obrigado?${params.toString()}`);
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

  if (loadingData) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!listing && !(isGaleria && galeria && espaco)) {
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

  const contatoTitulo = isGaleria
    ? `${espaco!.numero} — ${galeria!.nome}`
    : listing!.titulo;

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
              <strong className="text-foreground">{contatoTitulo}</strong>.
              Em breve um corretor entrará em contato pelo seu WhatsApp.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button asChild>
                <Link to={isGaleria ? "/galerias" : `/anuncio/${listing?.id}`}>
                  {isGaleria ? "Voltar às Galerias" : "Voltar ao Anúncio"}
                </Link>
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
          <Link
            to={isGaleria ? "/galerias" : `/anuncio/${listing?.id}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {isGaleria ? "Voltar às Galerias" : "Voltar ao anúncio"}
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-3">
            {/* Form */}
            <div className="lg:col-span-2">
              <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Entrar em Contato
              </h1>
              <p className="mt-2 text-muted-foreground">
                Preencha o formulário e um corretor entrará em contato pelo seu WhatsApp.
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
                  <Label htmlFor="telefone">WhatsApp *</Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    placeholder="(11) 9 9999-9999"
                    className={`mt-2 ${errors.telefone ? "border-destructive" : ""}`}
                  />
                  {errors.telefone && (
                    <p className="mt-1 text-sm text-destructive">{errors.telefone}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Necessário para o corretor entrar em contato com você
                  </p>
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

                {isGaleria && galeria && espaco ? (
                  <div className="mt-4">
                    <div className="aspect-video overflow-hidden rounded-lg">
                      <img
                        src={galeria.imagem ?? "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"}
                        alt={galeria.nome}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <h4 className="mt-4 font-display text-lg font-semibold text-foreground">
                      {espaco.numero}
                    </h4>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {galeria.nome}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {galeria.endereco} — {galeria.cidade}/{galeria.estado}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Maximize2 className="h-3.5 w-3.5" />
                        {espaco.area_m2}m²
                      </div>
                      {espaco.andar && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {espaco.andar}
                        </div>
                      )}
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {espaco.descricao}
                    </p>

                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        {(hashId(espaco.id) % 28) + 9} viram hoje
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        {(hashId(espaco.id + "i") % 10) + 3} interessados
                      </span>
                    </div>

                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground">Aluguel Mensal</p>
                      <p className="font-display text-xl font-bold text-primary">
                        {formatCurrency(espaco.valor_aluguel)}/mês
                      </p>
                    </div>
                  </div>
                ) : listing ? (
                  <div className="mt-4">
                    <div className="aspect-video overflow-hidden rounded-lg">
                      <img
                        src={listing.imagem ?? "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"}
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

                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        {(hashId(listing.id) % 28) + 9} viram hoje
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        {(hashId(listing.id + "i") % 10) + 3} interessados
                      </span>
                    </div>

                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground">Valor</p>
                      <p className="font-display text-xl font-bold text-primary">
                        {formatCurrency(listing.preco)}
                      </p>
                    </div>
                  </div>
                ) : null}
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
