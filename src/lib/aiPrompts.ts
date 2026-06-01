import { supabase } from "@/lib/supabase";

export interface AiPrompt {
  key: string;
  nome: string;
  descricao: string;
  template: string;
  variaveis: string[];
  updated_at?: string;
}

// Cache em memória (60s)
let cache: Record<string, AiPrompt> | null = null;
let cacheAt = 0;
const TTL_MS = 60_000;

async function loadAll(): Promise<Record<string, AiPrompt>> {
  if (cache && Date.now() - cacheAt < TTL_MS) return cache;
  const { data, error } = await supabase
    .from("ai_prompts")
    .select("key, nome, descricao, template, variaveis, updated_at");
  if (error) {
    console.error("[aiPrompts] erro ao carregar:", error.message);
    return cache || {};
  }
  const map: Record<string, AiPrompt> = {};
  (data || []).forEach((p) => { map[p.key] = p as AiPrompt; });
  cache = map;
  cacheAt = Date.now();
  return map;
}

/** Lista todos os prompts (para tela de configuração). */
export async function listAiPrompts(): Promise<AiPrompt[]> {
  const map = await loadAll();
  return Object.values(map).sort((a, b) => a.key.localeCompare(b.key));
}

/** Atualiza o template de um prompt. */
export async function saveAiPrompt(key: string, template: string): Promise<boolean> {
  const { error } = await supabase
    .from("ai_prompts")
    .update({ template, updated_at: new Date().toISOString() })
    .eq("key", key);
  if (!error) invalidateAiPromptsCache();
  return !error;
}

/** Invalida o cache — chame após salvar uma alteração. */
export function invalidateAiPromptsCache() {
  cache = null;
  cacheAt = 0;
}

/**
 * Busca o template de um prompt e interpola variáveis ({nome}, {origem}, etc).
 * Se a key não existir no banco, retorna fallback (string vazia ou opcional).
 */
export async function getAiPrompt(
  key: string,
  vars: Record<string, string> = {},
  fallback = ""
): Promise<string> {
  const map = await loadAll();
  const p = map[key];
  if (!p) return fallback;
  let out = p.template;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v ?? "");
  }
  return out;
}
