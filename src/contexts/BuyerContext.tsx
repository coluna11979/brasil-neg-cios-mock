import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface BuyerContextType {
  session: Session | null;
  favorites: string[];
  toggleFavorite: (negocioId: string) => Promise<boolean>;
  showAuthModal: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signOut: () => Promise<void>;
}

const BuyerContext = createContext<BuyerContextType | null>(null);

export function BuyerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setFavorites([]); return; }
    supabase
      .from("favoritos")
      .select("negocio_id")
      .eq("user_id", session.user.id)
      .then(({ data }) => setFavorites(data?.map((f: { negocio_id: string }) => f.negocio_id) || []));
  }, [session?.user?.id]);

  const toggleFavorite = async (negocioId: string): Promise<boolean> => {
    if (!session?.user) {
      setShowAuthModal(true);
      return false;
    }
    const isFav = favorites.includes(negocioId);
    if (isFav) {
      await supabase.from("favoritos").delete().eq("user_id", session.user.id).eq("negocio_id", negocioId);
      setFavorites((prev) => prev.filter((id) => id !== negocioId));
    } else {
      await supabase.from("favoritos").insert({ user_id: session.user.id, negocio_id: negocioId });
      setFavorites((prev) => [...prev, negocioId]);
    }
    return true;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setFavorites([]);
  };

  return (
    <BuyerContext.Provider
      value={{
        session,
        favorites,
        toggleFavorite,
        showAuthModal,
        openAuthModal: () => setShowAuthModal(true),
        closeAuthModal: () => setShowAuthModal(false),
        signOut,
      }}
    >
      {children}
    </BuyerContext.Provider>
  );
}

export function useBuyer() {
  const ctx = useContext(BuyerContext);
  if (!ctx) throw new Error("useBuyer must be used within BuyerProvider");
  return ctx;
}
