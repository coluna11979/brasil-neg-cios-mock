import {
  X,
  Mail,
  Phone,
  Clock,
  Building2,
  Store,
  Megaphone,
  MessageCircle,
  MapPin,
  Calendar,
  User,
  ArrowRight,
  Flame,
  Thermometer,
  Snowflake,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/stores/leadStore";

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; gradient: string }
> = {
  novo: {
    label: "Novo",
    color: "text-blue-700",
    bg: "bg-blue-100",
    gradient: "from-blue-500 to-blue-600",
  },
  "em-andamento": {
    label: "Em Andamento",
    color: "text-amber-700",
    bg: "bg-amber-100",
    gradient: "from-amber-500 to-amber-600",
  },
  convertido: {
    label: "Convertido",
    color: "text-green-700",
    bg: "bg-green-100",
    gradient: "from-green-500 to-green-600",
  },
  perdido: {
    label: "Perdido",
    color: "text-red-700",
    bg: "bg-red-100",
    gradient: "from-red-400 to-red-500",
  },
};

const origemConfig: Record<string, { label: string; icon: typeof Building2 }> = {
  "contato-negocio": { label: "Interesse em Negócio", icon: Building2 },
  "contato-galeria": { label: "Interesse em Galeria", icon: Store },
  anunciar: { label: "Quer Anunciar", icon: Megaphone },
  newsletter: { label: "Newsletter", icon: Mail },
  "exit-intent": { label: "Exit Intent", icon: MessageCircle },
  whatsapp: { label: "Chatbot", icon: MessageCircle },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTemperature(dateStr: string) {
  const hours = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60);
  if (hours < 24) return { level: "hot", label: "Quente", icon: Flame, color: "text-red-500" };
  if (hours < 72) return { level: "warm", label: "Morno", icon: Thermometer, color: "text-amber-500" };
  return { level: "cold", label: "Frio", icon: Snowflake, color: "text-slate-400" };
}

function getDaysInPipeline(dateStr: string): string {
  const days = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return "Hoje";
  if (days === 1) return "1 dia";
  if (days < 30) return `${days} dias`;
  const months = Math.floor(days / 30);
  return `${months} ${months === 1 ? "mês" : "meses"}`;
}

interface Props {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (status: Lead["status"]) => Promise<void>;
}

const LeadDetailModal = ({ lead, onClose, onStatusChange }: Props) => {
  const status = statusConfig[lead.status] || statusConfig.novo;
  const origem = origemConfig[lead.origem] || { label: lead.origem, icon: MessageCircle };
  const OrigemIcon = origem.icon;
  const temp = getTemperature(lead.criado_em);
  const TempIcon = temp.icon;
  const initials = lead.nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl animate-fade-in">
        {/* Header with gradient */}
        <div className={`relative bg-gradient-to-r ${status.gradient} px-6 py-8`}>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm font-display text-xl font-bold text-white border-2 border-white/30">
              {initials}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-display text-2xl font-bold text-white truncate">
                {lead.nome}
              </h2>
              <div className="mt-1 flex items-center gap-3">
                <span className="rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold text-white">
                  {status.label}
                </span>
                <div className="flex items-center gap-1 text-white/80 text-sm">
                  <TempIcon className="h-4 w-4" />
                  <span>{temp.label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline visual */}
        <div className="px-6 py-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Status do Pipeline
          </p>
          <div className="flex items-center gap-2">
            {(["novo", "em-andamento", "convertido", "perdido"] as const).map(
              (s, i) => {
                const cfg = statusConfig[s];
                const isCurrent = lead.status === s;
                const statuses: Lead["status"][] = ["novo", "em-andamento", "convertido", "perdido"];
                const currentIdx = statuses.indexOf(lead.status);
                const isPast = i < currentIdx && lead.status !== "perdido";

                return (
                  <div key={s} className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => onStatusChange(s)}
                      className={`flex-1 rounded-lg py-2 px-3 text-xs font-semibold text-center transition-all ${
                        isCurrent
                          ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1 ring-current shadow-sm`
                          : isPast
                          ? "bg-green-50 text-green-600"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {cfg.label}
                    </button>
                    {i < 3 && (
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                    )}
                  </div>
                );
              }
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6">
          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Tempo no Pipeline</p>
              <p className="mt-1 font-display text-lg font-bold text-foreground">
                {getDaysInPipeline(lead.criado_em)}
              </p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Temperatura</p>
              <div className={`mt-1 flex items-center justify-center gap-1 font-display text-lg font-bold ${temp.color}`}>
                <TempIcon className="h-5 w-5" />
                {temp.label}
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">Origem</p>
              <div className="mt-1 flex items-center justify-center gap-1 text-sm font-semibold text-foreground">
                <OrigemIcon className="h-4 w-4 text-primary" />
                <span className="truncate">{origem.label}</span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Informações de Contato
            </h3>
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="text-sm font-medium text-foreground">{lead.nome}</p>
                </div>
              </div>

              {lead.email && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {lead.email}
                    </a>
                  </div>
                </div>
              )}

              {lead.telefone && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <a
                      href={`tel:${lead.telefone}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {lead.telefone}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Capturado em</p>
                  <p className="text-sm font-medium text-foreground">
                    {formatDate(lead.criado_em)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Interest / Context */}
          {(lead.negocio_titulo || lead.galeria_nome || lead.mensagem) && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Contexto do Lead
              </h3>
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                {(lead.negocio_titulo || lead.galeria_nome) && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 shrink-0">
                      {lead.negocio_titulo ? (
                        <Building2 className="h-4 w-4 text-accent" />
                      ) : (
                        <Store className="h-4 w-4 text-accent" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {lead.negocio_titulo ? "Negócio de Interesse" : "Galeria de Interesse"}
                      </p>
                      <p className="text-sm font-medium text-foreground">
                        {lead.negocio_titulo || lead.galeria_nome}
                        {lead.espaco_numero && (
                          <span className="text-muted-foreground"> — {lead.espaco_numero}</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {lead.mensagem && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Mensagem</p>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-foreground leading-relaxed italic">
                        "{lead.mensagem}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-border px-6 py-4 flex items-center gap-3">
          {lead.email && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={`mailto:${lead.email}`}>
                <Mail className="h-4 w-4" />
                Enviar E-mail
              </a>
            </Button>
          )}
          {lead.telefone && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={`https://wa.me/55${lead.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Phone className="h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeadDetailModal;
