import { supabase } from "@/lib/supabase";

const MODEL = "gemini-2.5-flash-lite";
const ENV_KEY = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;

// Cache da chave em memória para evitar SELECT a cada chamada
let cachedKey: string | null = null;
let cacheAt = 0;
const CACHE_TTL_MS = 60_000;

async function getGoogleApiKey(): Promise<string> {
  // Cache válido?
  if (cachedKey && Date.now() - cacheAt < CACHE_TTL_MS) return cachedKey;

  // Lê do banco (admin logado tem acesso via RLS)
  try {
    const { data } = await supabase
      .from("integration_settings")
      .select("google_api_key")
      .eq("id", 1)
      .maybeSingle();
    const k = data?.google_api_key?.trim();
    if (k) {
      cachedKey = k;
      cacheAt = Date.now();
      return k;
    }
  } catch {
    /* cai no fallback */
  }

  // Fallback: .env (versões antigas)
  if (ENV_KEY) {
    cachedKey = ENV_KEY;
    cacheAt = Date.now();
    return ENV_KEY;
  }

  throw new Error("Google API Key não configurada. Vá em Admin → Integrações → Chaves de API.");
}

/** Invalida o cache — chamar após salvar nova chave na UI. */
export function invalidateGoogleApiKeyCache() {
  cachedKey = null;
  cacheAt = 0;
}

export async function callClaude(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const apiKey = await getGoogleApiKey();

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n---\n\n${prompt}`
    : prompt;

  const body: Record<string, unknown> = {
    contents: [{ parts: [{ text: fullPrompt }] }],
  };

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    // Se chave inválida, invalida cache para forçar nova leitura na próxima
    if (response.status === 400 || response.status === 403) invalidateGoogleApiKeyCache();
    throw new Error(`Erro na API Google: ${err}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text as string;
}
