import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, TrendingUp, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import CategoryCard from "@/components/CategoryCard";
import ListingCard from "@/components/ListingCard";
import { categorias, getFeaturedListings, mockListings } from "@/data/mockListings";

const Index = () => {
  const featuredListings = getFeaturedListings();
  const recentListings = mockListings.slice(0, 6);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero py-20 md:py-28">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50"></div>
        <div className="container-app relative">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="animate-fade-in font-display text-4xl font-extrabold tracking-tight text-primary-foreground md:text-5xl lg:text-6xl">
              Compre ou Venda Negócios
              <span className="block mt-2">com Segurança</span>
            </h1>
            <p className="animate-fade-in mt-6 text-lg text-primary-foreground/80 md:text-xl" style={{ animationDelay: "0.1s" }}>
              O maior marketplace de compra e venda de empresas do Brasil.
              Encontre o negócio dos seus sonhos ou anuncie o seu.
            </p>

            {/* Search Bar */}
            <div className="animate-fade-in mt-8 mx-auto max-w-2xl" style={{ animationDelay: "0.2s" }}>
              <SearchBar size="large" />
            </div>

            {/* Quick Stats */}
            <div className="animate-fade-in mt-8 flex flex-wrap justify-center gap-6 text-primary-foreground/90" style={{ animationDelay: "0.3s" }}>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">+500 negócios anunciados</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span className="text-sm font-medium">+2.000 compradores ativos</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <span className="text-sm font-medium">Transações seguras</span>
              </div>
            </div>
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

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {categorias.map((categoria) => (
              <CategoryCard
                key={categoria.id}
                id={categoria.id}
                nome={categoria.nome}
                icone={categoria.icone}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="bg-muted/50 py-16 md:py-20">
        <div className="container-app">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Negócios em Destaque
              </h2>
              <p className="mt-2 text-muted-foreground">
                Oportunidades verificadas e com alto potencial
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link to="/busca">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      {/* Recent Listings */}
      <section className="py-16 md:py-20">
        <div className="container-app">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Adicionados Recentemente
              </h2>
              <p className="mt-2 text-muted-foreground">
                As mais novas oportunidades de negócio
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link to="/busca">
                Ver todos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="gradient-hero py-16 md:py-20">
        <div className="container-app">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold text-primary-foreground md:text-3xl">
              Quer Vender Seu Negócio?
            </h2>
            <p className="mt-4 text-primary-foreground/80">
              Alcance milhares de compradores qualificados e venda seu negócio
              de forma rápida e segura.
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
                className="w-full border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
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
