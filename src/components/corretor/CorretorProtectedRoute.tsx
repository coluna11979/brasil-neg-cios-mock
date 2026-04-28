import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

/**
 * Protege rotas /corretor/*.
 * Regras:
 *  - Sem sessão                         → redireciona para /corretor/login
 *  - Sessão de role !== "corretor"      → redireciona para /corretor/login
 *  - Corretor com ativo === false       → redireciona para /corretor/login
 *    (mostra mensagem "cadastro em análise" lá — fluxo já existente)
 */
const CorretorProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (!cancelled) { setAllowed(false); setLoading(false); }
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, ativo")
        .eq("id", session.user.id)
        .single();

      const ok = profile?.role === "corretor" && profile?.ativo === true;
      if (!ok) {
        // Garante limpeza da sessão para evitar loop
        await supabase.auth.signOut();
      }
      if (!cancelled) {
        setAllowed(!!ok);
        setLoading(false);
      }
    };

    check();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) return <Navigate to="/corretor/login" replace />;

  return <>{children}</>;
};

export default CorretorProtectedRoute;
