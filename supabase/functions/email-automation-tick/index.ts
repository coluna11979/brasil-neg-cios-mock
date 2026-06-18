import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Render simples JSON Maily → HTML (fallback; UI já gera html_content)
function renderJsonToHtml(node: any): string {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(renderJsonToHtml).join("");
  if (typeof node === "string") return node;
  const type = node.type;
  const text = node.text;
  const content = node.content;
  const attrs = node.attrs || {};

  if (type === "text") {
    let result = (text || "").replace(/[&<>]/g, (c: string) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as any)[c]);
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === "bold") result = `<strong>${result}</strong>`;
        if (mark.type === "italic") result = `<em>${result}</em>`;
        if (mark.type === "underline") result = `<u>${result}</u>`;
        if (mark.type === "link") result = `<a href="${mark.attrs?.href || '#'}">${result}</a>`;
      }
    }
    return result;
  }
  const inner = renderJsonToHtml(content);
  switch (type) {
    case "doc": return `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;">${inner}</body></html>`;
    case "paragraph": return `<p>${inner}</p>`;
    case "heading": return `<h${attrs.level || 1}>${inner}</h${attrs.level || 1}>`;
    case "bulletList": return `<ul>${inner}</ul>`;
    case "orderedList": return `<ol>${inner}</ol>`;
    case "listItem": return `<li>${inner}</li>`;
    case "horizontalRule": return `<hr/>`;
    case "image": return `<img src="${attrs.src || ''}" alt="${attrs.alt || ''}" style="max-width:100%;"/>`;
    case "spacer": return `<div style="height:${attrs.height || 16}px;"></div>`;
    case "variable": return `{{${attrs.id || attrs.name || ''}}}`;
    default: return inner;
  }
}

interface FlowNode { id: string; type: string; data: any; }
interface FlowEdge { source: string; target: string; sourceHandle?: string; }

function getNextNode(flow: any, fromNodeId: string, branch?: "yes" | "no"): FlowNode | null {
  const edges: FlowEdge[] = flow.edges || [];
  const nodes: FlowNode[] = flow.nodes || [];
  const candidates = edges.filter((e) => e.source === fromNodeId);
  let match: FlowEdge | undefined;
  if (branch) match = candidates.find((e) => e.sourceHandle === branch);
  if (!match) match = candidates[0];
  if (!match) return null;
  return nodes.find((n) => n.id === match.target) || null;
}

function calculateWaitDate(duration: number, unit: string): Date {
  const date = new Date();
  if (unit === "minutos") date.setMinutes(date.getMinutes() + duration);
  else if (unit === "horas") date.setHours(date.getHours() + duration);
  else date.setDate(date.getDate() + duration);
  return date;
}

async function evaluateBranch(supabase: any, leadId: string, condition: any): Promise<boolean> {
  const field = condition.condition_field;
  const op = condition.condition_op || "=";
  const value = condition.condition_value;
  if (!field) return true;

  let currentValue: any = null;
  if (field === "email_opened" || field === "email_clicked") {
    const { count } = await supabase
      .from("email_sends")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", leadId)
      .not(field === "email_opened" ? "opened_at" : "clicked_at", "is", null);
    currentValue = (count || 0) > 0;
  } else if (field === "has_tag") {
    const { data: lead } = await supabase.from("leads").select("tags").eq("id", leadId).single();
    currentValue = (lead?.tags || []).includes(value);
    return op === "=" ? currentValue : !currentValue;
  } else {
    const { data: lead } = await supabase.from("leads").select(field).eq("id", leadId).single();
    currentValue = lead?.[field];
  }

  switch (op) {
    case "=":  return String(currentValue) === String(value);
    case "!=": return String(currentValue) !== String(value);
    case ">":  return Number(currentValue) > Number(value);
    case "<":  return Number(currentValue) < Number(value);
    default:   return false;
  }
}

