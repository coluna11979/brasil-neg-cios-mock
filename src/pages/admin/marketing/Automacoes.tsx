import { Link } from "react-router-dom";
import { Zap, Plus, Loader2, ToggleLeft, ToggleRight, Trash2, Pencil } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useEmailAutomations, useDeleteAutomation, useToggleAutomation } from "@/hooks/useEmailMarketing";
import { toast } from "sonner";

const WARM = "#BAA05E";

const TRIGGER_LABELS: Record<string, string> = {
  lead_created: "Novo lead cadastrado",
  lead_status_changed: "Status do lead mudou",
  tag_added: "Tag adicionada",
  form_submitted: "Formulário preenchido",
  manual: "Disparo manual",
};

export default function Automacoes() {
  usePageTitle("Automações | Admin");
  const { data: automations = [], isLoading } = useEmailAutomations();
  const deleteMut = useDeleteAutomation();
  const toggleMut = useToggleAutomation();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Excluir automação "${name}"?`)) return;
    deleteMut.mutate(id, { onSuccess: () => toast.success("Excluída"), onError: (e) => toast.error(e.message) });
  };

  const handleToggle = (id: string, current: boolean) => {
    toggleMut.mutate({ id, is_active: !current }, {
      onSuccess: () => toast.success(!current ? "Ativada" : "Pausada"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto pb-10">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-xl font-bold">Automações</h1>
            <p className="text-[11px] text-muted-foreground">Fluxos automatizados: trigger → ações → resultado</p>
          </div>
          <Link to="/admin/marketing/automacoes/nova"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: WARM }}>
            <Plus className="h-4 w-4" /> Nova automação
          </Link>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : automations.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Zap className="h-10 w-10 mx-auto" style={{ color: WARM }} />
              <p className="text-sm text-muted-foreground">Nenhuma automação criada</p>
              <Link to="/admin/marketing/automacoes/nova"
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                <Plus className="h-4 w-4" /> Criar primeira automação
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {automations.map((a) => (
                <li key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full shrink-0" style={{ background: `${WARM}15` }}>
                    <Zap className="h-4 w-4" style={{ color: WARM }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/admin/marketing/automacoes/${a.id}`} className="font-semibold text-sm text-foreground hover:underline truncate">
                        {a.name}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${a.is_active ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
                        {a.is_active ? "Ativa" : "Pausada"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {TRIGGER_LABELS[a.trigger_event] || a.trigger_event}
                      {a.description ? ` · ${a.description}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleToggle(a.id, a.is_active)} title={a.is_active ? "Pausar" : "Ativar"}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      {a.is_active ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <Link to={`/admin/marketing/automacoes/${a.id}`}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <button onClick={() => handleDelete(a.id, a.name)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
