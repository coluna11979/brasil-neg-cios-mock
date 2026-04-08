import { supabase } from "@/lib/supabase";

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Forçamos o anon key nas chamadas à Edge Function para evitar problemas
// com JWT de sessão do admin (expirado, etc.)
const fnHeaders = { Authorization: `Bearer ${ANON_KEY}` };

export interface UazapiMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  debugInfo?: string;
}

// Formata número brasileiro pro formato internacional
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

/**
 * Envia mensagem via Supabase Edge Function (proxy para Uazapi).
 * A chamada sai do servidor → sem CORS, token protegido no backend.
 */
export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<UazapiMessageResult> {
  try {
    console.log("[Uazapi] Chamando Edge Function send-whatsapp para:", formatPhone(phone));

    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: { phone, message },
      headers: fnHeaders,
    });

    if (error) {
      console.error("[Uazapi] Erro na Edge Function:", error);
      return {
        success: false,
        error: `Edge Function error: ${error.message}`,
        debugInfo: JSON.stringify(error),
      };
    }

    console.log("[Uazapi] Resposta da Edge Function:", data);

    if (!data?.success) {
      return {
        success: false,
        error: data?.error || "Uazapi não retornou sucesso",
        debugInfo: JSON.stringify(data),
      };
    }

    return {
      success: true,
      messageId: data.messageId,
      debugInfo: JSON.stringify(data.raw),
    };

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Uazapi] Erro inesperado:", msg);
    return {
      success: false,
      error: msg,
      debugInfo: msg,
    };
  }
}

/**
 * Verifica status real da instância Uazapi via Edge Function
 * Chama GET /status no Uazapi para ver se está conectado ao WhatsApp
 */
export async function checkInstanceStatus(): Promise<{ connected: boolean; status?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: { __ping: true },
      headers: fnHeaders,
    });

    if (error) {
      console.warn("[Uazapi] Edge Function inacessível:", error.message);
      return { connected: false, status: `Edge Function inacessível: ${error.message}` };
    }

    console.log("[Uazapi] Status check resposta:", data);

    if (!data?.success) {
      return { connected: false, status: data?.error || "Credenciais não configuradas" };
    }

    if (!data?.uazapiConnected) {
      return { connected: false, status: "Instância Uazapi desconectada do WhatsApp" };
    }

    return { connected: true, status: "Uazapi conectado" };
  } catch (err) {
    return { connected: false, status: `Erro: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Envia arquivo genérico (PDF, áudio, vídeo) via WhatsApp
 */
export async function sendWhatsAppFile(
  phone: string,
  fileUrl: string,
  mimeType: string,
  fileName?: string
): Promise<UazapiMessageResult> {
  try {
    const isAudio = mimeType.startsWith("audio/");
    const isVideo = mimeType.startsWith("video/");

    let body: Record<string, string>;
    if (isAudio) {
      body = { phone, audioUrl: fileUrl };
    } else if (isVideo) {
      body = { phone, videoUrl: fileUrl };
    } else {
      body = { phone, documentUrl: fileUrl, fileName: fileName || "arquivo" };
    }

    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body,
      headers: fnHeaders,
    });

    if (error) return { success: false, error: `Edge Function error: ${error.message}` };
    if (!data?.success) return { success: false, error: data?.error || "Erro ao enviar arquivo", debugInfo: JSON.stringify(data) };
    return { success: true, messageId: data.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

/**
 * Envia imagem via WhatsApp (usa URL pública — Supabase Storage)
 */
export async function sendWhatsAppImage(
  phone: string,
  imageUrl: string,
  caption?: string
): Promise<UazapiMessageResult> {
  try {
    console.log("[Uazapi] Enviando imagem para:", formatPhone(phone));

    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: { phone, imageUrl, caption: caption || "" },
      headers: fnHeaders,
    });

    if (error) {
      return { success: false, error: `Edge Function error: ${error.message}`, debugInfo: JSON.stringify(error) };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || "Erro ao enviar imagem", debugInfo: JSON.stringify(data) };
    }

    return { success: true, messageId: data.messageId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
