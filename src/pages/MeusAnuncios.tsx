import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { mockListings } from "@/data/mockListings";
import { getCreatedIds } from "@/data/sessionStore";

const MeusAnuncios = () => {
  const createdIds = getCreatedIds();
  const meusAnuncios = mockListings.filter((l) => createdIds.includes(l.id));

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

          <div className="mt-6">
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Meus Anúncios
            </h1>
            <p className="mt-2 text-muted-foreground">
              Anúncios criados durante esta sessão de navegação.
            </p>
          </div>

          {meusAnuncios.length === 0 ? (
            <div className="mt-16 flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Package className="h-10 w-10 text-muted-foreground" />
              </div>
              <h2 className="mt-6 font-display text-xl font-semibold text-foreground">
                Nenhum anúncio criado ainda
              </h2>
              <p className="mt-2 max-w-sm text-muted-foreground">
                Você ainda não criou nenhum anúncio nesta sessão. Crie seu primeiro anúncio agora!
              </p>
              <Button asChild className="mt-6 gap-2 font-semibold">
                <Link to="/anunciar">
                  <Plus className="h-4 w-4" />
                  Criar Anúncio
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {meusAnuncios.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MeusAnuncios;
