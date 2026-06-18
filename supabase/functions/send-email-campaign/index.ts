import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getEmailConfig, requireActiveConfig, type EmailConfig } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface SendBody {
  campaign_id?: string;
  test_email?: string;
  html?: string;
  subject?: string;
}

interface Recipient {
  lead_id: string | null;
  email: string;
  nome: string | null;
  primeiro_nome: string | null;
  telefone: string | null;
}

async function getOrCreateUnsubscribeToken(
  supabase: any,
  email: string,
  leadId: string | null,
): Promise<string | null> {
  try {
    const { data: existing } = await supabase
      .from("email_subscribers")
      .select("unsubscribe_token, status")
      .eq("email", email)
      .maybeSingle();

    if (existing?.unsubscribe_token) {
      return existing.status === "unsubscribed" || existing.status === "complained"
        ? null
        : existing.unsubscribe_token;
    }

    const { data: created } = await supabase
      .from("email_subscribers")
      .insert({
        email,
        lead_id: leadId,
        status: "subscribed",
        consent_source: "campaign_send",
        consent_at: new Date().toISOString(),
      })
      .select("unsubscribe_token")
      .single();

    return created?.unsubscribe_token || null;
  } catch (e) {
    console.error("Erro gerando unsubscribe token:", e);
    return null;
  }
}

function injectComplianceFooter(html: string, unsubscribeUrl: string, config: EmailConfig): string {
  const address = config.company_address || config.company_name || "";
  const replyEmail = config.reply_to || config.from_email || "";
  const footer = `
<table role="presentation" width="100%" style="margin-top:32px;border-top:1px solid #e5e5e5;padding:24px 0;">
  <tr>
    <td style="text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;color:#999;line-height:1.6;">
      ${address ? `<p style="margin:0 0 8px;">${address}</p>` : ""}
      <p style="margin:0;">
        <a href="${unsubscribeUrl}" style="color:#999;text-decoration:underline;">Descadastrar</a>
        ${replyEmail ? `&middot; <a href="mailto:${replyEmail}" style="color:#999;text-decoration:underline;">Contato</a>` : ""}
      </p>
    </td>
  </tr>
</table>`;
  if (html.includes("</body>")) return html.replace("</body>", `${footer}</body>`);
  return html + footer;
}

