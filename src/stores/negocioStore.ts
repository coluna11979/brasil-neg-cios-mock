import { supabase } from "@/lib/supabase";

export interface Negocio {
  id: string;
  titulo: string;
  categoria: string;
  cidade: string;
  estado: string;
  area_m2?: number;
  descricao?: string;
  preco?: number;
  faturamento_mensal?: number;
  proprietario_nome: string;
  proprietario_email: string;
  proprietario_telefone?: string;
  status: "pendente" | "ativo" | "rejeitado" | "vendido" | "rascunho";
  criado_em: string;
  /** @deprecated use criado_em */
  created_at?: string;
}

export async function getAllNegocios(): Promise<Negocio[]> {
  const { data, error } = await supabase
    .from("negocios")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error("Erro ao buscar negócios:", error);
    return [];
  }
  return data as Negocio[];
}

export async function updateNegocio(
  id: string,
  fields: Partial<Omit<Negocio, "id" | "criado_em" | "created_at">>
): Promise<boolean> {
  const { error } = await supabase
    .from("negocios")
    .update(fields)
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar negócio:", error);
    return false;
  }
  return true;
}

export async function updateNegocioStatus(
  id: string,
  status: Negocio["status"]
): Promise<boolean> {
  const { error } = await supabase
    .from("negocios")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar negócio:", error);
    return false;
  }
  return true;
}

export function formatCurrency(value?: number): string {
  if (!value) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}
