import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Plus, Trash2, Edit2, ArrowLeft, Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useEmailTemplates, useDeleteTemplate } from "@/hooks/useEmailMarketing";
import { toast } from "sonner";

export default function MarketingTemplates() {
  usePageTitle("Templates de Email | Admin");
  const { data: templates = [], isLoading } = useEmailTemplates();
  const del = useDeleteTemplate();
  const [confirming, setConfirming] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      toast.success("Template deletado");
      setConfirming(null);
    } catch (e: any) {
      toast.error(e.message || "Erro deletando");
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/admin/marketing" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Templates de Email</h1>
              <p className="text-sm text-muted-foreground">Modelos HTML reutilizáveis em campanhas</p>
            </div>
          </div>
          <Link
            to="/admin/marketing/templates/novo"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Novo template
          </Link>
        </div>

        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="px-5 py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : templates.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="font-medium text-foreground mb-1">Nenhum template ainda</h3>
              <p className="text-sm text-muted-foreground mb-5">Crie templates HTML pra reutilizar em várias campanhas</p>
              <Link
                to="/admin/marketing/templates/novo"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Criar primeiro template
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-4 hover:bg-muted/40">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.subject || "(sem assunto)"}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Categoria: {t.category || "—"} · Atualizado em {new Date(t.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/admin/marketing/templates/${t.id}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Link>
                    {confirming === t.id ? (
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={del.isPending}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {del.isPending ? "Deletando..." : "Confirmar"}
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirming(t.id)}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-600"
                        aria-label="Deletar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
