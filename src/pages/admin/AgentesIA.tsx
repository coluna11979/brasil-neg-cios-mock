import { useEffect, useState } from "react";
import usePageTitle from "@/hooks/usePageTitle";
import AdminLayout from "@/components/admin/AdminLayout";
import { Sparkles, Loader2, Save, Check, RotateCcw, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { listAiPrompts, saveAiPrompt, type AiPrompt } from "@/lib/aiPrompts";

const AgentesIA = () => {
  usePageTitle("Agentes IA | Admin");

  const [prompts, setPrompts] = useState<AiPrompt[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAiPrompts().then((list) => {
      setPrompts(list);
      const map: Record<string, string> = {};
      list.forEach((p) => { map[p.key] = p.template; });
      setEdits(map);
      setLoading(false);
    });
  }, []);

  const handleSave = async (key: string) => {
    setSavingKey(key);
    const ok = await saveAiPrompt(key, edits[key] || "");
    setSavingKey(null);
    if (ok) {
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2500);
      // Atualiza local
      setPrompts((prev) => prev.map((p) => p.key === key ? { ...p, template: edits[key] } : p));
    }
  };

  const handleReset = (key: string) => {
    const original = prompts.find((p) => p.key === key);
    if (original) setEdits((prev) => ({ ...prev, [key]: original.template }));
  };

  const hasChanges = (key: string) => {
    const orig = prompts.find((p) => p.key === key);
    return orig && edits[key] !== orig.template;
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-5 pb-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
            <Sparkles className="h-5 w-5 text-violet-700" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Agentes IA</h1>
            <p className="text-sm text-muted-foreground">
              Edite os prompts usados para gerar mensagens automaticamente. As mudanças entram em vigor na hora.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <strong>Como funciona:</strong> os textos entre <code className="bg-amber-100 px-1 rounded">{`{chaves}`}</code> são variáveis preenchidas automaticamente
            (nome do lead, mensagem original, postura adequada ao tipo, etc). Não remova essas variáveis —
            elas são substituídas em tempo real.
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {prompts.map((p) => {
              const isOpen = openKey === p.key;
              const changed = hasChanges(p.key);
              return (
                <div key={p.key} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setOpenKey(isOpen ? null : p.key)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-semibold text-foreground">{p.nome}</h2>
                        <code className="text-[10px] uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{p.key}</code>
                        {changed && (
                          <span className="rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 uppercase">Editado · não salvo</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.descricao}</p>
                    </div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-border p-5 space-y-3 bg-muted/20">
                      {p.variaveis.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[10px] uppercase font-semibold text-muted-foreground mr-1">Variáveis disponíveis:</span>
                          {p.variaveis.map((v) => (
                            <code key={v} className="text-[11px] font-mono bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">{`{${v}}`}</code>
                          ))}
                        </div>
                      )}

                      <textarea
                        value={edits[p.key] || ""}
                        onChange={(e) => setEdits((prev) => ({ ...prev, [p.key]: e.target.value }))}
                        rows={Math.min(20, Math.max(8, (edits[p.key] || "").split("\n").length + 1))}
                        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-mono text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                      />

                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleReset(p.key)}
                          disabled={!changed}
                          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Desfazer
                        </button>
                        <button
                          onClick={() => handleSave(p.key)}
                          disabled={savingKey === p.key || !changed}
                          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          {savingKey === p.key ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : savedKey === p.key ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          {savedKey === p.key ? "Salvo!" : "Salvar"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AgentesIA;
