import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, Loader2, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { useBuyer } from "@/contexts/BuyerContext";
import { supabase } from "@/lib/supabase";
import { adaptNegocio, type NegocioSupabase } from "@/hooks/useNegocios";
import usePageTitle from "@/hooks/usePageTitle";

const MeusFavoritos = () => {
  usePageTitle("Meus Favoritos");
  const { session, favorites, openAuthModal } = useBuyer();
  const [listings, setListings] = useState<ReturnType<typeof adaptNegocio>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session || favorites.length === 0) { setListings([]); return; }
    setLoading(true);
    supabase
      .from("negocios")
      .select("*")
      .in("id", favorites)
      .then(({ data }) => {
        setListings((data as NegocioSupabase[] || []).map(adaptNegocio));
        setLoading(false);
      });
  }, [favorites, session]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-app">
          <Link
            to="/busca"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para busca
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Meus Favoritos</h1>
              {session && listings.length > 0 && (
                <p className="text-sm text-muted-foreground">{listings.length} negócio{listings.length !== 1 ? "s" : ""} salvos</p>
              )}
            </div>
          </div>

          {!session ? (
            <div className="mt-16 flex flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Heart className="h-9 w-9 text-muted-foreground" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold text-foreground">Entre para ver seus favoritos</h2>
              <p className="mt-2 max-w-sm text-muted-foreground text-sm">
                Salve os negócios que te interessam e acompanhe tudo em um só lugar.
              </p>
              <Button className="mt-6 font-semibold" onClick={openAuthModal}>
                Entrar / Criar conta
              </Button>
            </div>
          ) : loading ? (
            <div className="mt-16 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : listings.length === 0 ? (
            <div className="mt-16 flex flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Heart className="h-9 w-9 text-muted-foreground" />
              </div>
              <h2 className="mt-5 font-display text-xl font-semibold text-foreground">Nenhum favorito ainda</h2>
              <p className="mt-2 max-w-sm text-muted-foreground text-sm">
                Navegue pelos anúncios e clique no coração para salvar os que te interessam.
              </p>
              <Button asChild className="mt-6 font-semibold">
                <Link to="/busca">Explorar negócios</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
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

export default MeusFavoritos;