async function executeNode(
  supabase: any,
  run: any,
  node: FlowNode,
): Promise<{ done: boolean; nextNodeId?: string; nextAt?: Date; status?: string }> {
  const leadId = run.lead_id;

  switch (node.type) {
    case "trigger": {
      const next = getNextNode(run.flow, node.id);
      return { done: false, nextNodeId: next?.id, nextAt: new Date() };
    }

    case "wait": {
      const duration = node.data.duration || 1;
      const unit = node.data.unit || "dias";
      const next = getNextNode(run.flow, node.id);
      if (!next) return { done: true, status: "completed" };
      return { done: false, nextNodeId: next.id, nextAt: calculateWaitDate(duration, unit) };
    }

    case "sendEmail": {
      const templateId = node.data.template_id;
      if (!templateId) {
        const next = getNextNode(run.flow, node.id);
        return { done: false, nextNodeId: next?.id, nextAt: new Date() };
      }

      const { data: template } = await supabase
        .from("email_templates")
        .select("id, name, subject, html_content, content_json")
        .eq("id", templateId)
        .single();
      if (!template) {
        const next = getNextNode(run.flow, node.id);
        return { done: false, nextNodeId: next?.id, nextAt: new Date() };
      }

      const { data: lead } = await supabase
        .from("leads")
        .select("id, nome, email")
        .eq("id", leadId)
        .single();
      if (!lead?.email) {
        const next = getNextNode(run.flow, node.id);
        return { done: false, nextNodeId: next?.id, nextAt: new Date() };
      }

      const html = template.html_content || renderJsonToHtml(template.content_json);

      const { data: tempCampaign, error: campErr } = await supabase
        .from("email_campaigns")
        .insert({
          name: `[Auto] ${template.name}`,
          subject: node.data.subject || template.subject || "(sem assunto)",
          template_id: templateId,
          html_content: html,
          status: "draft",
          source_type: "automation",
          automation_id: run.automation_id,
          audience_filters: { lead_ids: [leadId], automation_run_id: run.id },
        })
        .select("id")
        .single();

      if (campErr || !tempCampaign) {
        console.error("insert email_campaigns falhou:", campErr);
        const next = getNextNode(run.flow, node.id);
        return { done: false, nextNodeId: next?.id, nextAt: new Date() };
      }

      // Popula recipient único antes de chamar send
      await supabase.rpc("populate_email_campaign_leads", { p_campaign_id: tempCampaign.id });

      const fnRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email-campaign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ campaign_id: tempCampaign.id, html }),
      });
      if (!fnRes.ok) console.error("send-email-campaign failed:", await fnRes.text());

      const next = getNextNode(run.flow, node.id);
      return { done: false, nextNodeId: next?.id, nextAt: new Date() };
    }

    case "updateField": {
      const field = node.data.field;
      const value = node.data.value;
      if (field && value !== undefined) {
        await supabase.from("leads").update({ [field]: value }).eq("id", leadId);
      }
      const next = getNextNode(run.flow, node.id);
      return { done: false, nextNodeId: next?.id, nextAt: new Date() };
    }

    case "addTag": {
      const tag = node.data.tag;
      if (tag) {
        const { data: lead } = await supabase.from("leads").select("tags").eq("id", leadId).single();
        const current = (lead?.tags || []) as string[];
        if (!current.includes(tag)) {
          await supabase.from("leads").update({ tags: [...current, tag] }).eq("id", leadId);
        }
      }
      const next = getNextNode(run.flow, node.id);
      return { done: false, nextNodeId: next?.id, nextAt: new Date() };
    }

    case "branch": {
      const result = await evaluateBranch(supabase, leadId, node.data);
      const handle = result ? "yes" : "no";
      const next = getNextNode(run.flow, node.id, handle);
      if (!next) return { done: true, status: "completed" };
      return { done: false, nextNodeId: next.id, nextAt: new Date() };
    }

    case "sendWhatsapp": {
      // Reusa integration_settings (uazapi_url + uazapi_token) — não cria whatsapp_instances novo
      const message = node.data.message || "";
      if (message) {
        const { data: lead } = await supabase
          .from("leads")
          .select("telefone, nome")
          .eq("id", leadId)
          .single();
        if (lead?.telefone) {
          const text = message
            .replace(/\{\{nome\}\}/g, lead.nome || "")
            .replace(/\{\{primeiro_nome\}\}/g, lead.nome?.split(" ")[0] || "");

          const { data: cfg } = await supabase
            .from("integration_settings")
            .select("uazapi_url, uazapi_token")
            .eq("id", 1)
            .maybeSingle();

          if (cfg?.uazapi_url && cfg?.uazapi_token) {
            try {
              await fetch(`${cfg.uazapi_url}/send/text`, {
                method: "POST",
                headers: { "Content-Type": "application/json", token: cfg.uazapi_token },
                body: JSON.stringify({ number: lead.telefone, text }),
              });
            } catch (e) {
              console.error("Erro WhatsApp:", e);
            }
          }
        }
      }
      const next = getNextNode(run.flow, node.id);
      return { done: false, nextNodeId: next?.id, nextAt: new Date() };
    }

    case "end":
      return { done: true, status: "completed" };

    default: {
      const next = getNextNode(run.flow, node.id);
      return { done: false, nextNodeId: next?.id, nextAt: new Date() };
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: runs } = await supabase
      .from("email_automation_runs")
      .select("id, automation_id, lead_id, current_node_id, scheduled_next_at, status, context, automation:email_automations(flow_json, is_active)")
      .eq("status", "active")
      .lte("scheduled_next_at", new Date().toISOString())
      .limit(50);

    if (!runs || runs.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let completed = 0;

    for (const run of runs) {
      const flow = (run as any).automation?.flow_json;
      const isActive = (run as any).automation?.is_active;
      if (!flow || !isActive) {
        await supabase
          .from("email_automation_runs")
          .update({ status: "cancelled", completed_at: new Date().toISOString() })
          .eq("id", run.id);
        continue;
      }

      const nodes: FlowNode[] = flow.nodes || [];
      const node = nodes.find((n) => n.id === run.current_node_id);
      if (!node) {
        await supabase
          .from("email_automation_runs")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", run.id);
        continue;
      }

      try {
        const result = await executeNode(supabase, { ...run, flow }, node);
        if (result.done) {
          await supabase
            .from("email_automation_runs")
            .update({
              status: result.status || "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", run.id);
          completed++;
        } else if (result.nextNodeId) {
          await supabase
            .from("email_automation_runs")
            .update({
              current_node_id: result.nextNodeId,
              scheduled_next_at: (result.nextAt || new Date()).toISOString(),
            })
            .eq("id", run.id);
        } else {
          await supabase
            .from("email_automation_runs")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", run.id);
          completed++;
        }
        processed++;
      } catch (err: any) {
        console.error(`Erro run ${run.id}:`, err);
        await supabase
          .from("email_automation_runs")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", run.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed, completed, total: runs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
