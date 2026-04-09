// Supabase Edge Function — send-whatsapp + webhook receiver (Uazapi GO V2)
// verify_jwt: false

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decodeBase64, encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Formato REAL do Uazapi GO V2:
// message: { chatid, type, mediaType, content, text, fromMe, isGroup, ... }
// Campos confirmados via DEBUG_KEYS:
// buttonOrListid, chatid, chatlid, content, convertOptions, edited, fromMe, groupName,
// id, isGroup, mediaType, messageTimestamp, messageType, messageid, owner, quoted,
// reaction, sender, senderName, sender_lid, sender_pn, source, status, text,
// track_id, track_source, type, vote, wasSentByApi
interface ExtractedMessage {
  phone: string;
  text: string;
  base64?: string; // conteúdo base64 para upload
  mimetype?: string;
}

function extractUazapiMessage(body: Record<string, unknown>): ExtractedMessage | null {
  const msg = body?.message as Record<string, unknown> | undefined;

  if (!msg) return null;
  if (msg.isGroup) return null;
  if (msg.fromMe) return null;

  const chatid = (msg.chatid as string) || "";
  const phone = chatid.replace("@s.whatsapp.net", "").replace("@c.us", "").replace(/\D/g, "");
  if (!phone) return null;

  const msgType = (msg.type as string) || "";
  // mediaType: "image", "audio", "video", "document", "sticker" etc.
  const mediaType = ((msg.mediaType as string) || "").toLowerCase();
  let text = (msg.text as string) || "";

  // Mídia (Uazapi GO V2 usa type="media")
  if (msgType === "media") {
    const content = (msg.content as string) || "";
    const caption = text;


    if (mediaType === "audio" || mediaType === "ptt") {
      const msgId = (msg.id as string) || (msg.messageid as string) || "";
      if (msgId) return { phone, text: `[FETCH_MEDIA_audio]:${msgId}` };
      return { phone, text: "🎤 Áudio recebido" };
    }
    if (mediaType === "video") {
      const msgId = (msg.id as string) || (msg.messageid as string) || "";
      if (msgId) return { phone, text: `[FETCH_MEDIA_video]:${msgId}` };
      return { phone, text: "🎥 Vídeo recebido" };
    }
    if (mediaType === "document") return { phone, text: "📎 Arquivo recebido" };

    const msgId = (msg.id as string) || (msg.messageid as string) || "";

    if (content && content.length > 100) {
      const mime = mediaType === "sticker" ? "image/webp" : "image/jpeg";
      return { phone, text: caption || "📸 Imagem recebida", base64: content, mimetype: mime };
    }

    // Uazapi GO V2 não envia base64 no webhook → baixar via POST /message/download
    if (msgId) {
      return { phone, text: `[FETCH_MEDIA]:${msgId}` };
    }
    return { phone, text: caption || "📸 Imagem recebida" };
  }

  if (msgType === "videoMessage" || msgType === "video") text = text || "🎥 Vídeo recebido";
  if (msgType === "audioMessage" || msgType === "audio" || msgType === "ptt") text = text || "🎤 Áudio recebido";
  if (msgType === "documentMessage" || msgType === "document") {
    text = text || `📎 Arquivo: ${(msg.fileName as string) || "arquivo"}`;
  }

  // Album
  if (text.trim().toLowerCase().startsWith("album:")) {
    const num = text.match(/\d+/)?.[0] || "";
    text = `📸 Álbum: ${num} foto(s) — veja no WhatsApp`;
  }

  if (!text.trim()) return null;
  return { phone, text };
}

