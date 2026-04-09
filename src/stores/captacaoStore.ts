import { supabase } from "@/lib/supabase";

export interface Captacao {
  id: string;
  corretor_id?: string;
  nome_negocio: string;
  tipo?: string;
  endereco?: string;
  contato_nome?: string;
  contato_telefone?: string;
  valor_estimado?: number;
  observacoes?: string;
  status: "prospeccao" | "contato-feito" | "visita-agendada" | "captado" | "perdido";
  criado_em: string;
  atualizado_em: string;
  // joined
  corretor_nome?: string;
}

export async function getAllCaptacoes(): Promise<Captacao[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let query = supabase
    .from("captacoes")
    .select("*, profiles(nome)")
    .order("criado_em", { ascending: false });

  if (profile?.role === "corretor") {
    query = query.eq("corretor_id", user.id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Erro ao buscar captações:", error);
    return [];
  }

  return (data || []).map((c: Record<string, unknown>) => ({
    ...c,
    corretor_nome: (c.profiles as { nome?: string } | null)?.nome,
  })) as Captacao[];
}

export async function addCaptacao(cap: {
  nome_negocio: string;
  tipo?: string;
  endereco?: string;
  contato_nome?: string;
  contato_telefone?: string;
  valor_estimado?: number;
  observacoes?: string;
}): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("captacoes").insert({
    ...cap,
    corretor_id: user.id,
    status: "prospeccao",
  });

  if (error) {
    console.error("Erro ao criar captação:", error);
    return false;
  }
  return true;
}

export async function updateCaptacaoStatus(
  id: string,
  status: Captacao["status"]
): Promise<void> {
  const { error } = await supabase
    .from("captacoes")
    .update({ status })
    .eq("id", id);

  if (error) console.error("Erro ao atualizar captação:", error);
}

export async function updateCaptacao(
  id: string,
  data: Partial<Omit<Captacao, "id" | "criado_em" | "atualizado_em">>
): Promise<void> {
  const { error } = await supabase
    .from("captacoes")
    .update(data)
    .eq("id", id);

  if (error) console.error("Erro ao atualizar captação:", error);
}
