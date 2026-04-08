import { supabase } from "@/lib/supabase";
import { sendWhatsAppMessage } from "@/lib/uazapi";

export interface LeadMessage {
  id: string;
  lead_id: string;
  sender_type: "corretor" | "lead";
  sender_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}

export async function getMessagesByLead(leadId: string): Promise<LeadMessage[]> {
  const { data, error } = await supabase
    .from("lead_messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar mensagens:", error);
    return [];
  }
  return data as LeadMessage[];
}

export interface SendMessageResult {
  saved: boolean;
  whatsapp: "sent" | "no_phone" | "error" | "skipped";
  error?: string;
  debugInfo?: string;
}

export async function sendMessage(
  leadId: string,
  message: string,
  senderType: "corretor" | "lead" = "corretor",
  leadPhone?: string
): Promise<SendMessageResult> {
  const { data: { session } } = await supabase.auth.getSession();

  // 1. Salva no banco
  // is_read = false para todos — fica cinza até o lead realmente ler no WhatsApp
  const { error } = await supabase.from("lead_messages").insert({
    lead_id: leadId,
    sender_type: senderType,
    sender_id: session?.user?.id || null,
    message,
    is_read: false,
  });

  if (error) {
    console.error("Erro ao salvar mensagem:", error);
    return { saved: false, whatsapp: "skipped", error: error.message };
  }

  // 2. Se for corretor enviando e tem telefone, manda via Uazapi
  if (senderType === "corretor" && leadPhone) {
    // Detecta tipo de mídia pelo prefixo
    if (message.startsWith("[IMAGE]:")) {
      const { sendWhatsAppImage } = await import("@/lib/uazapi");
      const imageUrl = message.replace("[IMAGE]:", "");
      const result = await sendWhatsAppImage(leadPhone, imageUrl);
      return { saved: true, whatsapp: result.success ? "sent" : "error", error: result.error, debugInfo: result.debugInfo };
    }
    if (message.startsWith("[AUDIO]:") || message.startsWith("[VIDEO]:") || message.startsWith("[FILE]:")) {
      const { sendWhatsAppFile } = await import("@/lib/uazapi");
      let fileUrl = "";
      let mimeType = "application/octet-stream";
      let fileName: string | undefined;
      if (message.startsWith("[AUDIO]:")) {
        fileUrl = message.replace("[AUDIO]:", "");
        mimeType = "audio/mpeg";
      } else if (message.startsWith("[VIDEO]:")) {
        fileUrl = message.replace("[VIDEO]:", "");
        mimeType = "video/mp4";
      } else {
        // [FILE]:url|filename
        const raw = message.replace("[FILE]:", "");
        const sepIdx = raw.lastIndexOf("|");
        fileUrl = sepIdx >= 0 ? raw.slice(0, sepIdx) : raw;
        fileName = sepIdx >= 0 ? raw.slice(sepIdx + 1) : "arquivo";
        mimeType = "application/pdf";
      }
      const result = await sendWhatsAppFile(leadPhone, fileUrl, mimeType, fileName);
      return { saved: true, whatsapp: result.success ? "sent" : "error", error: result.error, debugInfo: result.debugInfo };
    }
    const result = await sendWhatsAppMessage(leadPhone, message);
    return {
      saved: true,
      whatsapp: result.success ? "sent" : "error",
      error: result.error,
      debugInfo: result.debugInfo,
    };
  }

  return {
    saved: true,
    whatsapp: leadPhone ? "skipped" : "no_phone",
  };
}

export async function markMessagesAsRead(leadId: string): Promise<void> {
  // Só marca as mensagens DO LEAD como lidas (corretor abriu o chat)
  // Mensagens do corretor ficam cinza — só ficam azuis se Uazapi enviar confirmação de leitura
  await supabase
    .from("lead_messages")
    .update({ is_read: true })
    .eq("lead_id", leadId)
    .eq("sender_type", "lead")
    .eq("is_read", false);
}

export async function getUnreadCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("lead_messages")
    .select("lead_id")
    .eq("is_read", false)
    .eq("sender_type", "lead");

  if (error) return {};

  const counts: Record<string, number> = {};
  for (const msg of data) {
    counts[msg.lead_id] = (counts[msg.lead_id] || 0) + 1;
  }
  return counts;
}
