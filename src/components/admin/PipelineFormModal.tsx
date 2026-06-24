import { useState } from "react";
import { X, Plus, GripVertical, Trash2, Loader2 } from "lucide-react";
import { useCreatePipeline } from "@/hooks/useSalesPipelines";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultType?: "vendas" | "captacao";
}

const TEMPLATES = {
  vendas: ["Novo", "Qualificado", "Proposta", "Negociação", "Fechado", "Perdido"],
  captacao: ["Prospecção", "Contato", "Visita", "Captado", "Perdido"],
} as const;

export default function PipelineFormModal({ open, onClose, defaultType = "vendas" }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"vendas" | "captacao">(defaultType);
  const [stages, setStages] = useState<string[]>([...TEMPLATES[defaultType]]);
  const [error, setError] = useState<string | null>(null);
  const createMut = useCreatePipeline();

  if (!open) return null;

  const updateStage = (i: number, v: string) => setStages((s) => s.map((x, idx) => (idx === i ? v : x)));
  const addStage = () => setStages((s) => [...s, ""]);
  const removeStage = (i: number) => setStages((s) => s.filter((_, idx) => idx !== i));
  const moveStage = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= stages.length) return;
    setStages((s) => {
      const c = [...s];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  };
  const useTemplate = (t: "vendas" | "captacao") => {
    setType(t);
    setStages([...TEMPLATES[t]]);
  };

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError("Nome obrigatório");
    const clean = stages.map((s) => s.trim()).filter(Boolean);
    if (clean.length < 2) return setError("Adicione pelo menos 2 estágios");
    try {
      await createMut.mutateAsync({ nome: name.trim(), tipo: type, estagios: clean });
      setName("");
      setStages([...TEMPLATES[type]]);
      onClose();
    } catch (e) {
      setError((e as Error).message || "Erro ao criar pipeline");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-card shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-lg font-semibold">Novo Pipeline</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome do Pipeline</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vendas de Galerias, Captação de Salões..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => useTemplate("vendas")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${type === "vendas" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                Funil de Vendas
              </button>
              <button
                onClick={() => useTemplate("captacao")}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${type === "captacao" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                Funil de Captação
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-muted-foreground">Estágios do Funil</label>
              <button onClick={addStage} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Plus className="h-3 w-3" /> Adicionar
              </button>
            </div>
            <div className="space-y-1.5">
              {stages.map((s, i) => (
                <div key={i} className="flex items-center gap-2 group">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveStage(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none">▲</button>
                    <button onClick={() => moveStage(i, 1)} disabled={i === stages.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30 leading-none">▼</button>
                  </div>
                  <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                  <input
                    type="text"
                    value={s}
                    onChange={(e) => updateStage(i, e.target.value)}
                    placeholder={`Estágio ${i + 1}`}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button onClick={() => removeStage(i)} className="text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 O último estágio geralmente é "Perdido". O penúltimo, o de sucesso (Fechado, Captado, Convertido).
            </p>
          </div>

          {error && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted">Cancelar</button>
          <button
            onClick={submit}
            disabled={createMut.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {createMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando...</> : <><Plus className="h-4 w-4" /> Criar Pipeline</>}
          </button>
        </div>
      </div>
    </div>
  );
}
