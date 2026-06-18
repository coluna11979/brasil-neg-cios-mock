import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  EmailTemplate, EmailCampaign, EmailCampaignLead, EmailAudienceFilters,
} from "@/types/email.types";

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const fnHeaders = { Authorization: `Bearer ${ANON_KEY}` };

// ── Templates ────────────────────────────────────────────────

export function useEmailTemplates() {
  return useQuery({
    queryKey: ["email_templates"],
    queryFn: async (): Promise<EmailTemplate[]> => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EmailTemplate[];
    },
  });
}

export function useEmailTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["email_template", id],
    enabled: !!id,
    queryFn: async (): Promise<EmailTemplate | null> => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data as EmailTemplate) || null;
    },
  });
}

export function useSaveTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tpl: Partial<EmailTemplate> & { id?: string }) => {
      if (tpl.id) {
        const { data, error } = await supabase
          .from("email_templates")
          .update({ ...tpl, updated_at: new Date().toISOString() })
          .eq("id", tpl.id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("email_templates")
        .insert(tpl)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["email_templates"] });
      if (data?.id) qc.invalidateQueries({ queryKey: ["email_template", data.id] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_templates"] }),
  });
}

// ── Campanhas ────────────────────────────────────────────────

export function useEmailCampaigns() {
  return useQuery({
    queryKey: ["email_campaigns"],
    queryFn: async (): Promise<EmailCampaign[]> => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .eq("source_type", "campaign")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as EmailCampaign[];
    },
  });
}

export function useEmailCampaign(id: string | undefined) {
  return useQuery({
    queryKey: ["email_campaign", id],
    enabled: !!id,
    queryFn: async (): Promise<EmailCampaign | null> => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return (data as EmailCampaign) || null;
    },
  });
}

export function useCampaignLeads(campaignId: string | undefined) {
  return useQuery({
    queryKey: ["email_campaign_leads", campaignId],
    enabled: !!campaignId,
    queryFn: async (): Promise<EmailCampaignLead[]> => {
      const { data, error } = await supabase
        .from("email_campaign_leads")
        .select("*")
        .eq("campaign_id", campaignId!)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as EmailCampaignLead[];
    },
  });
}

export function useSaveCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (camp: Partial<EmailCampaign> & { id?: string }) => {
      if (camp.id) {
        const { data, error } = await supabase
          .from("email_campaigns")
          .update({ ...camp, updated_at: new Date().toISOString() })
          .eq("id", camp.id)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("email_campaigns")
        .insert(camp)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["email_campaigns"] });
      if (data?.id) qc.invalidateQueries({ queryKey: ["email_campaign", data.id] });
    },
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email_campaigns"] }),
  });
}

// ── Audiência ────────────────────────────────────────────────

export async function getAudienceCount(filters: EmailAudienceFilters): Promise<number> {
  const { data, error } = await supabase.rpc("get_email_audience_count", { p_filters: filters });
  if (error) throw error;
  return (data as number) || 0;
}

export async function populateCampaignLeads(campaignId: string): Promise<number> {
  const { data, error } = await supabase.rpc("populate_email_campaign_leads", {
    p_campaign_id: campaignId,
  });
  if (error) throw error;
  return (data as number) || 0;
}

// ── Envio (chama edge function) ──────────────────────────────

export async function sendCampaign(campaignId: string): Promise<{ recipients: number }> {
  const { data, error } = await supabase.functions.invoke("send-email-campaign", {
    body: { campaign_id: campaignId },
    headers: fnHeaders,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return { recipients: data?.recipients || 0 };
}

export async function sendTestEmail(args: {
  test_email: string;
  html: string;
  subject?: string;
  campaign_id?: string;
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke("send-email-campaign", {
    body: args,
    headers: fnHeaders,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}
