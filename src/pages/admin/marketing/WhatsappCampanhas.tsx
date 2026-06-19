import { Link } from "react-router-dom";
import { Plus, MessageSquare, Loader2, Trash2, Send, Users } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useWhatsappCampaigns, useDeleteWhatsappCampaign } from "@/hooks/useWhatsappMarketing";
import { WaSubNav } from "./WhatsappDashboard";
import { toast } from "sonner";

export default function WhatsappCampanhas() {
  usePageTitle("WhatsApp Campanhas | Admin");
  const { data: campaigns = [], isLoading } = useWhatsappCampaigns();
  const del = useDeleteWhatsappCampaign();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir campanha "${name}"?`)) return;
    try {
      await del.mutateAsync(id);
      toast.success("Campanha excluída");
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-5 pb-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Campanhas WhatsApp</h1>
              <p className="text-sm text-muted-foreground">Disparos em massa via UAZapi</p>
            </div>
          </div>
          <Link
            to="/admin/marketing/whatsapp/nova"
            className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
          >
            <Plus className="h-4 w-4" /> Nova campanha
          </Link>
        </div>

        <WaSubNav />

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">Nenhuma campanha ainda</p>
              <p className="text-sm text-muted-foreground mb-4">
                Crie sua primeira campanha WhatsApp para enviar mensagens em massa.
              </p>
              <Link
                to="/admin/marketing/whatsapp/nova"
                className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600"
              >
                <Plus className="h-4 w-4" /> Criar campanha
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Campanha</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden md:table-cell">Audiência</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground hidden sm:table-cell">Enviados</th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3">
                      <Link to={`/admin/marketing/whatsapp/${c.id}`} className="font-medium text-foreground hover:text-primary hover:underline block truncate max-w-xs">
                        {c.name}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate max-w-xs mt-0.5 line-clamp-1">
                        {c.message.slice(0, 60)}{c.message.length > 60 ? "…" : ""}
                      </p>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3.5 w-3.5" /> {c.total_recipients}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Send className="h-3.5 w-3.5" /> {c.total_sent}
                        {c.total_failed > 0 && <span className="text-red-500 ml-1">({c.total_failed} falhou)</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={c.status === "sending"}
                        className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    sending: "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    draft: "Rascunho", sending: "Enviando", completed: "Concluída",
    failed: "Falhou", cancelled: "Cancelada",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {labels[status] || status}
    </span>
  );
}
