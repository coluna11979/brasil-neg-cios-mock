/**
 * AuthContext — shim de autenticação pra Plataforma de Agentes.
 *
 * Expõe `useAuth()` retornando o team_member do usuário logado (resolvido
 * pelo email da sessão Supabase) + flag de loading. Não exige Provider:
 * o hook gerencia seu próprio estado via supabase.auth.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface TeamMemberAuth {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export function useAuth() {
  const [teamMember, setTeamMember] = useState<TeamMemberAuth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const email = data.session?.user?.email;
        if (!email) {
          if (active) { setTeamMember(null); setLoading(false); }
          return;
        }
        // Este CRM usa a tabela `profiles` (não team_members). Mapeia nome/email.
        const userId = data.session?.user?.id;
        const { data: tm } = await supabase
          .from("profiles")
          .select("id, nome, email, role")
          .eq("id", userId)
          .maybeSingle();
        const mapped = tm
          ? { id: (tm as any).id, name: (tm as any).nome, email: (tm as any).email, role: (tm as any).role }
          : (userId ? { id: userId, name: null, email, role: null } : null);
        if (active) { setTeamMember(mapped as TeamMemberAuth | null); setLoading(false); }
      } catch {
        if (active) { setTeamMember(null); setLoading(false); }
      }
    })();
    return () => { active = false; };
  }, []);

  return { teamMember, loading, user: teamMember };
}

export default useAuth;