function substituteVariables(text: string, vars: Record<string, string>): string {
  if (!text) return text;
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body: SendBody = await req.json();
    const { campaign_id, test_email } = body;

    const cfgRaw = await getEmailConfig(supabase);
    const config = requireActiveConfig(cfgRaw);

    const fromEmail = (config.from_email || "").trim();
    const fromName = (config.from_name || "NegociaAky").trim();
    const replyTo = config.reply_to || undefined;
    const appUrl = config.app_url || "";

    // === MODO TESTE (sem campaign_id) ===
    if (!campaign_id && test_email && body.html) {
      const variables: Record<string, string> = {
        nome: "Teste",
        primeiro_nome: "Teste",
        empresa: config.company_name || "Empresa",
        email: test_email,
        telefone: "(11) 99999-9999",
        unsubscribe_url: `${appUrl}/unsubscribe?token=teste`,
        link_descadastro: `${appUrl}/unsubscribe?token=teste`,
      };
      const html = substituteVariables(body.html, variables);
      const subject = `[TESTE] ${substituteVariables(body.subject || "Teste de template", variables)}`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.resend_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: [test_email],
          subject,
          html,
          reply_to: replyTo,
        }),
      });
      if (!res.ok) throw new Error(`Resend: ${await res.text()}`);
      return new Response(
        JSON.stringify({ success: true, test: true, sent_to: test_email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!campaign_id) throw new Error("campaign_id é obrigatório");

    const { data: campaign, error: cErr } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (cErr || !campaign) throw new Error("Campanha não encontrada");

    const campFromEmail = (campaign.from_email || fromEmail).trim();
    const campFromName = (campaign.from_name || fromName).trim();
    const campReplyTo = campaign.reply_to || replyTo;

    // === TESTE com campaign_id ===
    if (test_email) {
      const variables: Record<string, string> = {
        nome: "Teste",
        primeiro_nome: "Teste",
        empresa: config.company_name || "Empresa",
        email: test_email,
        telefone: "(11) 99999-9999",
        unsubscribe_url: `${appUrl}/unsubscribe?token=teste`,
      };
      const baseHtml = body.html || campaign.html_content || `<p>${campaign.subject}</p>`;
      const html = substituteVariables(baseHtml, variables);
      const subject = `[TESTE] ${substituteVariables(campaign.subject, variables)}`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${config.resend_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${campFromName} <${campFromEmail}>`,
          to: [test_email],
          subject,
          html,
          reply_to: campReplyTo,
        }),
      });
      if (!res.ok) throw new Error(`Resend: ${await res.text()}`);
      return new Response(
        JSON.stringify({ success: true, test: true, sent_to: test_email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (campaign.status === "completed" || campaign.status === "cancelled") {
      return new Response(
        JSON.stringify({ error: `Campanha já está ${campaign.status}` }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Garante que email_campaign_leads está populado
    const { data: existingLeads } = await supabase
      .from("email_campaign_leads")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id);
    if (!existingLeads || (existingLeads as any).length === 0) {
      await supabase.rpc("populate_email_campaign_leads", { p_campaign_id: campaign_id });
    }

    // Carrega destinatários pendentes (com dados do lead)
    const { data: ecls } = await supabase
      .from("email_campaign_leads")
      .select("lead_id, email, lead:leads(id, nome, telefone)")
      .eq("campaign_id", campaign_id)
      .eq("status", "pending")
      .limit(10000);

    const audience: Recipient[] = (ecls || []).map((r: any) => ({
      lead_id: r.lead_id,
      email: r.email,
      nome: r.lead?.nome || null,
      primeiro_nome: r.lead?.nome ? r.lead.nome.split(" ")[0] : null,
      telefone: r.lead?.telefone || null,
    }));

    if (audience.length === 0) {
      await supabase
        .from("email_campaigns")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", campaign_id);
      throw new Error("Nenhum destinatário pendente. Rode populate_email_campaign_leads primeiro.");
    }

    await supabase
      .from("email_campaigns")
      .update({
        status: "sending",
        started_at: new Date().toISOString(),
        total_recipients: audience.length,
        total_leads: audience.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaign_id);

    const from = `${campFromName} <${campFromEmail}>`;
    let sent = 0;
    let failed = 0;

    const bgTask = (async () => {
      for (const recipient of audience) {
        try {
          const token = await getOrCreateUnsubscribeToken(supabase, recipient.email, recipient.lead_id);
          if (!token) {
            console.log(`Skip ${recipient.email} (unsubscribed/complained)`);
            continue;
          }

          const unsubscribeUrl = `${appUrl}/unsubscribe?token=${token}`;
          const variables: Record<string, string> = {
            nome: recipient.nome || "",
            primeiro_nome: recipient.primeiro_nome || "",
            email: recipient.email,
            empresa: config.company_name || "",
            telefone: recipient.telefone || "",
            unsubscribe_url: unsubscribeUrl,
            link_descadastro: unsubscribeUrl,
          };

          const baseHtml = body.html || campaign.html_content || `<p>${campaign.subject}</p>`;
          let html = substituteVariables(baseHtml, variables);
          html = injectComplianceFooter(html, unsubscribeUrl, config);
          const subject = substituteVariables(campaign.subject, variables);

          const { data: sendRow } = await supabase
            .from("email_sends")
            .insert({
              campaign_id,
              lead_id: recipient.lead_id,
              email: recipient.email,
              status: "pending",
              html,
            })
            .select("id")
            .single();

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${config.resend_api_key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from,
              to: [recipient.email],
              subject,
              html,
              reply_to: campReplyTo,
              headers: {
                "X-Campaign-ID": campaign_id,
                "X-Send-ID": sendRow?.id || "",
                "List-Unsubscribe": `<${unsubscribeUrl}>`,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const nowIso = new Date().toISOString();
            await supabase
              .from("email_sends")
              .update({ status: "sent", sent_at: nowIso, resend_id: data.id })
              .eq("id", sendRow!.id);
            await supabase
              .from("email_campaign_leads")
              .update({ status: "sent", sent_at: nowIso, resend_id: data.id })
              .eq("campaign_id", campaign_id)
              .eq("email", recipient.email);
            sent++;
          } else {
            const errText = await res.text();
            await supabase
              .from("email_sends")
              .update({ status: "failed", error_message: errText.slice(0, 500) })
              .eq("id", sendRow!.id);
            await supabase
              .from("email_campaign_leads")
              .update({ status: "failed", error_message: errText.slice(0, 500) })
              .eq("campaign_id", campaign_id)
              .eq("email", recipient.email);
            failed++;
          }
        } catch (err) {
          console.error(`Erro enviando pra ${recipient.email}:`, err);
          failed++;
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      await supabase
        .from("email_campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          sent_count: sent,
          failed_count: failed,
          total_sent: sent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign_id);

      console.log(`Campaign ${campaign_id} done: ${sent} sent, ${failed} failed`);
    })();

    // @ts-ignore EdgeRuntime global
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(bgTask);

    return new Response(
      JSON.stringify({ success: true, message: "Campanha em envio", recipients: audience.length }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
