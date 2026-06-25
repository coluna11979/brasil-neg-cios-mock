import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  color: string;
  description: string | null;
  is_won: boolean;
  is_lost: boolean;
}

export interface SalesPipeline {
  id: string;
  name: string;
  pipeline_type: "vendas" | "captacao";
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  position: number;
  stages: PipelineStage[];
}

export function useSalesPipelines(type?: "vendas" | "captacao") {
  return useQuery({
    queryKey: ["sales_pipelines", type ?? "all"],
    queryFn: async (): Promise<SalesPipeline[]> => {
      let q = supabase
        .from("sales_pipelines")
        .select("id, name, pipeline_type, description, is_default, is_active, position, sales_pipeline_stages(id, pipeline_id, name, position, color, description, is_won, is_lost)")
        .eq("is_active", true)
        .order("position", { ascending: true });
      if (type) q = q.eq("pipeline_type", type);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        stages: (p.sales_pipeline_stages || []).sort((a: any, b: any) => a.position - b.position),
      }));
    },
    staleTime: 30_000,
  });
}

export function useCreatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { nome: string; tipo: "vendas" | "captacao"; estagios: string[] }) => {
      const { data, error } = await supabase.rpc("agent_criar_pipeline", {
        p_nome: args.nome,
        p_estagios: args.estagios,
        p_tipo: args.tipo,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales_pipelines"] }),
  });
}

export function useUpdatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { pipelineId: string; nome: string; estagios: Array<{ id: string | null; name: string; color?: string; is_won?: boolean; is_lost?: boolean }> }) => {
      const { data, error } = await supabase.rpc("agent_atualizar_pipeline", {
        p_pipeline_id: args.pipelineId,
        p_nome: args.nome,
        p_estagios: args.estagios,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales_pipelines"] }),
  });
}

export function useArchivePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; arquivar: boolean }) => {
      const { error } = await supabase.from("sales_pipelines").update({ is_active: !args.arquivar }).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales_pipelines"] }),
  });
}

export function useUpdateLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { leadId: string; stageId: string; pipelineId: string; isWon?: boolean; isLost?: boolean }) => {
      const updates: Record<string, unknown> = { stage_id: args.stageId, pipeline_id: args.pipelineId, atualizado_em: new Date().toISOString() };
      if (args.isWon) updates.status = "convertido";
      else if (args.isLost) updates.status = "perdido";
      else updates.status = "em-andamento";
      const { error } = await supabase.from("leads").update(updates).eq("id", args.leadId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useUpdateCaptacaoStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { captacaoId: string; stageId: string; pipelineId: string; isWon?: boolean; isLost?: boolean }) => {
      const updates: Record<string, unknown> = { stage_id: args.stageId, pipeline_id: args.pipelineId };
      if (args.isWon) updates.status = "captado";
      else if (args.isLost) updates.status = "perdido";
      const { error } = await supabase.from("captacoes").update(updates).eq("id", args.captacaoId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["captacoes"] }),
  });
}
