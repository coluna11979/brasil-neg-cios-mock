import { useState, useEffect } from "react";
import { X, Plus, GripVertical, Trash2, Loader2, Trophy, XCircle } from "lucide-react";
import { useCreatePipeline, useUpdatePipeline, type SalesPipeline } from "@/hooks/useSalesPipelines";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultType?: "vendas" | "captacao";
  /** Se passado, modo edição. Senão, modo criação. */
  pipeline?: SalesPipeline | null;
}

interface StageDraft {
  id: string | null;
  name: string;
  color: string;
  is_won: boolean;
  is_lost: boolean;
}

const TEMPLATES = {
  vendas: ["Novo", "Qualificado", "Proposta", "Negociação", "Fechado", "Perdido"],
  captacao: ["Prospecção", "Contato", "Visita", "Captado", "Perdido"],
} as const;

const COLOR_OPTIONS = ["blue", "amber", "green", "red", "violet", "slate"] as const;
const COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-500", amber: "bg-amber-500", green: "bg-green-500",
  red: "bg-red-500", violet: "bg-violet-500", slate: "bg-slate-500",
};

function buildDraftFromTemplate(t: "vendas" | "captacao"): StageDraft[] {
  return TEMPLATES[t].map((name, i, arr) => ({
    id: null,
    name,
    color: i === arr.length - 1 ? "red" : i === arr.length - 2 ? "green" : i === 0 ? "blue" : "amber",
    is_won: i === arr.length - 2,
    is_lost: i === arr.length - 1,
  }));
}

export default function PipelineFormModal({ open, onClose, defaultType = "vendas", pipeline }: Props) {
  const isEdit = !!pipeline;
  const [name, setName] = useState("");
  const [type, setType] = useState<"vendas" | "captacao">(defaultType);
  const [stages, setStages] = useState<StageDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const createMut = useCreatePipeline();
  const updateMut = useUpdatePipeline();

  useEffect(() => {
    if (!open) return;
    if (pipeline) {
      setName(pipeline.name);
      setType(pipeline.pipeline_type);
      setStages(pipeline.stages.map((s) => ({
        id: s.id, name: s.name, color: s.color || "blue",
        is_won: s.is_won, is_lost: s.is_lost,
      })));
    } else {
      setName("");
      setType(defaultType);
      setStages(buildDraftFromTemplate(defaultType));
    }
    setError(null);
  }, [open, pipeline, defaultType]);

  if (!open) return null;

  const updateStage = (i: number, patch: Partial<StageDraft>) => setStages((s) => s.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const addStage = () => setStages((s) => [...s, { id: null, name: "", color: "blue", is_won: false, is_lost: false }]);
  const removeStage = (i: number) => setStages((s) => s.filter((_, idx) => idx !== i));
  const moveStage = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= stages.length) return;
    setStages((s) => { const c = [...s]; [c[i], c[j]] = [c[j], c[i]]; return c; });
  };
  const useTemplate = (t: "vendas" | "captacao") => { setType(t); setStages(buildDraftFromTemplate(t)); };

  const toggleFlag = (i: number, flag: "is_won" | "is_lost") => {
    setStages((s) => s.map((x, idx) => {
      if (idx === i) return { ...x, [flag]: !x[flag], ...(flag === "is_won" && !x.is_won ? { is_lost: false } : {}), ...(flag === "is_lost" && !x.is_lost ? { is_won: false } : {}) };
      // Garante apenas 1 win e 1 lost por pipeline
      if (flag === "is_won" && !s[i].is_won) return { ...x, is_won: false };
      if (flag === "is_lost" && !s[i].is_lost) return { ...x, is_lost: false };
      return x;
    }));
  };

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Nome obrigatório");
    const clean = stages.filter((s) => s.name.trim());
    if (clean.length < 2) return setError("Adicione pelo menos 2 estágios");
    try {
      if (isEdit && pipeline) {
        await updateMut.mutateAsync({
          pipelineId: pipeline.id,
          nome: name.trim(),
          estagios: clean.map((s) => ({ id: s.id, name: s.name.trim(), color: s.color, is_won: s.is_won, is_lost: s.is_lost })),
        });
      } else {
        await createMut.mutateAsync({ nome: name.trim(), tipo: type, estagios: clean.map((s) => s.name.trim()) });
      }
      onClose();
    } catch (e) {
      setError((e as Error).message || "Erro");
    }
  };

  const busy = createMut.isPending || updateMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-card shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-lg font-semibold">{isEdit ? `Editar: ${pipeline?.name}` : "Novo Pipeline"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome do Pipeline</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Locação Comercial, Captação de Salões..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => useTemplate("vendas")}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${type === "vendas" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >Funil de Vendas</button>
                <button
                  onClick={() => useTemplate("captacao")}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${type === "captacao" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >Funil de Captação</button>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-muted-foreground">Estágios</label>
              <button onClick={addStage} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Plus className="h-3 w-3" /> Adicionar estágio
              </button>
            </div>
            <div className="space-y-2">
              {stages.map((s, i) => (
                <div key={s.id || `new-${i}`} className="rounded-lg border border-border bg-muted/30 p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveStage(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px] leading-none">▲</button>
                      <button onClick={() => moveStage(i, 1)} disabled={i === stages.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 text-[10px] leading-none">▼</button>
                    </div>
                    <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                    <div className={`h-3 w-3 rounded-full shrink-0 ${COLOR_CLASSES[s.color]}`} />
                    <input
                      type="text"
                      value={s.name}
                      onChange={(e) => updateStage(i, { name: e.target.value })}
                      placeholder={`Estágio ${i + 1}`}
                      className="flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <button onClick={() => removeStage(i)} className="text-red-500 hover:text-red-700" title="Remover">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2 pl-12">
                    <div className="flex items-center gap-1">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c}
                          onClick={() => updateStage(i, { color: c })}
                          className={`h-4 w-4 rounded-full transition-transform ${COLOR_CLASSES[c]} ${s.color === c ? "ring-2 ring-foreground ring-offset-1 scale-110" : "hover:scale-110"}`}
                          title={c}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleFlag(i, "is_won")}
                        className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${s.is_won ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        title="Marca este estágio como conversão (sucesso)"
                      >
                        <Trophy className="h-3 w-3" /> Sucesso
                      </button>
                      <button
                        onClick={() => toggleFlag(i, "is_lost")}
                        className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors ${s.is_lost ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                        title="Marca este estágio como perda"
                      >
                        <XCircle className="h-3 w-3" /> Perdido
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              💡 Marque o estágio final de Sucesso (Fechado, Captado, Convertido) e o de Perdido. Eles entram nas métricas de conversão.
              {isEdit && " Estágios com leads não podem ser removidos."}
            </p>
          </div>

          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancelar</button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
              : isEdit ? "Salvar Alterações" : <><Plus className="h-4 w-4" /> Criar Pipeline</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
