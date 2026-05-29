import { supabase } from "@/lib/supabase";

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const fnHeaders = { Authorization: `Bearer ${ANON_KEY}` };

export interface IntegrationSettings {
  uazapi_url: string;
  uazapi_token: string;
  google_api_key: string;
  admin_phone: string;
}

export interface WhatsAppStatus {
  connected: boolean;
  instanceStatus: string | null;
  qrcode: string;
  paircode: string;
  profileName?: string;
  owner?: string;
  lastDisconnectReason?: string;
  error?: string;
}

const EMPTY: IntegrationSettings = {
  uazapi_url: "",
  uazapi_token: "",
  google_api_key: "",
  admin_phone: "",
};

/** Lê as chaves do banco (apenas admin autenticado tem acesso via RLS). */
export async function getIntegrationSettings(): Promise<IntegrationSettings> {
  const { data, error } = await supabase
    .from("integration_settings")
    .select("uazapi_url, uazapi_token, google_api_key, admin_phone")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) return { ...EMPTY };
  return {
    uazapi_url: data.uazapi_url ?? "",
    uazapi_token: data.uazapi_token ?? "",
    google_api_key: data.google_api_key ?? "",
    admin_phone: data.admin_phone ?? "",
  };
}

/** Salva as chaves no banco. */
export async function saveIntegrationSettings(
  cfg: IntegrationSettings
): Promise<boolean> {
  const { error } = await supabase
    .from("integration_settings")
    .update({ ...cfg, updated_at: new Date().toISOString() })
    .eq("id", 1);
  return !error;
}

/** Status real da conexão do WhatsApp (via Edge Function → /instance/status). */
export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: { __status: true },
      headers: fnHeaders,
    });
    if (error) return { connected: false, instanceStatus: null, qrcode: "", paircode: "", error: error.message };
    if (!data?.success) return { connected: false, instanceStatus: null, qrcode: "", paircode: "", error: data?.error };
    return {
      connected: !!data.uazapiConnected,
      instanceStatus: data.instanceStatus ?? null,
      qrcode: data.qrcode ?? "",
      paircode: data.paircode ?? "",
      profileName: data.profileName,
      owner: data.owner,
      lastDisconnectReason: data.lastDisconnectReason,
    };
  } catch (err) {
    return { connected: false, instanceStatus: null, qrcode: "", paircode: "", error: err instanceof Error ? err.message : String(err) };
  }
}

/** Inicia conexão — retorna QR Code + código de pareamento. */
export async function connectWhatsApp(phone?: string): Promise<WhatsAppStatus> {
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: phone ? { __connect: true, phone } : { __connect: true },
      headers: fnHeaders,
    });
    if (error) return { connected: false, instanceStatus: null, qrcode: "", paircode: "", error: error.message };
    if (!data?.success) return { connected: false, instanceStatus: null, qrcode: "", paircode: "", error: data?.error };
    return {
      connected: !!data.uazapiConnected,
      instanceStatus: data.instanceStatus ?? null,
      qrcode: data.qrcode ?? "",
      paircode: data.paircode ?? "",
    };
  } catch (err) {
    return { connected: false, instanceStatus: null, qrcode: "", paircode: "", error: err instanceof Error ? err.message : String(err) };
  }
}

/** Desconecta a instância. */
export async function disconnectWhatsApp(): Promise<boolean> {
  try {
    const { data } = await supabase.functions.invoke("send-whatsapp", {
      body: { __disconnect: true },
      headers: fnHeaders,
    });
    return !!data?.success;
  } catch {
    return false;
  }
}
