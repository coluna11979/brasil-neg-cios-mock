import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get("token");
    const tokenFromBody = req.method === "POST"
      ? (await req.json().catch(() => ({}))).token
      : null;
    const token = tokenFromQuery || tokenFromBody;
    if (!token) {
      return new Response(JSON.stringify({ error: "token missing" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: subscriber } = await supabase
      .from("email_subscribers")
      .select("id, email, lead_id")
      .eq("unsubscribe_token", token)
      .maybeSingle();

    if (!subscriber) {
      return new Response(JSON.stringify({ error: "token inválido" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    // Marca subscriber como unsubscribed
    await supabase
      .from("email_subscribers")
      .update({ status: "unsubscribed", unsubscribed_at: now })
      .eq("id", subscriber.id);

    // Marca o lead como opted-out (LGPD)
    if (subscriber.lead_id) {
      await supabase
        .from("leads")
        .update({ email_opted_out: true, atualizado_em: now })
        .eq("id", subscriber.lead_id);
    }

    // Fonte de verdade global por email
    await supabase
      .from("email_unsubscribes")
      .upsert({ email: subscriber.email, unsubscribed_at: now }, { onConflict: "email" });

    return new Response(
      JSON.stringify({ success: true, email: subscriber.email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
