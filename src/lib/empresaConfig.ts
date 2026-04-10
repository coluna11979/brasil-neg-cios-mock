import { supabase } from "./supabase";

export interface EmpresaConfig {
  nome: string;
  telefone: string;
  whatsapp: string;
  email: string;
  site: string;
  instagram: string;
  cnpj: string;
  endereco: string;
}

const DEFAULT: EmpresaConfig = {
  nome:      "NegócioJá",
  telefone:  "",
  whatsapp:  "",
  email:     "",
  site:      "",
  instagram: "",
  cnpj:      "",
  endereco:  "",
};

let cache: EmpresaConfig | null = null;

export async function getEmpresaConfig(): Promise<EmpresaConfig> {
  if (cache) return cache;
  const { data } = await supabase.from("empresa_config").select("*").eq("id", 1).single();
  cache = data ? { ...DEFAULT, ...data } : DEFAULT;
  return cache;
}

export function clearEmpresaConfigCache() {
  cache = null;
}

export async function saveEmpresaConfig(config: Partial<EmpresaConfig>): Promise<boolean> {
  const { error } = await supabase
    .from("empresa_config")
    .upsert({ id: 1, ...config, updated_at: new Date().toISOString() });
  if (!error) clearEmpresaConfigCache();
  return !error;
}
