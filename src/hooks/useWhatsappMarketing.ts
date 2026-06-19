import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export interface WhatsappCampaign {
  id: string;
  name: string;
  message: string;
  audience_filters: Record<string, any>;
  status: "draft" | "sending" | "completed" | "cancelled" | "failed";
  total_recipients: number;
  total_sent: number;
  total_failed: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsappCampaignLead {
  id: string;
  campaign_id: string;
  lead_id: string | null;
  phone: string;
  nome: string | null;
  status: "pending" | "sent" | "failed";
  sent_at: string | null;
  error_message: string | null;
}

export function useWhatsappCampaigns() {
  return useQuery({
    queryKey: ["whatsapp-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as WhatsappCampaign[];
    },
  });
}

export function useWhatsappCampaign(id?: string) {
  return useQuery({
    queryKey: ["whatsapp-campaign", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_campaigns")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as WhatsappCampaign;
    },
  });
}

export function useWhatsappCampaignLeads(campaignId?: string) {
  return useQuery({
    queryKey: ["whatsapp-campaign-leads", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_campaign_leads")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as WhatsappCampaignLead[];
    },
  });
}

export function useSaveWhatsappCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<WhatsappCampaign>) => {
      if (data.id) {
        const { id, ...rest } = data;
        const { data: updated, error } = await supabase
          .from("whatsapp_campaigns")
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return updated;
      }
      const { data: created, error } = await supabase
        .from("whatsapp_campaigns")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-campaigns"] }),
  });
}

export function useDeleteWhatsappCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-campaigns"] }),
  });
}

export async function populateWhatsappLeads(campaignId: string): Promise<number> {
  const { data, error } = await supabase.rpc("populate_whatsapp_campaign_leads", {
    p_campaign_id: campaignId,
  });
  if (error) throw error;
  return data as number;
}

export async function getWhatsappAudienceCount(filters: Record<string, any>): Promise<number> {
  const { data, error } = await supabase.rpc("get_whatsapp_audience_count", {
    p_filters: filters,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}

async function callEdge(body: Record<string, any>) {
  const res = await fetch(`${FUNCTIONS_URL}/send-whatsapp-campaign`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Erro na requisição");
  return json;
}

export async function sendWhatsappCampaign(campaignId: string) {
  return callEdge({ campaign_id: campaignId });
}

export async function sendWhatsappTest(phone: string, campaignId?: string) {
  return callEdge({ campaign_id: campaignId, test_phone: phone });
}
