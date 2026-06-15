// supabase/functions/foto-inteligente/index.ts
//
// Tool chamada pela Rita (e qualquer agente) pra:
//   1. Baixar uma foto recebida no WhatsApp (URL do UAZAPI ou base64)
//   2. Aprimorar de forma DETERMINÍSTICA (brilho/contraste/nitidez/redim.)
//      → sem AI → impossível inventar conteúdo do imóvel
//   3. Subir no bucket `lead-images` no path-padrão do projeto
//   4. Anexar a URL no `negocios.imagem` (capa) e `negocios.imagens` (array)
//   5. Devolver a URL pública pra Rita responder o usuário
//
// Deploy:
//   supabase functions deploy foto-inteligente --no-verify-jwt
//   (sem JWT pq é chamada de webhook/agente com SERVICE_ROLE_KEY no header)
//
// Variáveis de ambiente (Supabase Dashboard → Edge Functions → secrets):
//   SUPABASE_URL                — automático
//   SUPABASE_SERVICE_ROLE_KEY   — automático
//
// Não precisa de Gemini pra esta versão: enhancement é puro pixel-math.

// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ToolInput {
  negocio_id: string;                       // UUID do negócio em `negocios`
  image_url?: string;                       // URL pra baixar (UAZAPI)
  image_base64?: string;                    // ou base64 puro (sem data: prefix)
  make_capa?: boolean;                      // se true, vira a capa (default true)
  enhancement?: "auto" | "interior" | "fachada" | "off";
}

interface ToolOutput {
  ok: boolean;
  url?: string;
  path?: string;
  attached_to?: string;
  total_imagens?: number;
  error?: string;
}

// ─── Enhancement profiles (pixel-math deterministic) ────────────────────────
const PROFILES = {
  // Pra interior (geralmente escuro, precisa de mais luz)
  interior: { brightness: 18, contrast: 12, saturation: 6, sharpen: 0.4 },
  // Pra fachada (luz natural OK, só polir)
  fachada:  { brightness: 6,  contrast: 14, saturation: 8, sharpen: 0.35 },
  // Default: meio termo
  auto:     { brightness: 10, contrast: 12, saturation: 6, sharpen: 0.35 },
};

const MAX_W = 1920;
const MAX_H = 1920;

async function fetchImageBytes(input: ToolInput): Promise<Uint8Array> {
  if (input.image_base64) {
    const clean = input.image_base64.replace(/^data:image\/\w+;base64,/, "");
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  if (!input.image_url) throw new Error("missing image_url ou image_base64");
  const r = await fetch(input.image_url);
  if (!r.ok) throw new Error(`fetch image failed: HTTP ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

function enhance(img: Image, profile: keyof typeof PROFILES): Image {
  const p = PROFILES[profile === "off" as any ? "auto" : profile];
  // brightness (-100..100), contrast (-100..100), saturation (-100..100)
  // imagescript usa fatores diferentes — mapeamos pra suas APIs
  if (p.brightness !== 0) img.brightness(p.brightness / 100); // -1..1
  if (p.contrast !== 0)   img.contrast(p.contrast / 100);
  if (p.saturation !== 0) img.saturation(p.saturation / 100);
  // Sharpen via convolução leve (imagescript não tem unsharp built-in; pulamos
  // pra não complicar — a maioria das fotos de imóvel não precisa de sharpen
  // pesado e adicionar pode criar artefato)
  return img;
}

function resizeIfNeeded(img: Image): Image {
  if (img.width <= MAX_W && img.height <= MAX_H) return img;
  const ratio = Math.min(MAX_W / img.width, MAX_H / img.height);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);
  img.resize(w, h);
  return img;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const input = await req.json() as ToolInput;
    if (!input.negocio_id) throw new Error("missing negocio_id");

    // 1. Confirma que o negocio existe (e pega imagens atuais)
    const { data: negocio, error: negErr } = await supabase
      .from("negocios")
      .select("id, imagem, imagens")
      .eq("id", input.negocio_id)
      .single();
    if (negErr || !negocio) throw new Error(`negocio ${input.negocio_id} não encontrado`);

    // 2. Baixa a foto original
    const originalBytes = await fetchImageBytes(input);

    // 3. Decodifica + aprimora (deterministic) + redimensiona
    let img = await Image.decode(originalBytes);
    if (input.enhancement !== "off") {
      img = enhance(img, input.enhancement || "auto");
    }
    img = resizeIfNeeded(img);

    // 4. Encode JPEG quality 88 (bom equilíbrio peso/qualidade)
    const enhancedBytes = await img.encodeJPEG(88);

    // 5. Upload no bucket `lead-images` seguindo a convenção do projeto:
    //    negocios/{id}-{i}-{timestamp}.jpg
    const existentes = Array.isArray(negocio.imagens) ? negocio.imagens : [];
    const proximoIdx = existentes.length; // novas vão pro final
    const path = `negocios/${input.negocio_id}-${proximoIdx}-${Date.now()}.jpg`;

    const { error: upErr } = await supabase.storage
      .from("lead-images")
      .upload(path, enhancedBytes, {
        contentType: "image/jpeg",
        upsert: false,
        cacheControl: "3600",
      });
    if (upErr) throw new Error(`storage upload falhou: ${upErr.message}`);

    const { data: urlData } = supabase.storage.from("lead-images").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // 6. Anexa no banco
    const novasImagens = [...existentes, publicUrl];
    const makeCapa = input.make_capa !== false; // default true
    const novaCapa = makeCapa
      ? (existentes.length === 0 ? publicUrl : negocio.imagem) // primeira sempre vira capa; depois só se pedir
      : negocio.imagem;
    //   regra: se já tem capa e o caller não pediu pra trocar (make_capa=true mas
    //   negocio.imagem já existe), mantemos a capa atual. Pra trocar capa de
    //   propósito, o agente deve usar uma tool separada.

    const { error: updErr } = await supabase
      .from("negocios")
      .update({ imagem: novaCapa, imagens: novasImagens })
      .eq("id", input.negocio_id);
    if (updErr) throw new Error(`update negocios falhou: ${updErr.message}`);

    const out: ToolOutput = {
      ok: true,
      url: publicUrl,
      path,
      attached_to: input.negocio_id,
      total_imagens: novasImagens.length,
    };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    const out: ToolOutput = { ok: false, error: String(e?.message ?? e) };
    return new Response(JSON.stringify(out), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
