/**
 * useTeamMembers — lista membros ativos do time (id + nome).
 * Usado pela Plataforma de Agentes (selecionar responsável / closer).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface TeamMember {
  id: string;
  name: string;
  phone?: string | null;
  role?: string | null;
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: async (): Promise<TeamMember[]> => {
      // Este CRM usa `profiles` (nome/telefone/ativo) em vez de team_members.
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, telefone, role")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return ((data as any[]) || []).map((p) => ({ id: p.id, name: p.nome, phone: p.telefone, role: p.role }));
    },
    staleTime: 60_000,
  });
}

export default useTeamMembers;
