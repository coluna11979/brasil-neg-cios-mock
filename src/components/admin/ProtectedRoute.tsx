import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

/**
 * Protege rotas /admin/*.
 * Regra: APENAS profiles.role === 'admin' tem acesso.
 * Corretores autenticados são bloqueados — devem ir para /corretor.
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
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
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!cancelled) {
        setAllowed(profile?.role === "admin");
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

  if (!allowed) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
