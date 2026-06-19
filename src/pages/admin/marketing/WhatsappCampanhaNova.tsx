import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Users, RefreshCw, MessageSquare } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import usePageTitle from "@/hooks/usePageTitle";
import { useSaveWhatsappCampaign, getWhatsappAudienceCount } from "@/hooks/useWhatsappMarketing";
import { toast } from "sonner";

const STATUS_OPTS = ["novo", "em-andamento", "convertido", "perdido"];
const ORIGEM_OPTS = ["contato-negocio", "contato-galeria", "anunciar", "newsletter", "exit-intent", "whatsapp", "chatbot"];
const VARS = ["{{nome}}", "{{primeiro_nome}}", "{{telefone}}"];

export default function WhatsappCampanhaNova() {
  usePageTitle("Nova campanha WhatsApp | Admin");
  const navigate = useNavigate();
  const save = useSaveWhatsappCampaign();

  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [origens, setOrigens] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [audCount, setAudCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const buildFilters = () => ({
    statuses: statuses.length ? statuses : undefined,
    origens: origens.length ? origens : undefined,
    tags_any: tagsInput.trim() ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
  });

  const refreshCount = async () => {
    setLoadingCount(true);
    try {
      const n = await getWhatsappAudienceCount(buildFilters());
      setAudCount(n);
    } catch (e: any) {
      toast.error(e.message || "Erro contando audiência");
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => { refreshCount(); }, [statuses, origens, tagsInput]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const insertVar = (v: string) => setMessage((m) => m + v);

  const handleSave = async () => {
    if (!name.trim() || !message.trim()) {
      toast.error("Nome e mensagem são obrigatórios");
      return;
    }
    try {
      const created: any = await save.mutateAsync({
        name: name.trim(),
        message: message.trim(),
        audience_filters: buildFilters(),
        status: "draft",
      });
      toast.success("Campanha criada como rascunho");
      navigate(`/admin/marketing/whatsapp/${created.id}`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar");
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-5 pb-10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/admin/marketing/whatsapp" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-display text-xl font-bold">Nova campanha WhatsApp</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={save.isPending}
            className="flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Criar como rascunho
          </button>
        </div>

        {/* Dados básicos */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Conteúdo</h2>
          <div className="space-y-1">
            <label className="text-xs font-medium">Nome interno</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Promoção Junho 2026"
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Mensagem</label>
              <div className="flex gap-1 flex-wrap justify-end">
                {VARS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVar(v)}
                    className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-mono text-green-700 hover:bg-green-100"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={"Olá {{primeiro_nome}}! 👋\n\nTemos uma novidade exclusiva pra você. Acesse agora: https://negociaaky.com.br/busca"}
              rows={6}
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20 resize-y font-mono"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Clique nas variáveis acima para inserir na mensagem</span>
              <span>{message.length} caracteres</span>
            </div>
          </div>
        </section>

        {/* Preview */}
        {message && (
          <section className="rounded-2xl border border-green-200 bg-green-50/50 p-5">
            <h2 className="font-semibold text-sm text-green-800 mb-3 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Preview da mensagem
            </h2>
            <div className="bg-white rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed shadow-sm border border-green-100 max-w-sm">
              {message
                .replace(/\{\{primeiro_nome\}\}/g, "Sara")
                .replace(/\{\{nome\}\}/g, "Sara Machado")
                .replace(/\{\{telefone\}\}/g, "11953937618")}
            </div>
            <p className="text-[10px] text-green-700 mt-2">* Preview com dados fictícios</p>
          </section>
        )}

        {/* Audiência */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" /> Audiência
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">
                {loadingCount
                  ? <Loader2 className="h-4 w-4 animate-spin inline" />
                  : <>{audCount ?? "—"} leads com telefone</>}
              </span>
              <button
                onClick={refreshCount}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingCount ? "animate-spin" : ""}`} /> Recalcular
              </button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Apenas leads com telefone cadastrado são incluídos. Sem filtros = todos os leads.
          </p>

          <FilterChips label="Status do lead" options={STATUS_OPTS} selected={statuses}
            onToggle={(v) => setStatuses(toggle(statuses, v))} />
          <FilterChips label="Origem do lead" options={ORIGEM_OPTS} selected={origens}
            onToggle={(v) => setOrigens(toggle(origens, v))} />

          <div className="space-y-1">
            <label className="text-xs font-medium">Tags (separadas por vírgula)</label>
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="vip, newsletter"
              className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500/20"
            />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function FilterChips({
  label, options, selected, onToggle,
}: { label: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              onClick={() => onToggle(o)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active ? "bg-green-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
