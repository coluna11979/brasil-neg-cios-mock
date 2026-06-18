import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type EmailFilter = "all" | "campaign" | "transactional";

export interface EmailMetrics {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface RecentSend {
  id: string;
  email: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  campaign_id: string | null;
  automation_run_id: string | null;
  campaign_name?: string | null;
  source_label: string;
  source_type: "campaign" | "transactional";
}

export interface AutomationSummary {
  id: string;
  name: string;
  description: string | null;
  trigger_event: string | null;
  is_active: boolean;
  total_sent: number;
  total_opened: number;
  openRate: number;
}

export interface TransactionalGroup {
  subject: string;
  total: number;
  opened: number;
  openRate: number;
  lastSentAt: string | null;
}

function rate(part: number, whole: number) {
  if (!whole) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function buildMetrics(rows: { status: string | null }[]): EmailMetrics {
  let sent = 0, delivered = 0, opened = 0, clicked = 0, bounced = 0, failed = 0;
  for (const r of rows) {
    const s = (r.status || "").toLowerCase();
    if (s === "failed" || s === "error") { failed++; continue; }
    sent++;
    if (s === "delivered" || s === "opened" || s === "clicked") delivered++;
    if (s === "opened" || s === "clicked") opened++;
    if (s === "clicked") clicked++;
    if (s === "bounced") bounced++;
  }
  return {
    sent, delivered, opened, clicked, bounced, failed,
    deliveryRate: rate(delivered, sent),
    openRate: rate(opened, delivered),
    clickRate: rate(clicked, opened),
    bounceRate: rate(bounced, sent),
  };
}

export function useEmailMetrics(filter: EmailFilter = "all", days = 30) {
  return useQuery({
    queryKey: ["email_metrics", filter, days],
    queryFn: async (): Promise<EmailMetrics> => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      let q = supabase
        .from("email_sends")
        .select("status, campaign_id, automation_run_id, created_at")
        .gte("created_at", since);
      if (filter === "campaign") q = q.not("campaign_id", "is", null);
      if (filter === "transactional") q = q.is("campaign_id", null);
      const { data, error } = await q;
      if (error) throw error;
      return buildMetrics(data || []);
    },
  });
}

export function useRecentSends(limit = 15) {
  return useQuery({
    queryKey: ["email_recent_sends", limit],
    queryFn: async (): Promise<RecentSend[]> => {
      const { data, error } = await supabase
        .from("email_sends")
        .select("id, email, status, sent_at, created_at, campaign_id, automation_run_id, email_campaigns(name)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map((r: any) => {
        const isCampaign = !!r.campaign_id;
        const campaignName = r.email_campaigns?.name || null;
        return {
          id: r.id,
          email: r.email,
          status: r.status,
          sent_at: r.sent_at,
          created_at: r.created_at,
          campaign_id: r.campaign_id,
          automation_run_id: r.automation_run_id,
          campaign_name: campaignName,
          source_type: isCampaign ? "campaign" : "transactional",
          source_label: isCampaign
            ? (campaignName ? `Campanha · ${campaignName}` : "Campanha")
            : "Transacional · Boas-vindas",
        } as RecentSend;
      });
    },
  });
}

export function useEmailAutomations() {
  return useQuery({
    queryKey: ["email_automations_summary"],
    queryFn: async (): Promise<AutomationSummary[]> => {
      const { data: autos, error } = await supabase
        .from("email_automations")
        .select("id, name, description, trigger_event, is_active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!autos?.length) return [];

      const ids = autos.map((a: any) => a.id);
      const { data: runs } = await supabase
        .from("email_automation_runs")
        .select("id, automation_id")
        .in("automation_id", ids);

      const runToAuto = new Map<string, string>();
      (runs || []).forEach((r: any) => runToAuto.set(r.id, r.automation_id));

      const runIds = (runs || []).map((r: any) => r.id);
      let sendsByAuto = new Map<string, { sent: number; opened: number }>();
      if (runIds.length) {
        const { data: sends } = await supabase
          .from("email_sends")
          .select("status, automation_run_id")
          .in("automation_run_id", runIds);
        (sends || []).forEach((s: any) => {
          const autoId = runToAuto.get(s.automation_run_id);
          if (!autoId) return;
          const cur = sendsByAuto.get(autoId) || { sent: 0, opened: 0 };
          const st = (s.status || "").toLowerCase();
          if (st !== "failed" && st !== "error") cur.sent++;
          if (st === "opened" || st === "clicked") cur.opened++;
          sendsByAuto.set(autoId, cur);
        });
      }

      return autos.map((a: any) => {
        const m = sendsByAuto.get(a.id) || { sent: 0, opened: 0 };
        return {
          id: a.id,
          name: a.name,
          description: a.description,
          trigger_event: a.trigger_event,
          is_active: a.is_active,
          total_sent: m.sent,
          total_opened: m.opened,
          openRate: rate(m.opened, m.sent),
        };
      });
    },
  });
}

export function useTransactionalGroups() {
  return useQuery({
    queryKey: ["email_transactional_groups"],
    queryFn: async (): Promise<TransactionalGroup[]> => {
      const { data, error } = await supabase
        .from("email_sends")
        .select("status, created_at, automation_run_id")
        .is("campaign_id", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = data || [];
      if (!rows.length) return [];
      let total = 0, opened = 0;
      let last: string | null = null;
      for (const r of rows) {
        const st = (r.status || "").toLowerCase();
        if (st !== "failed" && st !== "error") total++;
        if (st === "opened" || st === "clicked") opened++;
        if (!last || (r.created_at && r.created_at > last)) last = r.created_at;
      }
      return [{
        subject: "Boas-vindas a novos leads",
        total,
        opened,
        openRate: rate(opened, total),
        lastSentAt: last,
      }];
    },
  });
}
