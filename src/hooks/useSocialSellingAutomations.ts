import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CadenceAction {
  type: string;
  count?: number;
}

export interface CadenceDay {
  day: number;
  label: string;
  actions: CadenceAction[];
  stage_id?: string | null;
}

export interface SocialSellingAutomation {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  is_active: boolean;
  trigger_type: string;
  trigger_config: Record<string, any>;
  cadence_config: { days: CadenceDay[]; action_modes?: Record<string, string> };
  qualification_config: { ai_prompt?: string; ai_score_min?: number };
  on_reply_config: { move_to_pipeline_id?: string; move_to_stage_id?: string; notify_whatsapp?: boolean };
  created_at: string;
  updated_at: string;
}

export const ACTION_LABELS: Record<string, string> = {
  reagir_story: "Reagir ao story",
  responder_story: "Responder ao story",
  curtir_posts: "Curtir posts",
  comentar_post: "Comentar em post",
  enviar_dm: "Enviar DM",
  verificar_resposta: "Verificar resposta",
  followup_story: "Follow-up via story",
};

export const TRIGGER_LABELS: Record<string, string> = {
  manual: "Manual",
  new_follower: "Novo seguidor",
  stage_change: "Mudança de estágio",
};

export function useSocialSellingAutomations() {
  return useQuery({
    queryKey: ["social-selling-automations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_selling_automations")
        .select("*")
        .order("created_at");
      if (error) throw error;
      return (data || []) as SocialSellingAutomation[];
    },
  });
}

export function useSaveAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (automation: Partial<SocialSellingAutomation> & { id?: string }) => {
      const { id, ...payload } = automation;
      if (id) {
        const { data, error } = await supabase
          .from("social_selling_automations")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("social_selling_automations")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-selling-automations"] });
    },
  });
}

export function useDeleteAutomation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("social_selling_automations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social-selling-automations"] });
    },
  });
}
