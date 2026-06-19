import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function substituteVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { campaign_id, test_phone } = await req.json();

    const { data: cfg } = await supabase
      .from("integration_settings")
      .select("uazapi_url, uazapi_token")
      .eq("id", 1)
      .maybeSingle();

    if (!cfg?.uazapi_url || !cfg?.uazapi_token) {
      throw new Error("UAZapi não configurado em Integrações");
    }

    const sendWpp = async (number: string, text: string) => {
      const r = await fetch(`${cfg.uazapi_url}/send/text`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: cfg.uazapi_token },
        body: JSON.stringify({ number, text }),
      });
      if (!r.ok) throw new Error(`UAZapi ${r.status}: ${await r.text()}`);
      return r;
    };

    if (!campaign_id && test_phone) {
      await sendWpp(test_phone, "✅ Teste de conexão WhatsApp — NegociaAky");
      return new Response(JSON.stringify({ success: true, test: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!campaign_id) throw new Error("campaign_id é obrigatório");

    const { data: campaign, error: cErr } = await supabase
      .from("whatsapp_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (cErr || !campaign) throw new Error("Campanha não encontrada");

    if (campaign.status === "completed" || campaign.status === "cancelled") {
      return new Response(JSON.stringify({ error: `Campanha já ${campaign.status}` }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (test_phone) {
      const vars = { nome: "Teste", primeiro_nome: "Teste", telefone: test_phone };
      await sendWpp(test_phone, substituteVars(campaign.message, vars));
      return new Response(JSON.stringify({ success: true, test: true, sent_to: test_phone }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count } = await supabase
      .from("whatsapp_campaign_leads")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("status", "pending");
    if (!count || count === 0) {
      await supabase.rpc("populate_whatsapp_campaign_leads", { p_campaign_id: campaign_id });
    }

    const { data: leads } = await supabase
      .from("whatsapp_campaign_leads")
      .select("id, phone, nome")
      .eq("campaign_id", campaign_id)
      .eq("status", "pending")
      .limit(10000);

    if (!leads || leads.length === 0) throw new Error("Nenhum destinatário pendente.");

    await supabase.from("whatsapp_campaigns").update({
      status: "sending",
      started_at: new Date().toISOString(),
      total_recipients: leads.length,
      updated_at: new Date().toISOString(),
    }).eq("id", campaign_id);

    let sent = 0, failed = 0;

    const bgTask = (async () => {
      for (const lead of leads) {
        try {
          const vars = {
            nome: lead.nome || "",
            primeiro_nome: lead.nome?.split(" ")[0] || "",
            telefone: lead.phone || "",
          };
          await sendWpp(lead.phone, substituteVars(campaign.message, vars));
          await supabase.from("whatsapp_campaign_leads")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", lead.id);
          sent++;
        } catch (e: any) {
          await supabase.from("whatsapp_campaign_leads")
            .update({ status: "failed", error_message: String(e.message).slice(0, 300) })
            .eq("id", lead.id);
          failed++;
          console.error(`Erro ${lead.phone}:`, e.message);
        }
        await new Promise((r) => setTimeout(r, 1200)); // ~50 msg/min
      }

      await supabase.from("whatsapp_campaigns").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        total_sent: sent,
        total_failed: failed,
        updated_at: new Date().toISOString(),
      }).eq("id", campaign_id);

      console.log(`WA campaign ${campaign_id}: ${sent} sent / ${failed} failed`);
    })();

    // @ts-ignore
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(bgTask);

    return new Response(
      JSON.stringify({ success: true, message: "Campanha WhatsApp em envio", recipients: leads.length }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
