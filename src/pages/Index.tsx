import { Link } from "react-router-dom";
import usePageTitle from "@/hooks/usePageTitle";
import { TrendingUp, MapPin, Store, Star, ShieldCheck, Users, Handshake } from "lucide-react";
import { Marquee } from "@/components/ui/3d-testimonials";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import EmailCaptureBanner from "@/components/EmailCaptureBanner";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import CategoryCard from "@/components/CategoryCard";
import ListingCard from "@/components/ListingCard";
import { categorias, formatCurrency } from "@/data/mockListings";
import { useNegocios, useGalerias, adaptNegocio } from "@/hooks/useNegocios";

const STATS = [
  { icon: ShieldCheck, label: "Negócios verificados", end: 340, suffix: "+" },
  { icon: Handshake, label: "Negócios fechados", end: 87, suffix: "+" },
  { icon: Users, label: "Compradores ativos", end: 1200, suffix: "+" },
  { icon: Star, label: "Avaliação média", end: 4.9, suffix: "", decimals: 1 },
];

const TESTIMONIALS = [
  {
    nome: "Rodrigo Mendes",
    cargo: "Empresário — Alimentação",
    texto: "Vendi minha pizzaria em 18 dias. Nunca imaginei que seria tão rápido. O corretor da NegociaAky foi fundamental.",
    img: "https://randomuser.me/api/portraits/men/32.jpg",
  },
  {
    nome: "Camila Torres",
    cargo: "Investidora",
    texto: "Comprei meu segundo negócio pela plataforma. A transparência dos anúncios me deu segurança total.",
    img: "https://randomuser.me/api/portraits/women/44.jpg",
  },
  {
    nome: "Felipe Andrade",
    cargo: "Empreendedor — Varejo",
    texto: "Abri minha loja em uma galeria que encontrei aqui. O processo foi simples e o espaço superou as expectativas.",
    img: "https://randomuser.me/api/portraits/men/55.jpg",
  },
  {
    nome: "Beatriz Lima",
    cargo: "Compradora — Beleza",
    texto: "Encontrei um salão com tudo estruturado e já faturando. Fechei em menos de um mês!",
    img: "https://randomuser.me/api/portraits/women/68.jpg",
  },
  {
    nome: "Carlos Souza",
    cargo: "Vendedor — Serviços",
    texto: "Anunciei minha empresa de limpeza e em duas semanas já tinha proposta séria. Excelente plataforma.",
    img: "https://randomuser.me/api/portraits/men/22.jpg",
  },
  {
    nome: "Ana Ferreira",
    cargo: "Corretora parceira",
    texto: "A ferramenta para corretores é incrível. Consigo gerenciar todos os meus leads num só lugar.",
    img: "https://randomuser.me/api/portraits/women/33.jpg",
  },
  {
    nome: "Paulo Nobre",
    cargo: "Investidor — Alimentação",
    texto: "Comprei uma padaria com faturamento comprovado. O suporte na due diligence foi excepcional.",
    img: "https://randomuser.me/api/portraits/men/61.jpg",
  },
  {
    nome: "Juliana Costa",
    cargo: "Empreendedora — Moda",
    texto: "Alugamos um espaço em galeria pelo NegociaAky. Atendimento rápido e processo transparente.",
    img: "https://randomuser.me/api/portraits/women/52.jpg",
  },
  {
    nome: "Marcos Vieira",
    cargo: "Empresário — Tecnologia",
    texto: "Vendi minha software house em 30 dias. Valor justo e comprador qualificado. Recomendo muito!",
    img: "https://randomuser.me/api/portraits/men/78.jpg",
  },
];

function useCountUp(end: number, decimals = 0, active: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const duration = 1800;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(decimals ? Math.round(start * 10) / 10 : Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, decimals, active]);
  return count;
}

const StatCard = ({ icon: Icon, label, end, suffix, decimals = 0 }: typeof STATS[0] & { decimals?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const count = useCountUp(end, decimals, active);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <p className="font-display text-3xl font-extrabold text-foreground">
        {decimals ? count.toFixed(1) : count.toLocaleString("pt-BR")}{suffix}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
};

const TestimonialCard = ({ img, nome, cargo, texto }: (typeof TESTIMONIALS)[number]) => (
  <Card className="w-52 shrink-0">
    <CardContent className="p-4">
      <div className="flex items-center gap-2.5">
        <Avatar className="h-9 w-9">
          <AvatarImage src={img} alt={nome} />
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
            {nome.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{nome}</p>
          <p className="text-xs text-muted-foreground truncate">{cargo}</p>
        </div>
      </div>
      <div className="mt-2 flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
        ))}
      </div>
      <blockquote className="mt-2 text-xs text-muted-foreground leading-relaxed">
        "{texto}"
      </blockquote>
    </CardContent>
  </Card>
);

