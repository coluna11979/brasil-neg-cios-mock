// Supabase Edge Function — Webhook para receber mensagens do Uazapi GO V2
// Uazapi chama esta URL quando o número recebe uma mensagem

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    console.log("[receive-whatsapp] Payload recebido:", JSON.stringify(body));

    // Uazapi GO V2 pode enviar array ou objeto único
    const events = Array.isArray(body) ? body : [body];

    for (const event of events) {

      // ── Ignorar mensagens enviadas pelo próprio número ──
      const fromMe =
        event?.message?.fromme ||
        event?.fromMe ||
        event?.data?.key?.fromMe ||
        event?.key?.fromMe ||
        false;
      if (fromMe) {
        console.log("[receive-whatsapp] Mensagem própria (fromMe), ignorando.");
        continue;
      }

      // ── Extrair número do remetente ──
      // Formato Uazapi GO V2: event.message.chatid = "5511999999999@s.whatsapp.net" ou só "5511999999999"
      const chatid =
        event?.message?.chatid ||          // Uazapi GO V2 principal
        event?.data?.key?.remoteJid ||     // fallback formato antigo
        event?.key?.remoteJid ||
        event?.remoteJid ||
        "";

      // ── Extrair texto da mensagem ──
      // Formato Uazapi GO V2: event.message.text
      const messageText =
        event?.message?.text ||                              // Uazapi GO V2 principal
        event?.data?.message?.conversation ||               // fallback
        event?.data?.message?.extendedTextMessage?.text ||
        event?.message?.conversation ||
        event?.message?.extendedTextMessage?.text ||
        event?.text ||
        "";

      if (!chatid || !messageText) {
        console.log("[receive-whatsapp] Sem chatid ou texto, ignorando. chatid:", chatid, "texto:", messageText);
        continue;
      }

      // Normaliza número: remove @s.whatsapp.net, só dígitos, remove +55 ou 55 do início
      const rawPhone = chatid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
      const phoneSemCodigo = rawPhone.startsWith("55") ? rawPhone.slice(2) : rawPhone;

      console.log(`[receive-whatsapp] Mensagem de ${phoneSemCodigo}: "${messageText}"`);

      // ── Busca lead pelo telefone ──
      // Tenta várias variações do número
      const { data: leads } = await supabase
        .from("leads")
        .select("id, nome, telefone")
        .or(
          `telefone.eq.${phoneSemCodigo},` +
          `telefone.eq.55${phoneSemCodigo},` +
          `telefone.eq.+55${phoneSemCodigo},` +
          `telefone.eq.0${phoneSemCodigo}`
        )
        .limit(1);

      if (!leads || leads.length === 0) {
        console.log(`[receive-whatsapp] Nenhum lead para telefone ${phoneSemCodigo}`);
        continue;
      }

      const lead = leads[0];
      console.log(`[receive-whatsapp] Lead: ${lead.nome} (${lead.id})`);

      // ── Salva mensagem com sender_type = 'lead' ──
      const { error } = await supabase.from("lead_messages").insert({
        lead_id: lead.id,
        sender_type: "lead",
        sender_id: null,
        message: messageText,
        is_read: false,
      });

      if (error) {
        console.error("[receive-whatsapp] Erro ao salvar mensagem:", error);
      } else {
        console.log("[receive-whatsapp] ✅ Mensagem salva com sucesso.");
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("[receive-whatsapp] Erro:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
