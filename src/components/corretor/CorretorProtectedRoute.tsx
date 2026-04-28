import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

/**
 * Protege rotas /corretor/*.
 * Regras:
 *  - Sem sessão                         → /corretor/login
 *  - role === "admin"                   → ACESSO LIBERADO (admin é "super")
 *  - role === "corretor" && ativo       → ACESSO LIBERADO
 *  - role === "corretor" && !ativo      → /corretor/login (cadastro em análise)
 *  - qualquer outra role / sem profile  → /corretor/login
 *
 * Nota: o admin tem acesso à área do corretor por design da plataforma —
 * pode operar como corretor sem precisar de uma conta separada.
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

      const isAdmin           = profile?.role === "admin";
      const isCorretorAtivo   = profile?.role === "corretor" && profile?.ativo === true;
      const ok = isAdmin || isCorretorAtivo;

      // Só desloga se for um corretor INATIVO ou role inválido — evita o
      // caso "admin sem ativo" desconectar quem tem permissão real.
      if (!ok) await supabase.auth.signOut();

      if (!cancelled) {
        setAllowed(ok);
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