function phoneVariations(digits: string): string[] {
  const semCodigo = digits.startsWith("55") ? digits.slice(2) : digits;
  const com9 = semCodigo.length === 10 ? semCodigo.slice(0, 2) + "9" + semCodigo.slice(2) : semCodigo;
  const sem9 = semCodigo.length === 11 ? semCodigo.slice(0, 2) + semCodigo.slice(3) : semCodigo;
  return [...new Set([semCodigo, com9, sem9, `55${semCodigo}`, `55${com9}`, `+55${semCodigo}`])];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json() as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ success: false, error: "Invalid JSON" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const UAZAPI_URL = Deno.env.get("UAZAPI_URL");
  const UAZAPI_TOKEN = Deno.env.get("UAZAPI_TOKEN");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("VITE_GOOGLE_API_KEY") || "";

  // ── Ping ─────────────────────────────────────────────────────────────────
  if (body?.__ping) {
    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais não configuradas" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const statusRes = await fetch(`${UAZAPI_URL}/status`, {
      headers: { token: UAZAPI_TOKEN },
    }).catch(() => null);
    const statusData = statusRes ? await statusRes.json().catch(() => null) : null;
    const connected = statusData?.status?.checked_instance?.connection_status === "connected";
    return new Response(JSON.stringify({ success: true, uazapiConnected: connected, statusData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Envio de mensagem (chamado pelo painel) ───────────────────────────────
  if (body?.phone && body?.message) {
    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais não configuradas" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const digits = (body.phone as string).replace(/\D/g, "");
    const number = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
    console.log(`[send] Enviando para ${number}`);

    const uazapiRes = await fetch(`${UAZAPI_URL}/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
      body: JSON.stringify({ number, text: body.message }),
    });
    const uazapiData = await uazapiRes.json().catch(() => null);

    if (!uazapiRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `Uazapi HTTP ${uazapiRes.status}`, raw: uazapiData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      success: true,
      messageId: uazapiData?.key?.id || uazapiData?.id || uazapiData?.messageId,
      raw: uazapiData,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ── Envio de IMAGEM (chamado pelo painel) ────────────────────────────────
  if (body?.phone && body?.imageUrl) {
    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais não configuradas" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const digits = (body.phone as string).replace(/\D/g, "");
    const number = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
    console.log(`[send-image] Enviando imagem para ${number}`);

    const uazapiRes = await fetch(`${UAZAPI_URL}/send/image`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
      body: JSON.stringify({ number, imageUrl: body.imageUrl, caption: body.caption || "" }),
    });
    const uazapiData = await uazapiRes.json().catch(() => null);

    if (!uazapiRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `Uazapi HTTP ${uazapiRes.status}`, raw: uazapiData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({
      success: true,
      messageId: uazapiData?.key?.id || uazapiData?.id,
      raw: uazapiData,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ── Envio de ÁUDIO ──────────────────────────────────────────────────────
  if (body?.phone && body?.audioUrl) {
    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais não configuradas" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const digits = (body.phone as string).replace(/\D/g, "");
    const number = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
    const uazapiRes = await fetch(`${UAZAPI_URL}/send/audio`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
      body: JSON.stringify({ number, audioUrl: body.audioUrl }),
    });
    const uazapiData = await uazapiRes.json().catch(() => null);
    if (!uazapiRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `Uazapi HTTP ${uazapiRes.status}`, raw: uazapiData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, messageId: uazapiData?.key?.id || uazapiData?.id, raw: uazapiData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Envio de VÍDEO ──────────────────────────────────────────────────────
  if (body?.phone && body?.videoUrl) {
    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais não configuradas" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const digits = (body.phone as string).replace(/\D/g, "");
    const number = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
    const uazapiRes = await fetch(`${UAZAPI_URL}/send/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
      body: JSON.stringify({ number, videoUrl: body.videoUrl, caption: body.caption || "" }),
    });
    const uazapiData = await uazapiRes.json().catch(() => null);
    if (!uazapiRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `Uazapi HTTP ${uazapiRes.status}`, raw: uazapiData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, messageId: uazapiData?.key?.id || uazapiData?.id, raw: uazapiData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Envio de DOCUMENTO (PDF, etc.) ──────────────────────────────────────
  if (body?.phone && body?.documentUrl) {
    if (!UAZAPI_URL || !UAZAPI_TOKEN) {
      return new Response(JSON.stringify({ success: false, error: "Credenciais não configuradas" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const digits = (body.phone as string).replace(/\D/g, "");
    const number = digits.startsWith("55") && digits.length >= 12 ? digits : `55${digits}`;
    const uazapiRes = await fetch(`${UAZAPI_URL}/send/document`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
      body: JSON.stringify({ number, documentUrl: body.documentUrl, fileName: body.fileName || "arquivo" }),
    });
    const uazapiData = await uazapiRes.json().catch(() => null);
    if (!uazapiRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `Uazapi HTTP ${uazapiRes.status}`, raw: uazapiData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, messageId: uazapiData?.key?.id || uazapiData?.id, raw: uazapiData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── Webhook — mensagem recebida do Uazapi ─────────────────────────────────
  const msgDebug = body?.message as Record<string,unknown>;
  const msgTypeDebug = (msgDebug?.type as string) || "";
  console.log("[webhook] EventType:", body?.EventType, "| type:", msgTypeDebug, "| fromMe:", msgDebug?.fromMe, "| isGroup:", msgDebug?.isGroup);
  // Log completo pra tipos de mídia (imagem, vídeo, áudio, album)
  if (msgTypeDebug && msgTypeDebug !== "conversation" && msgTypeDebug !== "extendedTextMessage") {
    console.log("[webhook] PAYLOAD MIDIA COMPLETO:", JSON.stringify(body).slice(0, 2000));
  }

  const extracted = extractUazapiMessage(body);

  if (!extracted) {
    console.log("[webhook] Ignorado (grupo, fromMe, sem texto ou formato não reconhecido)");
    return new Response(JSON.stringify({ success: true, ignored: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let { phone, text } = extracted;

  // ── Download de mídia via POST /message/download do Uazapi ──────────────
  const fetchMediaMatch = text.match(/^\[FETCH_MEDIA(_\w+)?]:(.+)$/);
  if (fetchMediaMatch && UAZAPI_URL && UAZAPI_TOKEN) {
    const mediaHint = fetchMediaMatch[1]?.replace("_", "") || "image"; // audio, video, image
    const msgId = fetchMediaMatch[2];
    console.log(`[fetch-media] id=${msgId} hint=${mediaHint}`);
    // Fallbacks por tipo
    text = mediaHint === "audio" ? "🎤 Áudio recebido" : mediaHint === "video" ? "🎥 Vídeo recebido" : "📸 Imagem recebida";
    try {
      const dlRes = await fetch(`${UAZAPI_URL}/message/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: UAZAPI_TOKEN },
        body: JSON.stringify({ id: msgId }),
      });
      console.log(`[fetch-media] download HTTP ${dlRes.status}`);
      if (dlRes.ok) {
        const dlData = await dlRes.json().catch(() => null);
        const fileURL: string = dlData?.fileURL || "";
        const mime: string = dlData?.mimetype || (mediaHint === "audio" ? "audio/ogg" : mediaHint === "video" ? "video/mp4" : "image/jpeg");
        console.log(`[fetch-media] fileURL=${fileURL} mime=${mime}`);

        if (fileURL) {
          const mediaRes = await fetch(fileURL, { headers: { token: UAZAPI_TOKEN } });
          console.log(`[fetch-media] file fetch HTTP ${mediaRes.status}`);
          if (mediaRes.ok) {
            const buf = await mediaRes.arrayBuffer();
            const bytes = new Uint8Array(buf);
            let ext = "bin";
            let folder = "whatsapp";
            let prefix = "[IMAGE]:";
            if (mime.startsWith("audio/")) {
              ext = mime.includes("ogg") ? "ogg" : mime.includes("mpeg") ? "mp3" : "ogg";
              folder = "crm/audio";
              prefix = "[AUDIO]:";
            } else if (mime.startsWith("video/")) {
              ext = "mp4";
              folder = "crm/video";
              prefix = "[VIDEO]:";
            } else {
              ext = mime.includes("webp") ? "webp" : mime.includes("png") ? "png" : "jpg";
              folder = "whatsapp";
              prefix = "[IMAGE]:";
            }
            const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const { error: upErr } = await supabase.storage
              .from("lead-images")
              .upload(path, bytes, { contentType: mime, cacheControl: "3600", upsert: false });
            if (!upErr) {
              const { data: urlData } = supabase.storage.from("lead-images").getPublicUrl(path);
              text = `${prefix}${urlData.publicUrl}`;
              console.log(`[fetch-media] OK: ${text}`);

              // Transcrição de áudio via Gemini
              if (prefix === "[AUDIO]:" && GOOGLE_API_KEY) {
                try {
                  const b64audio = encodeBase64(bytes);
                  const geminiRes = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        contents: [{
                          parts: [
                            { text: "Transcreva este áudio em português brasileiro. Retorne APENAS a transcrição, sem comentários." },
                            { inline_data: { mime_type: mime, data: b64audio } },
                          ],
                        }],
                      }),
                    }
                  );
                  if (geminiRes.ok) {
                    const geminiData = await geminiRes.json().catch(() => null);
                    const transcript = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                    if (transcript) {
                      text = `${prefix}${urlData.publicUrl}|TRANSCRIPT:${transcript}`;
                      console.log(`[transcricao] OK: "${transcript.slice(0, 80)}"`);
                    }
                  }
                } catch (te) {
                  console.error("[transcricao] erro:", te instanceof Error ? te.message : String(te));
                }
              }
            } else {
              console.error(`[fetch-media] upload err: ${upErr.message}`);
            }
          }
        }
      }
    } catch (e) {
      console.error("[fetch-media] erro:", e instanceof Error ? e.message : String(e));
    }
  }

  // ── Processamento de mídia: content (base64) → Supabase Storage ─────────
  if (extracted.base64 && extracted.base64.length > 100) {
    const mime = extracted.mimetype || "image/jpeg";
    const b64len = extracted.base64.length;
    let diagMsg = `📸 [diag] len=${b64len} `;
    try {
      const raw = extracted.base64
        .replace(/^data:[^;]+;base64,/, "")
        .replace(/[\s\r\n]/g, "");

      diagMsg += `raw=${raw.length} `;
      const bytes = decodeBase64(raw);
      diagMsg += `bytes=${bytes.length} `;

      const ext = mime.includes("webp") ? "webp" : mime.includes("png") ? "png" : "jpg";
      const path = `whatsapp/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("lead-images")
        .upload(path, bytes, { contentType: mime, cacheControl: "3600", upsert: false });

      if (upErr) {
        diagMsg += `UPLOAD_ERR=${upErr.message}`;
        text = diagMsg;
      } else {
        const { data: urlData } = supabase.storage.from("lead-images").getPublicUrl(path);
        text = `[IMAGE]:${urlData.publicUrl}`;
      }
    } catch (e) {
      diagMsg += `EX=${e instanceof Error ? e.message : String(e)}`;
      text = diagMsg;
    }
  }

  const variations = phoneVariations(phone);
  console.log(`[webhook] Mensagem de ${phone}: "${text.slice(0, 80)}"`);


  const orFilter = variations.map((v) => `telefone.eq.${v}`).join(",");
  const { data: leads } = await supabase
    .from("leads")
    .select("id, nome, telefone")
    .or(orFilter)
    .limit(1);

  if (!leads || leads.length === 0) {
    console.log(`[webhook] Nenhum lead para ${phone}. Variações: ${variations.join(", ")}`);
    return new Response(JSON.stringify({ success: true, ignored: "noLead", phone }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const lead = leads[0];
  console.log(`[webhook] Lead encontrado: ${lead.nome} (${lead.id})`);

  const { error } = await supabase.from("lead_messages").insert({
    lead_id: lead.id,
    sender_type: "lead",
    sender_id: null,
    message: text,
    is_read: false,
  });

  if (error) {
    console.error("[webhook] Erro ao inserir:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[webhook] Salvo! Lead:", lead.nome);
  return new Response(JSON.stringify({ success: true, lead: lead.nome }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
