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
  foto_url?: string;
  imagem?: string | null;
  imagens?: string[];
  destaque?: boolean;
  status: "pendente" | "ativo" | "rejeitado" | "vendido" | "rascunho";
  criado_em: string;
  /** @deprecated use criado_em */
  created_at?: string;
  // Legendas sobre a foto
  badge_texto?: string | null;
  badge_cor?: "green" | "blue" | "red" | "amber" | "violet" | "slate" | null;
  mostrar_preco_foto?: boolean;
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
  // Tabela `negocios` guarda foto em `imagem` (URL) ou `imagens` (array).
  // Mapeamos pra `foto_url` em memória pra todos os componentes continuarem funcionando.
  return (data as (Negocio & { imagem?: string; imagens?: string[] })[]).map((row) => ({
    ...row,
    foto_url: row.foto_url || row.imagem || (row.imagens && row.imagens[0]) || undefined,
  })) as Negocio[];
}

export async function updateNegocio(
  id: string,
  fields: Partial<Omit<Negocio, "id" | "criado_em" | "created_at">>
): Promise<boolean> {
  // foto_url é alias em memória — coluna real é `imagem`
  const { foto_url, ...rest } = fields;
  const dbFields: Record<string, unknown> = { ...rest };
  if (foto_url !== undefined) dbFields.imagem = foto_url;

  const { error } = await supabase
    .from("negocios")
    .update(dbFields)
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

/** Exclui permanentemente um negócio (e tudo que depender dele em cascata). */
export async function deleteNegocio(id: string): Promise<boolean> {
  const { error } = await supabase.from("negocios").delete().eq("id", id);
  if (error) {
    console.error("Erro ao excluir negócio:", error);
    return false;
  }
  return true;
}

/** Exclui permanentemente uma galeria (e seus espaços em cascata, se houver FK). */
export async function deleteGaleria(id: string): Promise<boolean> {
  // Remove espaços primeiro (caso não tenha ON DELETE CASCADE)
  await supabase.from("espacos_galeria").delete().eq("galeria_id", id);
  const { error } = await supabase.from("galerias").delete().eq("id", id);
  if (error) {
    console.error("Erro ao excluir galeria:", error);
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