const Index = () => {
  usePageTitle("");
  const { negocios, loading: loadingNegocios } = useNegocios();
  const { galerias, loading: loadingGalerias } = useGalerias();
  const featuredListings = negocios.filter((n) => n.destaque).map(adaptNegocio);
  const recentListings = negocios.slice(0, 6).map(adaptNegocio);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero pt-12 pb-8 md:pt-16 md:pb-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />

        <div className="container-app relative">
          {/* Headline + Search */}
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-primary-foreground md:text-4xl lg:text-5xl">
              Compre, Venda ou Alugue Negócios e Imóveis Comerciais em SP
            </h1>
            <p className="mt-3 text-primary-foreground/70 text-sm md:text-base">
              Negócios, salões comerciais, galerias e imóveis — oportunidades verificadas para investidores e empreendedores.
            </p>
            <div className="mt-6 mx-auto max-w-2xl">
              <SearchBar size="large" />
            </div>
          </div>

          {/* Featured category carousel */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="font-semibold text-primary-foreground/90 text-sm md:text-base">
                Espaços em Galerias
              </span>
              <div className="h-px flex-1 bg-white/10" />
              <Link to="/galerias" className="text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors">
                Ver todos →
              </Link>
            </div>

            <Carousel opts={{ align: "start", loop: false, dragFree: true }}>
              <CarouselContent className="-ml-3">
                {galerias.map((g) => {
                  const disponiveis = g.espacos.filter((e) => e.disponivel);
                  const minAluguel = disponiveis.length > 0
                    ? Math.min(...disponiveis.map((e) => e.valor_aluguel))
                    : null;
                  return (
                    <CarouselItem key={g.id} className="pl-3 basis-[75%] sm:basis-[45%] md:basis-[30%] lg:basis-1/4">
                      <Link to="/galerias" className="block rounded-xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/15 hover:bg-white/15 transition-all">
                        <div className="relative h-28 overflow-hidden">
                          <img
                            src={g.imagem}
                            alt={g.nome}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <span className="absolute bottom-2 left-2 text-xs font-semibold text-white bg-black/40 rounded px-2 py-0.5">
                            {disponiveis.length} espaços
                          </span>
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-semibold text-white leading-tight line-clamp-1">{g.nome}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-white/50 shrink-0" />
                            <span className="text-xs text-white/60 truncate">{g.endereco}</span>
                          </div>
                          {minAluguel && (
                            <p className="mt-2 text-xs text-white/70">
                              a partir de <span className="text-white font-semibold">{formatCurrency(minAluguel)}/mês</span>
                            </p>
                          )}
                        </div>
                      </Link>
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
            </Carousel>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 md:py-20">
        <div className="container-app">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Explore por Categoria
            </h2>
            <p className="mt-2 text-muted-foreground">
              Encontre negócios no segmento que você procura
            </p>
          </div>

          <Carousel opts={{ align: "start", loop: false }} className="mt-10">
            <CarouselContent className="-ml-4">
              {categorias.map((categoria) => (
                <CarouselItem key={categoria.id} className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5">
                  <CategoryCard
                    id={categoria.id}
                    nome={categoria.nome}
                    icone={categoria.icone}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4 hidden md:flex" />
            <CarouselNext className="-right-4 hidden md:flex" />
          </Carousel>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="bg-muted/50 py-16 md:py-20">
        <div className="container-app">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Negócios em Destaque
            </h2>
            <p className="mt-2 text-muted-foreground">
              Oportunidades verificadas e com alto potencial
            </p>
          </div>

          <Carousel opts={{ align: "start", loop: false }} className="mt-10">
            <CarouselContent className="-ml-4">
              {featuredListings.map((listing) => (
                <CarouselItem key={listing.id} className="pl-4 sm:basis-1/2 lg:basis-1/3">
                  <ListingCard listing={listing} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4 hidden md:flex" />
            <CarouselNext className="-right-4 hidden md:flex" />
          </Carousel>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border py-12 bg-card">
        <div className="container-app">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {STATS.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* Email Capture */}
      <EmailCaptureBanner />

      {/* Recent Listings */}
      <section className="py-16 md:py-20">
        <div className="container-app">
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Adicionados Recentemente
            </h2>
            <p className="mt-2 text-muted-foreground">
              As mais novas oportunidades de negócio
            </p>
          </div>

          <Carousel opts={{ align: "start", loop: false }} className="mt-10">
            <CarouselContent className="-ml-4">
              {recentListings.map((listing) => (
                <CarouselItem key={listing.id} className="pl-4 sm:basis-1/2 lg:basis-1/3">
                  <ListingCard listing={listing} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-4 hidden md:flex" />
            <CarouselNext className="-right-4 hidden md:flex" />
          </Carousel>
        </div>
      </section>

      {/* Galerias Section */}
      <section className="bg-muted/50 py-16 md:py-20">
        <div className="container-app">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Espaços em Galerias
              </h2>
            </div>
            <p className="mt-2 text-muted-foreground">
              Encontre o ponto comercial ideal — lojas, salas, boxes e quiosques disponíveis para locação
            </p>
          </div>

          <Carousel opts={{ align: "start", loop: false }} className="mt-10">
            <CarouselContent className="-ml-4">
              {galerias.map((galeria) => {
                const livres = galeria.espacos.filter(e => e.disponivel);
                const menorValor = livres.length > 0
                  ? Math.min(...livres.map(e => e.valor_aluguel))
                  : 0;

                return (
                  <CarouselItem key={galeria.id} className="pl-4 sm:basis-1/2 lg:basis-1/3">
                    <Link
                      to={`/galerias?id=${galeria.id}`}
                      className="group block rounded-xl border border-border bg-card overflow-hidden shadow-card transition-all hover:shadow-lg hover:-translate-y-1 h-full"
                    >
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={galeria.imagem}
                          alt={galeria.nome}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <div className="p-5">
                        <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                          {galeria.nome}
                        </h3>
                        <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {galeria.cidade}/{galeria.estado}
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                          {galeria.descricao}
                        </p>

                        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                            {livres.length} espaço{livres.length !== 1 ? "s" : ""} disponível{livres.length !== 1 ? "is" : ""}
                          </span>
                          {menorValor > 0 && (
                            <span className="text-sm font-semibold text-primary">
                              a partir de {formatCurrency(menorValor)}/mês
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="-left-4 hidden md:flex" />
            <CarouselNext className="-right-4 hidden md:flex" />
          </Carousel>
        </div>
      </section>

      {/* Testimonials — 3D Marquee */}
      <section className="py-16 md:py-20 overflow-hidden">
        <div className="container-app">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Quem já usou, aprovou
            </h2>
            <p className="mt-2 text-muted-foreground">
              Histórias reais de quem comprou, vendeu ou alugou pela NegociaAky
            </p>
          </div>
        </div>

        {/* 3D perspective container */}
        <div className="relative flex h-[420px] w-full items-center justify-center overflow-hidden">
          <div
            className="flex flex-row items-center gap-4"
            style={{
              transform:
                "translateX(-60px) translateY(0px) translateZ(-80px) rotateX(18deg) rotateY(-8deg) rotateZ(18deg)",
            }}
          >
            <Marquee vertical pauseOnHover repeat={3} className="[--duration:38s]">
              {TESTIMONIALS.map((t) => (
                <TestimonialCard key={t.nome + "a"} {...t} />
              ))}
            </Marquee>
            <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:42s]">
              {TESTIMONIALS.map((t) => (
                <TestimonialCard key={t.nome + "b"} {...t} />
              ))}
            </Marquee>
            <Marquee vertical pauseOnHover repeat={3} className="[--duration:36s] hidden sm:flex">
              {TESTIMONIALS.map((t) => (
                <TestimonialCard key={t.nome + "c"} {...t} />
              ))}
            </Marquee>
            <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:44s] hidden md:flex">
              {TESTIMONIALS.map((t) => (
                <TestimonialCard key={t.nome + "d"} {...t} />
              ))}
            </Marquee>
          </div>

          {/* Gradient overlays */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background" />
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-background" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-background" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="gradient-hero py-16 md:py-20">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl">
              Quer Vender ou Alugar seu Negócio ou Imóvel?
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              Alcance milhares de compradores e locatários qualificados — negócios, salões comerciais e imóveis com visibilidade total.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto font-semibold"
              >
                <Link to="/anunciar">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Anunciar Meu Negócio
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
              >
                <Link to="/busca">Explorar Negócios</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
