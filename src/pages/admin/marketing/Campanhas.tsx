import { Link } from "react-router-dom";
import { Send, Plus, ArrowLeft, Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useEmailCampaigns } from "@/hooks/useEmailMarketing";

export default function Campanhas() {
  usePageTitle("Campanhas de Email | Admin");
  const { data: campaigns = [], isLoading } = useEmailCampaigns();

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/admin/marketing" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Send className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Campanhas de Email</h1>
              <p className="text-sm text-muted-foreground">Envios pontuais pra audiência segmentada</p>
            </div>
          </div>
          <Link
            to="/admin/marketing/campanhas/nova"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Nova campanha
          </Link>
        </div>

        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="px-5 py-12 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : campaigns.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <Send className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <h3 className="font-medium text-foreground mb-1">Nenhuma campanha ainda</h3>
              <p className="text-sm text-muted-foreground mb-5">Crie a primeira pra disparar email pra sua base de leads</p>
              <Link
                to="/admin/marketing/campanhas/nova"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Criar campanha
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  to={`/admin/marketing/campanhas/${c.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Criada em {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{c.total_sent || 0}</p>
                      <p className="text-[10px] text-muted-foreground">enviados</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    scheduled: "bg-blue-100 text-blue-700",
    sending: "bg-amber-100 text-amber-700",
    sent: "bg-green-100 text-green-700",
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    draft: "Rascunho",
    scheduled: "Agendada",
    sending: "Enviando",
    sent: "Enviada",
    completed: "Concluída",
    failed: "Falhou",
    cancelled: "Cancelada",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {labels[status] || status}
    </span>
  );
}
